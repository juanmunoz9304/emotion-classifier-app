import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  EmotionsListResponse,
  HealthResponse,
  PredictionResponse,
} from '../models/emotion.model';

@Injectable({
  providedIn: 'root',
})
export class EmotionService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = '/api/v1';

  /**
   * Envía una imagen al backend para clasificar la emoción facial.
   */
  predictEmotion(file: File): Observable<PredictionResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<PredictionResponse>(`${this.apiBaseUrl}/predict`, formData);
  }

  /**
   * Verifica el estado de salud del servicio backend.
   */
  checkHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.apiBaseUrl}/health`);
  }

  /**
   * Obtiene la lista de clases de emociones soportadas por el modelo.
   */
  getEmotions(): Observable<EmotionsListResponse> {
    return this.http.get<EmotionsListResponse>(`${this.apiBaseUrl}/emotions`);
  }
}
