package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/chaitanya21kumar/workpulse/backend/internal/handlers"
	"github.com/chaitanya21kumar/workpulse/backend/internal/middleware"
	"github.com/chaitanya21kumar/workpulse/backend/internal/repository"
	"github.com/chaitanya21kumar/workpulse/backend/internal/scraper"
	"github.com/chaitanya21kumar/workpulse/backend/internal/services"
	"github.com/chaitanya21kumar/workpulse/backend/pkg/config"
	pkgfirebase "github.com/chaitanya21kumar/workpulse/backend/pkg/firebase"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func main() {
	// Initialize structured logging
	logger, err := zap.NewProduction()
	if err != nil {
		panic("failed to initialize logger: " + err.Error())
	}
	defer logger.Sync() //nolint:errcheck

	// Load configuration
	cfg := config.Load(logger)
	gin.SetMode(cfg.GinMode)

	logger.Info("WorkPulse starting up",
		zap.String("port", cfg.Port),
		zap.String("gin_mode", cfg.GinMode),
		zap.String("firebase_project", cfg.FirebaseProjectID),
	)

	// Initialize Firebase Admin SDK
	firebaseApp, err := pkgfirebase.InitApp(cfg.FirebaseProjectID)
	if err != nil {
		logger.Fatal("Failed to initialize Firebase", zap.Error(err))
	}

	// Initialize Firestore client
	firestoreClient, err := pkgfirebase.InitFirestore(firebaseApp)
	if err != nil {
		logger.Fatal("Failed to initialize Firestore", zap.Error(err))
	}
	defer firestoreClient.Close() //nolint:errcheck

	// Initialize repositories
	devRepo := repository.NewFirestoreDeveloperRepository(firestoreClient)
	metricsRepo := repository.NewFirestoreMetricsRepository(firestoreClient)
	reportRepo := repository.NewFirestoreReportRepository(firestoreClient)
	scrapeJobRepo := repository.NewFirestoreScrapeJobRepository(firestoreClient)

	// Initialize GitHub scraper
	ghScraper := scraper.NewGitHubScraper(cfg.GitHubToken, logger)

	// Initialize services (scrape service before developer service)
	scrapeSvc := services.NewScrapeService(ghScraper, metricsRepo, devRepo, cfg.MLServiceURL, logger)
	devSvc := services.NewDeveloperService(devRepo, scrapeJobRepo, ghScraper, scrapeSvc, cfg.GroqAPIKey, logger)
	reportSvc := services.NewReportService(reportRepo, devRepo, metricsRepo, cfg.MLServiceURL, logger)

	// Initialize HTTP handlers
	devHandler := handlers.NewDeveloperHandler(devSvc, logger)
	metricsHandler := handlers.NewMetricsHandler(devSvc, logger)
	reportHandler := handlers.NewReportHandler(reportSvc, logger)
	healthHandler := handlers.NewHealthHandler(firestoreClient)

	// Configure gin router
	r := gin.New()
	r.Use(middleware.Recovery(logger))
	r.Use(middleware.CORS(cfg.AllowedOrigins))
	r.Use(middleware.RequestLogger(logger))
	r.Use(middleware.RateLimit(100))

	// Health endpoints — no auth required
	r.GET("/health", healthHandler.Health)
	r.GET("/ready", healthHandler.Ready)

	// API v1 routes — require Firebase JWT auth in production
	v1 := r.Group("/api/v1")
	if cfg.Environment != "development" {
		v1.Use(middleware.FirebaseAuth(firebaseApp))
	}
	{
		// Developers
		devs := v1.Group("/developers")
		devs.POST("", devHandler.RegisterDeveloper)
		devs.GET("", devHandler.ListDevelopers)
		devs.GET("/:username", devHandler.GetDeveloper)
		devs.DELETE("/:username", devHandler.DeleteDeveloper)
		devs.POST("/:username/scrape", devHandler.TriggerScrape)
		devs.POST("/:username/insights", devHandler.GenerateInsights)

		// Metrics
		metrics := v1.Group("/metrics")
		metrics.GET("/leaderboard", metricsHandler.GetLeaderboard)
		metrics.GET("/:username", metricsHandler.GetMetrics)

		// Reports
		reports := v1.Group("/reports")
		reports.POST("/generate", reportHandler.GenerateReport)
		reports.GET("", reportHandler.ListReports)
		reports.GET("/:developerID", reportHandler.GetReport)
	}

	// HTTP server with timeouts
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		logger.Info("Server listening", zap.String("addr", srv.Addr))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Server error", zap.Error(err))
		}
	}()

	// Graceful shutdown on SIGINT / SIGTERM
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit
	logger.Info("Shutdown signal received", zap.String("signal", sig.String()))

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Forced shutdown", zap.Error(err))
	}
	logger.Info("Server exited cleanly")
}
