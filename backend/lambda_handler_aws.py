from mangum import Mangum
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="YouTube A/B Testing Tool API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "YouTube A/B Testing Tool API",
        "version": "1.0.0",
        "status": "running",
        "environment": {
            "google_client_id_set": bool(os.getenv("GOOGLE_CLIENT_ID")),
            "google_client_secret_set": bool(os.getenv("GOOGLE_CLIENT_SECRET"))
        }
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

# Create the Mangum handler
handler = Mangum(app)
