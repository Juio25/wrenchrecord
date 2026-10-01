import { Component, OnDestroy, OnInit, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NetworkService, EstadoConexion } from '../../services/network.service';

/**
 * OfflineBannerComponent – standalone
 *
 * Displays a sticky banner at the top of the screen when the device is
 * offline. Subscribes to NetworkService.estado$ and reacts in real time.
 *
 * Usage: add OfflineBannerComponent to the `imports` array of any
 * page module (or standalone component) and use:
 *   <app-offline-banner></app-offline-banner>
 */
@Component({
  selector: 'app-offline-banner',
  template: `
    <div class="offline-banner" *ngIf="estaOffline" role="alert" aria-live="assertive">
      <ion-icon name="cloud-offline-outline" class="banner-icon"></ion-icon>
      <span>Sin conexión &mdash; mostrando datos guardados</span>
    </div>
  `,
  styles: [`
    .offline-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--ion-color-warning, #ffc409);
      color: #000;
      padding: 8px 16px;
      font-size: 0.875rem;
      font-weight: 500;
      z-index: 9999;
      box-shadow: 0 2px 6px rgba(0,0,0,.2);
    }
    .banner-icon {
      font-size: 1.2rem;
      flex-shrink: 0;
    }
  `],
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class OfflineBannerComponent implements OnInit, OnDestroy {

  estaOffline = false;

  private sub!: Subscription;

  constructor(
    private network: NetworkService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Initialise synchronously so there's no flash on first render
    this.estaOffline = !this.network.estaOnline;

    this.sub = this.network.estado$.subscribe((estado: EstadoConexion) => {
      this.estaOffline = estado === 'offline';
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}


