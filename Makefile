.PHONY: dev test build deploy
dev:
	docker-compose up
test:
	cd backend && go test ./... -race
	cd ml-service && pytest tests/ --cov=app
build:
	docker-compose build
deploy:
	gcloud run deploy workpulse-backend --source ./backend --region asia-south1
	gcloud run deploy workpulse-ml --source ./ml-service --region asia-south1
	gcloud run deploy workpulse-frontend --source ./frontend --region asia-south1
