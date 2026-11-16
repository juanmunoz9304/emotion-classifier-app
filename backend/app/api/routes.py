from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from app.core.config import settings
from app.schemas.emotion import PredictionResponse
from app.services.custom_vision import classify_facial_emotion

router = APIRouter(prefix="/api/v1", tags=["Emotions"])

EMOCIONES_SOPORTADAS = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]


@router.get("/health")
async def health_check():
    return {"status": "ok", "provider": "azure-custom-vision"}


@router.get("/emotions")
async def list_emotions():
    return {"classes": EMOCIONES_SOPORTADAS, "total": len(EMOCIONES_SOPORTADAS)}


@router.post("/predict", response_model=PredictionResponse)
async def predict_emotion(
    file: UploadFile = File(...),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen válida.")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

    if len(image_bytes) > settings.max_image_size_bytes:
        raise HTTPException(status_code=413, detail="La imagen excede el límite de 4 MB.")

    return await classify_facial_emotion(
        image_bytes=image_bytes,
        filename=file.filename or "upload.jpg",
    )