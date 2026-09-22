import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService, UsuarioSesion } from '../services/auth.service';

interface Vehiculo {
  id: string;
  nombre: string;
  marca: string;
  modelo: string;
  kilometraje: number;
  icono: string;
}

interface Recordatorio {
  id: string;
  titulo: string;
  vehiculo: string;
  detalle: string;
  progreso: number; // 0 a 1, usado por ion-progress-bar
  estado: 'ok' | 'proximo' | 'vencido';
  estadoTexto: string;
}

interface ServicioHistorial {
  id: string;
  tipo: string;
  vehiculo: string;
  fecha: string;
  fotos: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './tab3.page.html',
  styleUrls: ['./tab3.page.scss'],
  standalone: false
})
export class DashboardPage implements OnInit, ViewWillEnter {

  usuario: UsuarioSesion | null = null;

  tieneNotificaciones: boolean = true;

  vehiculos: Vehiculo[] = [
    {
      id: 'v1',
      nombre: 'La Rossa',
      marca: 'Honda',
      modelo: 'CB190R',
      kilometraje: 12450,
      icono: 'bicycle-outline'
    },
    {
      id: 'v2',
      nombre: 'El Jetta',
      marca: 'Volkswagen',
      modelo: 'Jetta A4',
      kilometraje: 98230,
      icono: 'car-sport-outline'
    }
  ];

  recordatorios: Recordatorio[] = [
    {
      id: 'r1',
      titulo: 'Cambio de aceite',
      vehiculo: 'El Jetta',
      detalle: 'Faltan 200 km',
      progreso: 0.9,
      estado: 'proximo',
      estadoTexto: 'Próximo'
    },
    {
      id: 'r2',
      titulo: 'Purga de frenos',
      vehiculo: 'La Rossa',
      detalle: 'Venció hace 3 días',
      progreso: 1,
      estado: 'vencido',
      estadoTexto: 'Vencido'
    },
    {
      id: 'r3',
      titulo: 'Revisión de cableado',
      vehiculo: 'La Rossa',
      detalle: 'Programado en 30 días',
      progreso: 0.3,
      estado: 'ok',
      estadoTexto: 'Al día'
    }
  ];

  historial: ServicioHistorial[] = [
    {
      id: 'h1',
      tipo: 'Limpieza de carburador',
      vehiculo: 'La Rossa',
      fecha: '02 sep',
      fotos: 3
    },
    {
      id: 'h2',
      tipo: 'Cambio de balatas',
      vehiculo: 'El Jetta',
      fecha: '28 ago',
      fotos: 0
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarSesion();
  }

  ionViewWillEnter(): void {
    this.cargarSesion();
  }

  private cargarSesion(): void {
    this.usuario = this.authService.obtenerSesion();

    if (!this.usuario) {
      // TODO: ajusta esta ruta si tu tab de login no es "tab1".
      this.router.navigateByUrl('/tabs/tab1');
      return;
    }

    // Este es el que arregla el "Invitado" que no cambiaba: nada más
    // avisa a Angular que este dato ya está listo para pintarse.
    this.cdr.detectChanges();
  }

  onCerrarSesion(): void {
    this.authService.cerrarSesion();
    this.usuario = null;
    this.router.navigateByUrl('/tabs/tab1');
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
