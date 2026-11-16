# Contexto del Proyecto Frontend — Clasificador de Emociones Faciales

## Arquitectura e Integración con Backend
- Esta aplicación Angular es el frontend de un monorepo cuyo backend está en `../backend` (FastAPI corriendo en `http://localhost:8000`).
- **Rutas relativas obligatorias:** Todas las peticiones HTTP hacia el backend deben usar rutas relativas (`/api/v1/...`), nunca URLs absolutas con `localhost`, porque en producción FastAPI sirve este build estático desde el mismo dominio en Google Cloud Run.
- **Desarrollo local:** Configurar `proxy.conf.json` redirigiendo `/api` hacia `http://localhost:8000` y enlazarlo en `angular.json` dentro de `serve.options.proxyConfig`.

## Contrato de la API (FastAPI)
- `GET /api/v1/health` -> `{ "status": "ok", "provider": "azure-custom-vision" }`
- `GET /api/v1/emotions` -> `{ "classes": ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"], "total": 7 }`
- `POST /api/v1/predict`
  - **Request:** `multipart/form-data` con el campo `file` (imagen válida, máximo 4 MB).
  - **Response (`200 OK`):**
    ```json
    {
      "filename": "foto.jpg",
      "top_emotion": "happy",
      "top_confidence": 84.5,
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
- Mostrar de forma visible y permanente un banner informativo (con ícono de escudo o candado) cerca del área de carga/cámara indicando explícitamente: *"Tu privacidad está protegida: las fotografías se procesan únicamente en tiempo real para el análisis y no se almacenan ni guardan en la aplicación."*

### 3. Dos Modos de Entrada: Subir Archivo o Tomar Foto
- Incluir un selector de pestañas o botones para alternar entre **Subir imagen** y **Usar cámara**:
  - **Modo Subir imagen:** Área con arrastrar y soltar (*drag & drop*) y selector de archivo (`accept="image/*"`). Validar en cliente antes de enviar que sea una imagen válida y pese menos de 4 MB.
  - **Modo Usar cámara:**
    - Al activarlo, solicitar permiso explícito al navegador mediante `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })` para priorizar la cámara frontal en móviles.
    - Mostrar el video en vivo en un elemento `<video autoplay playsinline>` con un botón claro para **Capturar foto**.
    - Al capturar, dibujar el fotograma actual en un `<canvas>` oculto, convertirlo con `canvas.toBlob(..., 'image/jpeg', 0.9)` a un objeto `File` (`new File([blob], 'captura-camara.jpg', { type: 'image/jpeg' })`) y reutilizar exactamente el mismo método del servicio que envía archivos al backend.
    - **Liberación obligatoria de hardware:** Detener todos los tracks de video (`stream.getTracks().forEach(t => t.stop())`) inmediatamente después de tomar la foto, al volver al modo de subida de archivo y al destruir el componente (`DestroyRef`), evitando que la luz de la cámara quede encendida.
    - Manejar de forma amigable los errores de permisos denegados (`NotAllowedError`) o ausencia de cámara (`NotFoundError`).

### 4. Visualización de Resultados y Estados
- Mostrar previsualización de la imagen capturada o subida antes y después del análisis, con opción rápida para tomar otra foto o elegir otro archivo.
- Indicador de carga visible mientras responde la API y manejo claro de errores HTTP (`400`, `413`, `502`).
- Destacar la emoción principal (`top_emotion` y `top_confidence`) y renderizar barras de progreso ordenadas de mayor a menor para las 7 probabilidades devueltas en `predictions`.

### 5. Estética, Idioma y Flujo de Interacción
- **Idioma 100% en español:** Toda la interfaz debe estar en español. Mapear las clases devueltas por el backend mediante un diccionario tipado (`Record<string, string>`):
  - `happy`: "Felicidad"
  - `sad`: "Tristeza"
  - `angry`: "Enojo"
  - `surprise`: "Sorpresa"
  - `fear`: "Miedo"
  - `disgust`: "Disgusto"
  - `neutral`: "Neutral"
- **Flujo de dos pasos (Previsualizar -> Analizar):** Al subir una imagen o capturar una foto con la cámara, mostrar primero la vista previa junto con dos botones: **"Analizar emoción"** (que dispara `POST /api/v1/predict`) y **"Cambiar imagen / Repetir foto"**.
- **Diseño visual:** Interfaz limpia de tipo dashboard moderno en modo claro (fondo gris muy tenue `#f8fafc`, tarjetas blancas con borde sutil `#e2e8f0` y color de acento azul índigo `#2563eb`). Destacar la emoción principal en una tarjeta superior y animar suavemente el ancho de las barras de probabilidad.
- **Navegación:** No hay navegación; es una vista única donde los controles de entrada y los resultados conviven directamente sin menús ni enlaces.
- **Sintaxis Angular moderna:** Respetar la estructura de archivos generada por el CLI en `src/app/` y usar exclusivamente la sintaxis nativa `@if` y `@for` en las plantillas (sin `*ngIf` ni `*ngFor`).

### 6. Prohibiciones

- Unicamente se permite modificar el contenido de la carpeta frontend.
- NO se permiten cambios en archivos de dockerfile ni crear ninguno.


### 7. Pasos para trabajar

- Genera y muestra un plan de trabajo claro antes de realizar cualquier cambio.
- NO DEBES MODIFICAR ARCHIVOS SIN ANTES HABER SOLICITADO PERMISO PARA CAMBIOS.