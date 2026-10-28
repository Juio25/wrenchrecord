import {
  AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild,
  ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalController } from '@ionic/angular/lazy';
import type { EditorApi } from 'photoeditorsdk/no-polyfills';

/**
 * Licencia de PhotoEditor SDK (la entrega IMG.LY).
 * Mientras esté vacía el editor funciona en modo de prueba y pone una marca de agua
 * sobre la imagen.
 */
const LICENCIA_PESDK = '';

/**
 * FotoEditorComponent – standalone
 *
 * Abre PhotoEditor SDK dentro de un modal. Se usa así:
 *
 *   const modal = await modalCtrl.create({ component: FotoEditorComponent, componentProps: { src } });
 *   await modal.present();
 *   const { data, role } = await modal.onWillDismiss();   // role === 'exportada' -> data.dataUrl
 *
 * La librería es pesada, por eso se carga solo cuando se abre el editor (import dinámico).
 */
@Component({
  selector: 'app-foto-editor',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="envoltura">
      <div class="barra">
        <button type="button" class="btn-barra" (click)="cancelar()">Cancelar</button>
        <button type="button" class="btn-barra principal" (click)="usarOriginal()">Usar sin editar</button>
      </div>

      <div class="zona-editor">
        <div class="estado" *ngIf="cargando">
          <ion-spinner name="crescent"></ion-spinner>
          <span>Cargando editor...</span>
        </div>
        <p class="estado error" *ngIf="error">{{ error }}</p>
        <div #contenedor class="editor"></div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; background: #1f2029; }
    .envoltura { display: flex; flex-direction: column; height: 100%; }
    .barra {
      flex: 0 0 auto;
      display: flex;
      justify-content: space-between;
      gap: 8px;
      padding: calc(8px + env(safe-area-inset-top, 0px)) 12px 8px;
      background: #1f2029;
    }
    .btn-barra {
      background: transparent;
      color: #ffeba7;
      border: 1px solid #3b3c48;
      border-radius: 8px;
      padding: 8px 14px;
      font-family: inherit;
      font-size: 0.875rem;
      cursor: pointer;
    }
    .btn-barra.principal { background: #ffeba7; color: #102770; border-color: #ffeba7; font-weight: 600; }
    .zona-editor { position: relative; flex: 1 1 auto; min-height: 0; }
    .editor { position: absolute; inset: 0; }
    .estado {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      color: #c4c3ca; font-size: 0.875rem; text-align: center; padding: 16px;
      z-index: 2; pointer-events: none;
    }
    .estado.error { color: #eb445a; }
  `]
})
export class FotoEditorComponent implements AfterViewInit, OnDestroy {

  /** URL de la imagen a editar (blob: o data:). */
  @Input() src = '';

  @ViewChild('contenedor', { static: true }) contenedor!: ElementRef<HTMLDivElement>;

  cargando = true;
  error: string | null = null;

  private editor: EditorApi | null = null;

  constructor(
    private modalCtrl: ModalController,
    private cdr: ChangeDetectorRef
  ) {}

  async ngAfterViewInit(): Promise<void> {
    try {
      const { PhotoEditorSDKUI, UIEvent, ExportFormat, ImageFormat } = await import('photoeditorsdk/no-polyfills');

      this.editor = await PhotoEditorSDKUI.init({
        license: LICENCIA_PESDK,
        container: this.contenedor.nativeElement,
        image: this.src,
        assetBaseUrl: '/assets/photoeditorsdk',
        layout: 'basic',
        export: {
          image: {
            exportType: ExportFormat.DATA_URL,
            format: ImageFormat.JPEG,
            quality: 0.85,
            enableDownload: false
          }
        }
      });

      // El usuario terminó de editar: se devuelve la imagen como data URL
      this.editor.on(UIEvent.EXPORT, (dataUrl: string) => {
        void this.modalCtrl.dismiss({ dataUrl }, 'exportada');
      });
      this.editor.on(UIEvent.CLOSE, () => {
        void this.modalCtrl.dismiss(null, 'cancelada');
      });
      this.editor.on(UIEvent.ERROR_IMAGE_LOADING, () => {
        this.error = 'No se pudo cargar la imagen. Puedes usarla sin editar.';
        this.cdr.detectChanges();
      });

      this.cargando = false;
    } catch {
      this.cargando = false;
      this.error = 'No se pudo abrir el editor. Puedes usar la foto sin editar.';
    }

    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    try {
      this.editor?.dispose();
    } catch {
      // el editor ya se había cerrado
    }
  }

  cancelar(): void {
    void this.modalCtrl.dismiss(null, 'cancelada');
  }

  /** Plan B: usa la foto tal cual, sin pasar por el editor. */
  async usarOriginal(): Promise<void> {
    try {
      const respuesta = await fetch(this.src);
      const blob = await respuesta.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(lector.result as string);
        lector.onerror = () => reject(lector.error);
        lector.readAsDataURL(blob);
      });
      await this.modalCtrl.dismiss({ dataUrl }, 'exportada');
    } catch {
      this.error = 'No se pudo leer la foto.';
      this.cdr.detectChanges();
    }
  }
}
