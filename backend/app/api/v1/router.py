from fastapi import APIRouter
from app.api.v1.endpoints import auth, health, interviews

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router, prefix="/v1/auth", tags=["Authentication"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"], include_in_schema=False)
api_router.include_router(interviews.router, prefix="/v1/interviews", tags=["Interviews"])
api_router.include_router(interviews.router, prefix="/interviews", tags=["Interviews"], include_in_schema=False)
