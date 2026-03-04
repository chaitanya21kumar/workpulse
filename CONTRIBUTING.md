# Contributing to WorkPulse

Thank you for your interest in contributing to WorkPulse!

## Local Dev Setup

### Prerequisites
- Go 1.22+
- Python 3.11+
- Node 18+
- Docker + Docker Compose

### Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/chaitanya21kumar/workpulse.git
cd workpulse

# 2. Copy env template
cp .env.example .env
# Edit .env with your credentials

# 3. Start everything
make dev
```

Services run at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- ML Service: http://localhost:8001/docs

### Individual Service Setup

**Backend (Go)**
```bash
cd backend
go mod download
go run ./cmd/server/main.go
```

**ML Service (Python)**
```bash
cd ml-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

**Frontend (Next.js)**
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

## Running Tests

```bash
# Backend
cd backend && go test ./... -race

# ML Service
cd ml-service && source venv/bin/activate && pytest tests/ -v

# Frontend
cd frontend && npm run lint && npm run build
```

## Pull Request Guidelines

1. Fork the repo and create a feature branch (`git checkout -b feat/my-feature`)
2. Make your changes with clear, focused commits
3. Ensure all tests pass and the build succeeds
4. Open a PR against `main` with a clear description of the change
5. One approval required before merge

## Commit Message Format

```
type(scope): short description

Types: feat, fix, docs, chore, test, refactor
Scopes: backend, ml, frontend, ci
```
