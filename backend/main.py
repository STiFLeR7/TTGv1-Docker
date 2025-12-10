from fastapi import FastAPI
from backend.api.routes import router as api_router
from backend.api.resources import router as resources_router
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI(title="TTG - Time Table Generator")
app.include_router(api_router, prefix="/api")
app.include_router(resources_router, prefix="/api")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",  # Vite default
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": __import__("datetime").datetime.utcnow().isoformat()}