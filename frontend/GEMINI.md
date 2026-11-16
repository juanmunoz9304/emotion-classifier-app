# Contexto del Proyecto Frontend — Clasificador de Emociones Faciales

## Arquitectura e Integración con Backend
- Esta aplicación Angular es el frontend de un monorepo cuyo backend está en `../backend` (FastAPI corriendo en `http://localhost:8000`).
- **Rutas relativas obligatorias:** Todas las peticiones HTTP hacia el backend deben usar rutas relativas (`/api/v1/...`), nunca URLs absolutas con `localhost`, porque en producción FastAPI sirve este build estático desde el mismo dominio en Google Cloud Run.
- **Desarrollo local:** Configurar `proxy.conf.json` redirigiendo `/api` hacia `http://localhost:8000` y enlazarlo en `angular.json` dentro de `serve.options.proxyConfig`.

## Contrato de la API (FastAPI)
- `GET /api/v1/health` -> `{ "status": "ok", "provider": "azure-custom-vision" }`
- `GET /api/v1/emotions` -> `{ "classes": ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"], "total": 7 }`
- `POST /api/v1/predict?threshold=50.0`
  - **Request:** `multipart/form-data` con el campo `file` (imagen válida, máximo 4 MB).
  - **Response (`200 OK`):**
    ```json
    {
      "filename": "foto.jpg",
      "top_emotion": "happy",
      "top_confidence": 84.5,
      "is_confident": true,
      "predictions": [
        { "emotion": "happy", "confidence": 84.5 },
        { "emotion": "neutral", "confidence": 10.2 }
      ]
    }
    ```

## Estándares de Código Angular
- Usar **Standalone Components** exclusivamente (sin `NgModule`).
- Usar **Angular Signals** (`signal`, `computed`) para manejar el estado de la interfaz (modo de entrada activo, archivo seleccionado, URL de previsualización, estado de la cámara, estado de carga, resultado de predicción y mensajes de error).
- TypeScript estricto (`strict: true`): tipar explícitamente las interfaces `EmotionScore` y `PredictionResponse` en `src/app/models/`.
- Separar la comunicación HTTP en `src/app/services/emotion.service.ts` usando `HttpClient` (`provideHttpClient()`).

## Requerimientos de Interfaz (UI/UX)

### 1. Diseño Responsivo (Mobile-First)
- La interfaz debe adaptarse de forma fluida a móviles, tabletas y escritorio usando CSS Grid / Flexbox moderno.
- En pantallas pequeñas (`< 768px`), apilar verticalmente el panel de captura/carga y el panel de resultados con botones táctiles amplios. En escritorio, mostrar ambos paneles en paralelo.

### 2. Banner de Privacidad
- Mostrar de forma visible y permanente un banner informativo (con ícono de escudo o candado) cerca del área de carga/