package firebase

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	firebase "firebase.google.com/go/v4"
	"cloud.google.com/go/firestore"
	"google.golang.org/api/option"
)

// ServiceAccountConfig holds the Firebase service account credentials
type ServiceAccountConfig struct {
	Type         string `json:"type"`
	ProjectID    string `json:"project_id"`
	PrivateKeyID string `json:"private_key_id"`
	PrivateKey   string `json:"private_key"`
	ClientEmail  string `json:"client_email"`
	ClientID     string `json:"client_id"`
	AuthURI      string `json:"auth_uri"`
	TokenURI     string `json:"token_uri"`
}

// InitApp initializes the Firebase Admin SDK from env vars or ADC
func InitApp(projectID string) (*firebase.App, error) {
	ctx := context.Background()

	// Strategy 1: full JSON blob in env var
	if saJSON := os.Getenv("FIREBASE_SERVICE_ACCOUNT_JSON"); saJSON != "" {
		opt := option.WithCredentialsJSON([]byte(saJSON))
		app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: projectID}, opt)
		if err != nil {
			return nil, fmt.Errorf("failed to init firebase from JSON: %w", err)
		}
		return app, nil
	}

	// Strategy 2: individual env vars
	privateKey := os.Getenv("FIREBASE_PRIVATE_KEY")
	clientEmail := os.Getenv("FIREBASE_CLIENT_EMAIL")
	if privateKey != "" && clientEmail != "" {
		saConfig := &ServiceAccountConfig{
			Type:         "service_account",
			ProjectID:    projectID,
			PrivateKeyID: os.Getenv("FIREBASE_PRIVATE_KEY_ID"),
			PrivateKey:   privateKey,
			ClientEmail:  clientEmail,
			ClientID:     os.Getenv("FIREBASE_CLIENT_ID"),
			AuthURI:      "https://accounts.google.com/o/oauth2/auth",
			TokenURI:     "https://oauth2.googleapis.com/token",
		}
		saJSON, err := json.Marshal(saConfig)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal service account config: %w", err)
		}
		opt := option.WithCredentialsJSON(saJSON)
		app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: projectID}, opt)
		if err != nil {
			return nil, fmt.Errorf("failed to init firebase from env vars: %w", err)
		}
		return app, nil
	}

	// Strategy 3: Application Default Credentials (works on GCP Cloud Run)
	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: projectID})
	if err != nil {
		return nil, fmt.Errorf("failed to init firebase with ADC: %w", err)
	}
	return app, nil
}

// InitFirestore creates a Firestore client from a Firebase app
func InitFirestore(app *firebase.App) (*firestore.Client, error) {
	ctx := context.Background()
	client, err := app.Firestore(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to init Firestore: %w", err)
	}
	return client, nil
}
