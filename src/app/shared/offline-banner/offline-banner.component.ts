import { Component, OnDestroy, OnInit, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NetworkService, EstadoConexion } from '../../services/network.service';

type EstadoVisual = 'online' | 'offline' | 'restablecida';

/**
 * OfflineBannerComponent – standalone
 *
 * Muestra el estado de la conexión en todo momento:
 *  - offline:       banner ámbar fijo "Sin conexión — mostrando datos guardados"
 *  - restablecida:  banner verde 3.5 s "Conexión restablecida — sincronizando datos..."
 *  - online:        chip discreto "● En línea"
 *
 * Usage: add OfflineBannerComponent to the `imports` array of any
 * page module and use:   <app-offline-banner></app-offline-banner>
 */
@Component({
  selector: 'app-offline-banner',
  template: `
    <div class="offline-banner" *ngIf="estado === 'offline'" role="alert" aria-live="assertive">
      <ion-icon name="cloud-offline-outline" class="banner-icon"></ion-icon>
      <span>Sin conexión &mdash; mostrando datos guardados</span>
    </div>

    <div class="online-banner" *ngIf="estado === 'restablecida'" role="status" aria-live="polite">
      <ion-icon name="cloud-done-outline" class="banner-icon"></ion-icon>
      <span>Conexión restablecida &mdash; sincronizando datos...</span>
    </div>

    <div class="estado-chip" *ngIf="estado === 'online'" role="status">
      <span class="punto"></span>
      <span>En línea</span>
    </div>
  `,
  styles: [`
    .offline-banner, .online-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #000;
      padding: 8px 16px;
      font-size: 0.875rem;
      font-weight: 500;
      z-index: 9999;
      box-shadow: 0 2px 6px rgba(0,0,0,.2);
    }
    .offline-banner { background: var(--ion-color-warning, #ffc409); }
    .online-banner  { background: var(--ion-color-success, #2dd36f); }
    .banner-icon {
      font-size: 1.2rem;
      flex-shrink: 0;
    }
    .estado-chip {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      padding: 6px 16px 0;
      font-size: 0.75rem;
      color: #9d9ca5;
    }
    .punto {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #2dd36f;
    }
  `],
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class OfflineBannerComponent implements OnInit, OnDestroy {

  estado: EstadoVisual = 'online';

  private sub!: Subscription;
  private temporizador?: ReturnType<typeof setTimeout>;

  constructor(
    private network: NetworkService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Initialise synchronously so there's no flash on first render
    this.estado = this.network.estaOnline ? 'online' : 'offline';

    this.sub = this.network.estado$.subscribe((nuevo: EstadoConexion) => {
      this.limpiarTemporizador();

      if (nuevo === 'offline') {
        this.estado = 'offline';
      } else if (this.estado === 'offline') {
        // Volvió el Internet: avisa unos segundos y regresa al chip "En línea"
        this.estado = 'restablecida';
        this.temporizador = setTimeout(() => {
          this.estado = 'online';
          this.cdr.detectChanges();
        }, 3500);
      } else {
        this.estado = 'online';
      }

      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.limpiarTemporizador();
  }

  private limpiarTemporizador(): void {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = undefined;
    }
  }
}
