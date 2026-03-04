package tests

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/chaitanya21kumar/workpulse/backend/internal/models"
	"github.com/chaitanya21kumar/workpulse/backend/internal/scraper"
	"github.com/chaitanya21kumar/workpulse/backend/internal/services"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

// --- Mock implementations ---

type mockDeveloperRepo struct{ mock.Mock }

func (m *mockDeveloperRepo) Create(ctx context.Context, dev *models.Developer) error {
	args := m.Called(ctx, dev)
	return args.Error(0)
}
func (m *mockDeveloperRepo) GetByID(ctx context.Context, id string) (*models.Developer, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Developer), args.Error(1)
}
func (m *mockDeveloperRepo) GetByGitHubUsername(ctx context.Context, username string) (*models.Developer, error) {
	args := m.Called(ctx, username)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Developer), args.Error(1)
}
func (m *mockDeveloperRepo) List(ctx context.Context, limit int) ([]*models.Developer, error) {
	args := m.Called(ctx, limit)
	return args.Get(0).([]*models.Developer), args.Error(1)
}
func (m *mockDeveloperRepo) Update(ctx context.Context, dev *models.Developer) error {
	args := m.Called(ctx, dev)
	return args.Error(0)
}
func (m *mockDeveloperRepo) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

type mockScrapeJobRepo struct{ mock.Mock }

func (m *mockScrapeJobRepo) Create(ctx context.Context, job *models.ScrapeJob) error {
	args := m.Called(ctx, job)
	return args.Error(0)
}
func (m *mockScrapeJobRepo) GetByID(ctx context.Context, id string) (*models.ScrapeJob, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.ScrapeJob), args.Error(1)
}
func (m *mockScrapeJobRepo) UpdateStatus(ctx context.Context, id, status, errMsg string) error {
	args := m.Called(ctx, id, status, errMsg)
	return args.Error(0)
}
func (m *mockScrapeJobRepo) ListByUsername(ctx context.Context, username string) ([]*models.ScrapeJob, error) {
	args := m.Called(ctx, username)
	return args.Get(0).([]*models.ScrapeJob), args.Error(1)
}

type mockGitHubScraper struct{ mock.Mock }

func (m *mockGitHubScraper) FetchUserCommits(ctx context.Context, username, repo string, since time.Time) (int, error) {
	args := m.Called(ctx, username, repo, since)
	return args.Int(0), args.Error(1)
}
func (m *mockGitHubScraper) FetchPullRequests(ctx context.Context, username, repo string) (*scraper.PRStats, error) {
	args := m.Called(ctx, username, repo)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*scraper.PRStats), args.Error(1)
}
func (m *mockGitHubScraper) FetchCodeReviews(ctx context.Context, username, repo string) (int, error) {
	args := m.Called(ctx, username, repo)
	return args.Int(0), args.Error(1)
}
func (m *mockGitHubScraper) FetchIssues(ctx context.Context, username, repo string) (int, error) {
	args := m.Called(ctx, username, repo)
	return args.Int(0), args.Error(1)
}
func (m *mockGitHubScraper) FetchUserRepos(ctx context.Context, username string) ([]string, error) {
	args := m.Called(ctx, username)
	return args.Get(0).([]string), args.Error(1)
}
func (m *mockGitHubScraper) FetchUserProfile(ctx context.Context, username string) (map[string]interface{}, error) {
	args := m.Called(ctx, username)
	return args.Get(0).(map[string]interface{}), args.Error(1)
}

type mockScrapeService struct{ mock.Mock }

func (m *mockScrapeService) ScrapeGitHubData(ctx context.Context, username string, repos []string) error {
	args := m.Called(ctx, username, repos)
	return args.Error(0)
}

// --- Tests ---

func TestRegisterDeveloper_NewUser(t *testing.T) {
	devRepo := &mockDeveloperRepo{}
	scrapeRepo := &mockScrapeJobRepo{}
	ghScraper := &mockGitHubScraper{}
	scrapeSvc := &mockScrapeService{}
	logger := zap.NewNop()

	svc := services.NewDeveloperService(devRepo, scrapeRepo, ghScraper, scrapeSvc, logger)

	devRepo.On("GetByGitHubUsername", mock.Anything, "torvalds").Return(nil, nil)
	ghScraper.On("FetchUserProfile", mock.Anything, "torvalds").Return(
		map[string]interface{}{
			"name":       "Linus Torvalds",
			"email":      "torvalds@linux.org",
			"avatar_url": "https://avatars.githubusercontent.com/u/1024025",
		}, nil)
	devRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Developer")).Return(nil)
	ghScraper.On("FetchUserRepos", mock.Anything, "torvalds").Return([]string{"linux"}, nil)
	scrapeSvc.On("ScrapeGitHubData", mock.Anything, "torvalds", []string{"linux"}).Return(nil)

	dev, err := svc.RegisterDeveloper(context.Background(), "torvalds")

	assert.NoError(t, err)
	assert.NotNil(t, dev)
	assert.Equal(t, "torvalds", dev.GitHubUsername)
	assert.Equal(t, "Linus Torvalds", dev.Name)
	devRepo.AssertExpectations(t)
}

func TestRegisterDeveloper_AlreadyExists(t *testing.T) {
	devRepo := &mockDeveloperRepo{}
	scrapeRepo := &mockScrapeJobRepo{}
	ghScraper := &mockGitHubScraper{}
	scrapeSvc := &mockScrapeService{}
	logger := zap.NewNop()

	existing := &models.Developer{
		ID:             "existing-id",
		GitHubUsername: "torvalds",
		Name:           "Linus Torvalds",
	}

	svc := services.NewDeveloperService(devRepo, scrapeRepo, ghScraper, scrapeSvc, logger)
	devRepo.On("GetByGitHubUsername", mock.Anything, "torvalds").Return(existing, nil)

	dev, err := svc.RegisterDeveloper(context.Background(), "torvalds")

	assert.NoError(t, err)
	assert.Equal(t, "existing-id", dev.ID)
	// Should not call Create again
	devRepo.AssertNotCalled(t, "Create")
}

func TestGetDeveloper_NotFound(t *testing.T) {
	devRepo := &mockDeveloperRepo{}
	scrapeRepo := &mockScrapeJobRepo{}
	ghScraper := &mockGitHubScraper{}
	scrapeSvc := &mockScrapeService{}
	logger := zap.NewNop()

	svc := services.NewDeveloperService(devRepo, scrapeRepo, ghScraper, scrapeSvc, logger)
	devRepo.On("GetByGitHubUsername", mock.Anything, "nonexistent").Return(nil, nil)

	dev, err := svc.GetDeveloper(context.Background(), "nonexistent")

	assert.Error(t, err)
	assert.Nil(t, dev)
	assert.Contains(t, err.Error(), "developer not found")
}

func TestDeleteDeveloper_Success(t *testing.T) {
	devRepo := &mockDeveloperRepo{}
	scrapeRepo := &mockScrapeJobRepo{}
	ghScraper := &mockGitHubScraper{}
	scrapeSvc := &mockScrapeService{}
	logger := zap.NewNop()

	svc := services.NewDeveloperService(devRepo, scrapeRepo, ghScraper, scrapeSvc, logger)

	existingDev := &models.Developer{ID: "dev-123", GitHubUsername: "torvalds"}
	devRepo.On("GetByGitHubUsername", mock.Anything, "torvalds").Return(existingDev, nil)
	devRepo.On("Delete", mock.Anything, "dev-123").Return(nil)

	err := svc.DeleteDeveloper(context.Background(), "torvalds")
	assert.NoError(t, err)
	devRepo.AssertExpectations(t)
}

func TestListDevelopers_Success(t *testing.T) {
	devRepo := &mockDeveloperRepo{}
	scrapeRepo := &mockScrapeJobRepo{}
	ghScraper := &mockGitHubScraper{}
	scrapeSvc := &mockScrapeService{}
	logger := zap.NewNop()

	svc := services.NewDeveloperService(devRepo, scrapeRepo, ghScraper, scrapeSvc, logger)

	developers := []*models.Developer{
		{ID: "1", GitHubUsername: "torvalds", ContributionScore: 95.0},
		{ID: "2", GitHubUsername: "gvanrossum", ContributionScore: 92.0},
	}
	devRepo.On("List", mock.Anything, 20).Return(developers, nil)

	devs, err := svc.ListDevelopers(context.Background(), 20)
	assert.NoError(t, err)
	assert.Len(t, devs, 2)
}

func TestRegisterDeveloper_RepoError(t *testing.T) {
	devRepo := &mockDeveloperRepo{}
	scrapeRepo := &mockScrapeJobRepo{}
	ghScraper := &mockGitHubScraper{}
	scrapeSvc := &mockScrapeService{}
	logger := zap.NewNop()

	svc := services.NewDeveloperService(devRepo, scrapeRepo, ghScraper, scrapeSvc, logger)

	devRepo.On("GetByGitHubUsername", mock.Anything, "testuser").Return(nil, errors.New("firestore error"))

	dev, err := svc.RegisterDeveloper(context.Background(), "testuser")
	assert.Error(t, err)
	assert.Nil(t, dev)
}
