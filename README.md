# WorkPulse — AI-Powered Developer Performance Analytics Platform

> Evaluate developer contributions using GitHub data, ML scoring, and Groq (llama3-70b-8192) AI insights.

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│   Next.js 14    │────▶│    Go + gin API       │────▶│  Python FastAPI     │
│   Frontend      │     │    (Cloud Run)        │     │  ML Service         │
│   (Cloud Run)   │     └──────────┬───────────┘     │  (Cloud Run)        │
└─────────────────┘                │                  └─────────────────────┘
                          ┌────────┴────────┐
                          │                 │
                   ┌──────▼──────┐   ┌──────▼──────┐
                   │  Firestore  │   │  BigQuery   │
                   └─────────────┘   └─────────────┘
                          │
                   ┌──────▼──────┐
                   │  GitHub API │
                   └─────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (TypeScript) + Tailwind CSS + Recharts |
| Backend API | Go 1.22 + gin framework |
| ML Service | Python 3.11 + FastAPI + LangChain + scikit-learn |
| Database | Firebase Firestore + BigQuery |
| Auth | Firebase Auth (Google OAuth) |
| AI/LLM | LangChain + Groq llama3-70b-8192 |
| Infrastructure | GCP Cloud Run + Docker |
| CI/CD | GitHub Actions |

## Features

- **GitHub Scraping**: Automatically fetch commits, PRs, code reviews, issues from GitHub API
- **ML Scoring**: scikit-learn-based weighted scoring model (0-100) with tier classification
- **AI Insights**: LangChain + Groq (llama3-70b-8192) generates personalized performance insights
- **Leaderboard**: Real-time ranking of developers by contribution score
- **BigQuery Analytics**: Historical trend analysis and top contributor queries
- **Firebase Auth**: Google OAuth with JWT verification
- **Developer Profiles**: Detailed radar charts, metric cards, and AI insight panels

## Prerequisites

- Docker + Docker Compose
- GitHub Personal Access Token
- Firebase project (with Firestore and Auth enabled)
- Groq API key (free at console.groq.com)
- GCP project (for BigQuery and Cloud Run)

## Local Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/chaitanya21kumar/workpulse
   cd workpulse
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Start all services**
   ```bash
   make dev
   # or
   docker-compose up --build
   ```

4. **Access the app**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080
   - ML Service: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## API Endpoints

### Developers
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/developers` | Register developer by GitHub username |
| GET | `/api/v1/developers` | List all developers |
| GET | `/api/v1/developers/:username` | Get developer profile |
| DELETE | `/api/v1/developers/:username` | Remove developer |
| POST | `/api/v1/developers/:username/scrape` | Trigger manual rescrape |

### Metrics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/metrics/:username` | Get metrics for period |
| GET | `/api/v1/metrics/leaderboard` | Get ranked leaderboard |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/reports/generate` | Generate AI report |
| GET | `/api/v1/reports/:developerID` | Get latest report |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/ready` | Readiness check |

## Deployment

```bash
# Deploy all services to GCP Cloud Run
make deploy

# Or deploy individually
make deploy-backend
make deploy-ml
make deploy-frontend
```

## Cloud Run URLs

- **Frontend**: https://workpulse-frontend-xxxx-uc.a.run.app
- **Backend API**: https://workpulse-backend-xxxx-uc.a.run.app
- **ML Service**: https://workpulse-ml-xxxx-uc.a.run.app

## License

MIT License — see [LICENSE](LICENSE) for details.
