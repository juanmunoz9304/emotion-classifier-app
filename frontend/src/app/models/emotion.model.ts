export interface EmotionScore {
  emotion: string;
  confidence: number;
}

export interface PredictionResponse {
  filename: string;
  top_emotion: string;
  top_confidence: number;
  predictions: EmotionScore[];
}

export interface HealthResponse {
  status: string;
  provider: string;
}

export interface EmotionsListResponse {
  classes: string[];
  total: number;
}

export const EMOTION_LABELS: Record<string, string> = {
  happy: 'Felicidad',
  sad: 'Tristeza',
  angry: 'Enojo',
  surprise: 'Sorpresa',
  fear: 'Miedo',
  disgust: 'Disgusto',
  neutral: 'Neutral',
};
