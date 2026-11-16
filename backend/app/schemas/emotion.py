from pydantic import BaseModel


class EmotionScore(BaseModel):
    emotion: str
    confidence: float


class PredictionResponse(BaseModel):
    filename: str
    top_emotion: str
    top_confidence: float
    is_confident: bool
    predictions: list[EmotionScore]