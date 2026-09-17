import { Component, OnInit } from '@angular/core';

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
export class DashboardPage implements OnInit {

  tieneNotificaciones: boolean = true;

  // TODO: reemplazar estos arreglos de ejemplo por los datos
  // reales que vengan de la API/BD (vehículos, recordatorios e
  // historial de servicios del usuario autenticado).

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

  constructor() {}

  ngOnInit(): void {}

  verVehiculo(vehiculo: Vehiculo): void {
    // TODO: navegar al perfil / historial completo del vehículo
  }

  onAgregarVehiculo(): void {
    // TODO: navegar al formulario de alta de vehículo
  }

  onNuevoServicio(): void {
    // TODO: navegar al formulario de registro de servicio
    // (con evidencia fotográfica y datos del vehículo)
  }

  verTodosRecordatorios(): void {
    // TODO: navegar al listado completo de recordatorios
  }

  verHistorialCompleto(): void {
    // TODO: navegar al historial completo de servicios
  }

  onNotificaciones(): void {
    this.tieneNotificaciones = false;
    // TODO: navegar a la pantalla de notificaciones
  }

}
