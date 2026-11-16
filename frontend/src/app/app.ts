import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  EMOTION_LABELS,
  EmotionScore,
  PredictionResponse,
} from './models/emotion.model';
import { EmotionService } from './services/emotion.service';

type InputMode = 'upload' | 'camera';
type CameraState = 'idle' | 'starting' | 'active' | 'error';

interface DisplayEmotionScore extends EmotionScore {
  label: string;
}

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly emotionService = inject(EmotionService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly videoRef = viewChild<ElementRef<HTMLVideoElement>>('videoElement');
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvasElement');
  private readonly fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  private activeStream: MediaStream | null = null;

  protected readonly inputMode = signal<InputMode>('upload');
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly isDragging = signal(false);

  protected readonly cameraState = signal<CameraState>('idle');
  protected readonly cameraError = signal<string | null>(null);

  protected readonly isLoading = signal(false);
  protected readonly prediction = signal<PredictionResponse | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly topEmotionLabel = computed(() => {
    const result = this.prediction();
    if (!result) return '';
    return this.translateEmotion(result.top_emotion);
  });

  protected readonly sortedPredictions = computed<DisplayEmotionScore[]>(() => {
    const result = this.prediction();
    if (!result) return [];

    return [...result.predictions]
      .sort((a, b) => b.confidence - a.confidence)
      .map((item) => ({
        ...item,
        label: this.translateEmotion(item.emotion),
      }));
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.stopCameraStream();
      this.revokePreviewUrl();
    });
  }

  protected switchMode(mode: InputMode): void {
    if (this.inputMode() === mode) return;

    this.inputMode.set(mode);
    this.errorMessage.set(null);

    if (mode === 'upload') {
      this.stopCameraStream();
      this.cameraState.set('idle');
      this.cameraError.set(null);
      return;
    }

    this.clearSelection();
    void this.startCamera();
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const file = event.dataTransfer?.files.item(0);
    if (file) {
      this.handleSelectedFile(file);
    }
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    if (file) {
      this.handleSelectedFile(file);
    }
    input.value = '';
  }

  protected triggerFilePicker(): void {
    this.fileInputRef()?.nativeElement.click();
  }

  protected async startCamera(): Promise<void> {
    this.stopCameraStream();
    this.cameraError.set(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraState.set('error');
      this.cameraError.set(
        'Tu navegador no permite acceder a la cámara en este contexto.'
      );
      return;
    }

    this.cameraState.set('starting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });

      // Si el usuario cambió de pestaña mientras esperaba permiso, liberar de inmediato.
      if (this.inputMode() !== 'camera') {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      this.activeStream = stream;
      const videoElement = this.videoRef()?.nativeElement;
      if (videoElement) {
        videoElement.srcObject = stream;
      }
      this.cameraState.set('active');
    } catch (error) {
      this.cameraState.set('error');
      this.cameraError.set(this.mapCameraError(error));
    }
  }

  protected capturePhoto(): void {
    const video = this.videoRef()?.nativeElement;
    const canvas = this.canvasRef()?.nativeElement;

    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      this.errorMessage.set('La cámara aún no está lista. Inténtalo de nuevo.');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      this.errorMessage.set('No se pudo procesar el fotograma de la cámara.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Liberación obligatoria de hardware inmediatamente después de capturar el fotograma.
    this.stopCameraStream();
    this.cameraState.set('idle');

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          this.errorMessage.set('No se pudo generar la imagen desde la cámara.');
          return;
        }
        const capturedFile = new File([blob], 'captura-camara.jpg', {
          type: 'image/jpeg',
        });
        this.setPreviewFile(capturedFile);
      },
      'image/jpeg',
      0.9
    );
  }

  protected analyzeEmotion(): void {
    const file = this.selectedFile();
    if (!file || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.emotionService.predictEmotion(file).subscribe({
      next: (response) => {
        this.prediction.set(response);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.isLoading.set(false);
        this.errorMessage.set(this.mapHttpError(error));
      },
    });
  }

  protected resetForAnotherImage(): void {
    this.clearSelection();
    if (this.inputMode() === 'camera') {
      void this.startCamera();
    }
  }

  private handleSelectedFile(file: File): void {
    this.errorMessage.set(null);

    if (!file.type.startsWith('image/')) {
      this.errorMessage.set(
        'El archivo seleccionado no es una imagen válida (usa JPG, PNG o WebP).'
      );
      return;
    }

    if (file.size >= MAX_FILE_SIZE_BYTES) {
      this.errorMessage.set(
        'La imagen supera el límite permitido de 4 MB. Elige un archivo más liviano.'
      );
      return;
    }

    this.setPreviewFile(file);
  }

  private setPreviewFile(file: File): void {
    this.revokePreviewUrl();
    this.selectedFile.set(file);
    this.previewUrl.set(URL.createObjectURL(file));
    this.prediction.set(null);
    this.errorMessage.set(null);
  }

  private clearSelection(): void {
    this.revokePreviewUrl();
    this.selectedFile.set(null);
    this.prediction.set(null);
    this.errorMessage.set(null);
  }

  private stopCameraStream(): void {
    if (!this.activeStream) return;
    this.activeStream.getTracks().forEach((track) => track.stop());
    this.activeStream = null;

    const videoElement = this.videoRef()?.nativeElement;
    if (videoElement) {
      videoElement.srcObject = null;
    }
  }

  private revokePreviewUrl(): void {
    const currentUrl = this.previewUrl();
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl);
      this.previewUrl.set(null);
    }
  }

  private translateEmotion(emotionKey: string): string {
    return EMOTION_LABELS[emotionKey.toLowerCase()] ?? emotionKey;
  }

  private mapCameraError(error: unknown): string {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        return 'Permiso de cámara denegado. Habilita el acceso en tu navegador o usa la opción "Subir imagen".';
      }
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        return 'No se detectó ninguna cámara disponible en este dispositivo.';
      }
    }
    return 'No se pudo iniciar la cámara. Verifica que no esté siendo usada por otra aplicación.';
  }

  private mapHttpError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 400) {
        return 'La imagen enviada no es válida o no pudo procesarse. Intenta con otra fotografía.';
      }
      if (error.status === 413) {
        return 'La imagen excede el tamaño máximo de 4 MB permitido por el servidor.';
      }
      if (error.status === 502) {
        return 'El servicio de análisis facial no respondió correctamente (502). Intenta de nuevo en unos momentos.';
      }
      if (error.status === 0) {
        return 'No se pudo conectar con el servidor. Verifica que el backend esté activo.';
      }
    }
    return 'Ocurrió un error inesperado al analizar la emoción. Inténtalo nuevamente.';
  }
}
