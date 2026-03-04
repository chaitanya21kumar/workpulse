"""WorkPulse ML Service — FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routers import scoring, insights

load_dotenv()

app = FastAPI(
    title="WorkPulse ML Service",
    description="AI-powered developer performance scoring and insights using scikit-learn and LangChain + Groq",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scoring.router, tags=["Scoring"])
app.include_router(insights.router, tags=["Insights"])


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "workpulse-ml", "version": "1.0.0"}
