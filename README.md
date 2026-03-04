# WorkPulse — AI-Powered Developer Performance Analytics

> Evaluate developer contributions using GitHub data, ML scoring, and Groq (llama3-70b-8192) AI insights.

## Architecture

```
GitHub API
│
▼
Go + Gin Backend ──────────────────────► Firestore (developer data)
(Cloud Run :8080)                        BigQuery  (analytics)
│
▼
Python FastAPI ML Service
(Cloud Run :8001)
LangChain + Groq llama3-70b-8192
│
▼
Next.js 14 Frontend
(Cloud Run :3000)
Firebase Auth (Google OAuth)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go 1.22, Gin |
| ML Service | Python 3.11, FastAPI, LangChain, Groq |
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Recharts |
| Database | Firestore, BigQuery |
| Auth | Firebase (Google OAuth) |
| Infrastructure | GCP Cloud Run |
| CI/CD | GitHub Actions |

## Prerequisites

- Go 1.22+
- Python 3.11+
- Node 18+
- Docker + Docker Compose
- GCP account with Firestore + BigQuery enabled
- Groq API key (free at console.groq.com)

## Quick Start (Docker)

\`\`\`bash
cp .env.example .env   # fill in your values
make dev               # docker-compose up
\`\`\`

## Environment Variables

| Variable | Description |
|----------|-------------|
| GROQ_API_KEY | Groq API key |
| FIREBASE_PROJECT_ID | GCP project ID |
| GITHUB_TOKEN | GitHub personal access token |
| BIGQUERY_DATASET | BigQuery dataset name |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/developers | List all developers |
| POST | /api/v1/developers | Add developer |
| GET | /api/v1/developers/:id | Get developer profile |
| POST | /api/v1/scrape/:username | Trigger GitHub data fetch |
| POST | /api/v1/score/:id | Calculate developer score |
| POST | /api/v1/insights/:id | Generate AI insights |
| GET | /api/v1/reports | List reports |
| POST | /api/v1/reports | Generate report |

## Deployment URLs

- Backend: YOUR_CLOUD_RUN_BACKEND_URL
- ML Service: YOUR_CLOUD_RUN_ML_URL
- Frontend: YOUR_CLOUD_RUN_FRONTEND_URL

## Screenshots

_Coming soon_
