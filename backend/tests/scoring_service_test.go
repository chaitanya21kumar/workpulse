package tests

import (
	"context"
	"testing"

	"github.com/chaitanya21kumar/workpulse/backend/internal/models"
	"github.com/chaitanya21kumar/workpulse/backend/internal/services"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

// TestRegisterDeveloper_UsernameValidation verifies boundary-condition behaviour
// when registering developers with table-driven inputs.
func TestRegisterDeveloper_UsernameValidation(t *testing.T) {
	cases := []struct {
		name        string
		username    string
		setupMocks  func(*mockDeveloperRepo, *mockGitHubScraper, *mockScrapeService)
		wantErr     bool
		errContains string
	}{
		{
			name:     "valid username registers successfully",
			username: "octocat",
			setupMocks: func(dr *mockDeveloperRepo, gs *mockGitHubScraper, ss *mockScrapeService) {
				dr.On("GetByGitHubUsername", mock.Anything, "octocat").Return(nil, nil)
				gs.On("FetchUserProfile", mock.Anything, "octocat").Return(
					map[string]interface{}{"name": "The Octocat", "email": "", "avatar_url": ""}, nil)
				dr.On("Create", mock.Anything, mock.AnythingOfType("*models.Developer")).Return(nil)
				gs.On("FetchUserRepos", mock.Anything, "octocat").Return([]string{}, nil)
				ss.On("ScrapeGitHubData", mock.Anything, "octocat", mock.Anything).Return(nil)
			},
			wantErr: false,
		},
		{
			name:     "duplicate username returns existing without error",
			username: "duplicate-user",
			setupMocks: func(dr *mockDeveloperRepo, gs *mockGitHubScraper, ss *mockScrapeService) {
				existing := &models.Developer{
					ID:             "existing-123",
					GitHubUsername: "duplicate-user",
					Name:           "Duplicate User",
				}
				dr.On("GetByGitHubUsername", mock.Anything, "duplicate-user").Return(existing, nil)
			},
			wantErr: false,
		},
		{
			name:     "repo lookup failure propagates error",
			username: "fail-user",
			setupMocks: func(dr *mockDeveloperRepo, gs *mockGitHubScraper, ss *mockScrapeService) {
				dr.On("GetByGitHubUsername", mock.Anything, "fail-user").
					Return(nil, assert.AnError)
			},
			wantErr:     true,
			errContains: "failed to check existing developer",
		},
		{
			name:     "repo create failure returns error",
			username: "create-fail",
			setupMocks: func(dr *mockDeveloperRepo, gs *mockGitHubScraper, ss *mockScrapeService) {
				dr.On("GetByGitHubUsername", mock.Anything, "create-fail").Return(nil, nil)
				gs.On("FetchUserProfile", mock.Anything, "create-fail").Return(
					map[string]interface{}{"name": "Create Fail", "email": "", "avatar_url": ""}, nil)
				dr.On("Create", mock.Anything, mock.AnythingOfType("*models.Developer")).
					Return(assert.AnError)
			},
			wantErr:     true,
			errContains: "failed to create developer",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			devRepo := &mockDeveloperRepo{}
			scrapeRepo := &mockScrapeJobRepo{}
			ghScraper := &mockGitHubScraper{}
			scrapeSvc := &mockScrapeService{}
			logger := zap.NewNop()

			svc := services.NewDeveloperService(devRepo, scrapeRepo, ghScraper, scrapeSvc, logger)
			tc.setupMocks(devRepo, ghScraper, scrapeSvc)

			dev, err := svc.RegisterDeveloper(context.Background(), tc.username)

			if tc.wantErr {
				assert.Error(t, err)
				if tc.errContains != "" {
					assert.Contains(t, err.Error(), tc.errContains)
				}
				assert.Nil(t, dev)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, dev)
				assert.Equal(t, tc.username, dev.GitHubUsername)
			}

			devRepo.AssertExpectations(t)
		})
	}
}

// TestListDevelopers_TableDriven verifies list behaviour with various limits.
func TestListDevelopers_TableDriven(t *testing.T) {
	cases := []struct {
		name      string
		limit     int
		returnDevs []*models.Developer
		wantCount int
		wantErr   bool
	}{
		{
			name:  "returns empty list when no developers",
			limit: 10,
			returnDevs: []*models.Developer{},
			wantCount:  0,
		},
		{
			name:  "returns correct count with multiple developers",
			limit: 20,
			returnDevs: []*models.Developer{
				{ID: "1", GitHubUsername: "dev1", ContributionScore: 80.0},
				{ID: "2", GitHubUsername: "dev2", ContributionScore: 70.0},
				{ID: "3", GitHubUsername: "dev3", ContributionScore: 60.0},
			},
			wantCount: 3,
		},
		{
			name:  "respects limit parameter",
			limit: 1,
			returnDevs: []*models.Developer{
				{ID: "1", GitHubUsername: "dev1"},
			},
			wantCount: 1,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			devRepo := &mockDeveloperRepo{}
			scrapeRepo := &mockScrapeJobRepo{}
			ghScraper := &mockGitHubScraper{}
			scrapeSvc := &mockScrapeService{}
			logger := zap.NewNop()

			svc := services.NewDeveloperService(devRepo, scrapeRepo, ghScraper, scrapeSvc, logger)
			devRepo.On("List", mock.Anything, tc.limit).Return(tc.returnDevs, nil)

			devs, err := svc.ListDevelopers(context.Background(), tc.limit)
			assert.NoError(t, err)
			assert.Len(t, devs, tc.wantCount)
			devRepo.AssertExpectations(t)
		})
	}
}

// TestDeleteDeveloper_TableDriven verifies delete behaviour across edge cases.
func TestDeleteDeveloper_TableDriven(t *testing.T) {
	cases := []struct {
		name       string
		username   string
		mockDev    *models.Developer
		lookupErr  error
		deleteErr  error
		wantErr    bool
	}{
		{
			name:     "delete existing developer succeeds",
			username: "existing",
			mockDev:  &models.Developer{ID: "abc", GitHubUsername: "existing"},
		},
		{
			name:     "delete non-existent developer fails",
			username: "ghost",
			mockDev:  nil,
			wantErr:  true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			devRepo := &mockDeveloperRepo{}
			scrapeRepo := &mockScrapeJobRepo{}
			ghScraper := &mockGitHubScraper{}
			scrapeSvc := &mockScrapeService{}
			logger := zap.NewNop()

			svc := services.NewDeveloperService(devRepo, scrapeRepo, ghScraper, scrapeSvc, logger)
			devRepo.On("GetByGitHubUsername", mock.Anything, tc.username).Return(tc.mockDev, tc.lookupErr)
			if tc.mockDev != nil {
				devRepo.On("Delete", mock.Anything, tc.mockDev.ID).Return(tc.deleteErr)
			}

			err := svc.DeleteDeveloper(context.Background(), tc.username)
			if tc.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
			devRepo.AssertExpectations(t)
		})
	}
}
