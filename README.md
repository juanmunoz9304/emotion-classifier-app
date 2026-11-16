## Emotion Classifier App

#### Author : Juan Sebastian Muñoz

---

This is an emotion classifier application using custom vision api to estimate emotions by images.

### How it works?

This is a monorepo-wise application, backend is embedding Custom Vision API requests and responses.
That means, Backend in FastAPI builds the request for Custom Vision, handles the image multipart
and does a really simple formatting on the retrieved information about image classifying. Then, an
Angular APP, which serves as a web application handles the user requests only making lineal communication. No direct use of the Custom Vision API and error handling only using project structure.

---

#### About the backend

Backend was built using FastAPI + Uvicorn. The main purpose of this backend is to: Embed custom vision, 
generates own requests and responses and serve Angular Application.