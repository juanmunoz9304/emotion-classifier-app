import httpx
from fastapi import HTTPException
from app.core.config import settings
from app.schemas.emotion import EmotionScore, PredictionResponse


async def classify_facial_emotion(
    image_bytes: bytes,
    filename: str,
    confidence_threshold: float = 50.0,
) -> PredictionResponse:
    headers = {
        "Prediction-Key": settings.azure_prediction_key,
        "Content-Type": "application/octet-stream",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            settings.azure_prediction_url,
            headers=headers,
            content=image_bytes,
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Error al consultar Azure Custom Vision ({response.status_code}).",
        )

    raw_predictions = response.json().get("predictions", [])
    if not raw_predictions:
        raise HTTPException(status_code=502, detail="Azure no devolvió predicciones.")

    ranked = sorted(
        [
            EmotionScore(
                emotion=item["tagName"],
                confidence=round(item["probability"] * 100, 2),
            )
            for item in raw_predictions
        ],
        key=lambda x: x.confidence,
        reverse=True,
    )

    top = ranked[0]
    return PredictionResponse(
        filename=filename,
        top_emotion=top.emotion,
        top_confidence=top.confidence,
        is_confident=top.confidence >= confidence_threshold,
        predictions=ranked,
    )