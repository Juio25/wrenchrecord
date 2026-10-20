import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService, UsuarioSesion } from '../services/auth.service';
import { NetworkService } from '../services/network.service';
import {
  DashboardService,
  Vehiculo,
  Recordatorio,
  ServicioHistorial
} from '../services/dashboard.service';
import { GraficaGastosComponent } from '../shared/grafica-gastos/grafica-gastos.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './tab3.page.html',
  styleUrls: ['./tab3.page.scss'],
  standalone: false
})
export class DashboardPage implements OnInit, OnDestroy, ViewWillEnter {

  /** Gráfica de gastos (si el HTML la incluye): se recarga al volver al Dashboard. */
  @ViewChild(GraficaGastosComponent) grafica?: GraficaGastosComponent;

  usuario: UsuarioSesion | null = null;

  tieneNotificaciones: boolean = true;

  // Estado de la carga desde la API
  cargando: boolean = false;
  error: string | null = null;
  desdeCache: boolean = false;

  // Datos que llegan de la API (antes estaban escritos a mano)
  vehiculos: Vehiculo[] = [];
  recordatorios: Recordatorio[] = [];
  historial: ServicioHistorial[] = [];

  private yaEntro: boolean = false;
  private subReconexion?: Subscription;

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private network: NetworkService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarSesion();

    // Recuperación de conexión: al volver el Internet se vuelve a consultar la API
    // (la gráfica de gastos se refresca sola, ella también escucha la reconexión)
    this.subReconexion = this.network.reconectado$.subscribe(() => this.cargarDatos());
  }

  ngOnDestroy(): void {
    this.subReconexion?.unsubscribe();
  }

  ionViewWillEnter(): void {
    this.cargarSesion();

    if (this.usuario) {
      this.cargarDatos();
    }

    // La primera vez la gráfica carga sola; las siguientes hay que pedirle que se refresque
    if (this.yaEntro) {
      this.grafica?.recargar();
    }
    this.yaEntro = true;
  }

  private cargarSesion(): void {
    this.usuario = this.authService.obtenerSesion();

    if (!this.usuario) {
      // Ya no vive dentro de las tabs: es una página independiente.
      this.router.navigateByUrl('/login');
      return;
    }

    // Este es el que arregla el "Invitado" que no cambiaba: nada más
    // avisa a Angular que este dato ya está listo para pintarse.
    this.cdr.detectChanges();
  }

  /** GET /dashboard/resumen.php: vehículos, recordatorios e historial del usuario. */
  private cargarDatos(): void {
    if (!this.usuario) {
      return;
    }

    this.cargando = true;
    this.error = null;
    this.cdr.detectChanges();

    this.dashboardService.obtenerResumen(this.usuario.id_usuario).subscribe(respuesta => {
      this.cargando = false;
      this.desdeCache = !!respuesta.desdeCache;

      if (respuesta.exito) {
        this.vehiculos = respuesta.resumen.vehiculos;
        this.recordatorios = respuesta.resumen.recordatorios;
        this.historial = respuesta.resumen.historial;
      } else {
        this.error = respuesta.mensaje;
        this.vehiculos = [];
        this.recordatorios = [];
        this.historial = [];
      }

      this.cdr.detectChanges();
    });
  }

  onCerrarSesion(): void {
    this.authService.cerrarSesion();
    this.usuario = null;
    this.vehiculos = [];
    this.recordatorios = [];
    this.historial = [];
    this.router.navigateByUrl('/login');
  }

  verVehiculo(vehiculo: Vehiculo): void {
    // TODO: navegar al perfil / historial completo del vehículo
  }

  onAgregarVehiculo(): void {
    // TODO: navegar al formulario de alta de vehículo
  }

  onNuevoServicio(): void {
    // TODO: navegar al formulario de registro de servicio
  }

  verTodosRecordatorios(): void {
    // TODO: navegar al listado completo de recordatorios
  }

  verHistorialCompleto(): void {
    // TODO: navegar al historial completo de servicios
  }

  onNotificaciones(): void {
    this.tieneNotificaciones = false;
  }

}
