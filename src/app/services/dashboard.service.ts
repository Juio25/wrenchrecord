import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { CacheService } from './cache.service';
import { NetworkService } from './network.service';
import { ErrorHandlerService } from './error-handler.service';

// ==================== INTERFACES (lo que pinta el Dashboard) ====================

export interface Vehiculo {
  id: number;
  nombre: string;
  marca: string;
  modelo: string;
  kilometraje: number;
  icono: string;
}

export interface Recordatorio {
  id: number;
  titulo: string;
  vehiculo: string;
  detalle: string;
  progreso: number; // 0 a 1, usado por ion-progress-bar
  estado: 'ok' | 'proximo' | 'vencido';
  estadoTexto: string;
}

export interface ServicioHistorial {
  id: number;
  tipo: string;
  vehiculo: string;
  fecha: string;   // ya formateada, ej. "02 sep"
  fotos: number;
}

export interface ResumenDashboard {
  vehiculos: Vehiculo[];
  recordatorios: Recordatorio[];
  historial: ServicioHistorial[];
}

export interface RespuestaDashboard {
  exito: boolean;
  mensaje: string;
  resumen: ResumenDashboard;
  desdeCache?: boolean;   // true cuando los datos vienen del almacenamiento local
}

// ==================== INTERFACES (lo que responde el PHP) ====================

interface RespuestaResumenApi {
  exito: boolean;
  mensaje: string;
  vehiculos: {
    id_vehiculo: number; alias: string; tipo: 'moto' | 'auto';
    marca: string; modelo: string; kilometraje_actual: number;
  }[];
  recordatorios: {
    id_recordatorio: number; titulo: string; vehiculo: string; detalle: string;
    progreso: number; estado: 'ok' | 'proximo' | 'vencido'; estado_texto: string;
  }[];
  historial: {
    id_servicio: number; tipo_servicio: string; vehiculo: string;
    fecha_servicio: string; fotos: number;
  }[];
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
               'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const TTL_CACHE_MS = 24 * 60 * 60 * 1000;   // 24 h: sirve para ver el Dashboard sin conexión

// ==================== SERVICIO ====================

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  constructor(
    private http: HttpClient,
    private config: ConfigService,
    private cache: CacheService,
    private network: NetworkService,
    private errorHandler: ErrorHandlerService
  ) {}

  private get baseUrl(): string {
    return this.config.apiUrl;
  }

  /**
   * GET /dashboard/resumen.php?id_usuario=1
   * - Con conexión: pide los datos a la API y los guarda en caché.
   * - Sin conexión o si la API falla: usa lo último que se guardó, si existe.
   */
  obtenerResumen(idUsuario: number): Observable<RespuestaDashboard> {
    const clave = `dashboard_${idUsuario}`;
    const vacio: ResumenDashboard = { vehiculos: [], recordatorios: [], historial: [] };

    if (!this.network.estaOnline) {
      const guardado = this.cache.obtener<ResumenDashboard>(clave);
      if (guardado) {
        return of({ exito: true, mensaje: 'Datos guardados', resumen: guardado, desdeCache: true });
      }
      return of({
        exito: false,
        mensaje: 'Sin conexión. Todavía no hay datos guardados para mostrar.',
        resumen: vacio
      });
    }

    const params = new HttpParams().set('id_usuario', idUsuario.toString());

    return this.http
      .get<RespuestaResumenApi>(`${this.baseUrl}/dashboard/resumen.php`, { params })
      .pipe(
        map((resp): RespuestaDashboard => {
          if (!resp.exito) {
            return { exito: false, mensaje: resp.mensaje, resumen: vacio };
          }
          const resumen = this.convertir(resp);
          this.cache.guardar(clave, resumen, TTL_CACHE_MS);
          return { exito: true, mensaje: resp.mensaje, resumen };
        }),
        catchError((error): Observable<RespuestaDashboard> => {
          const guardado = this.cache.obtener<ResumenDashboard>(clave);
          if (guardado) {
            return of({ exito: true, mensaje: 'Datos guardados', resumen: guardado, desdeCache: true });
          }
          const info = this.errorHandler.interpretar(error);
          return of({ exito: false, mensaje: info.mensaje, resumen: vacio });
        })
      );
  }

  // ---------- Conversión API -> formato del Dashboard ----------

  private convertir(resp: RespuestaResumenApi): ResumenDashboard {
    return {
      vehiculos: resp.vehiculos.map(v => ({
        id: v.id_vehiculo,
        nombre: v.alias,
        marca: v.marca,
        modelo: v.modelo,
        kilometraje: v.kilometraje_actual,
        icono: v.tipo === 'moto' ? 'bicycle-outline' : 'car-sport-outline'
      })),
      recordatorios: resp.recordatorios.map(r => ({
        id: r.id_recordatorio,
        titulo: r.titulo,
        vehiculo: r.vehiculo,
        detalle: r.detalle,
        progreso: r.progreso,
        estado: r.estado,
        estadoTexto: r.estado_texto
      })),
      historial: resp.historial.map(h => ({
        id: h.id_servicio,
        tipo: h.tipo_servicio,
        vehiculo: h.vehiculo,
        fecha: this.formatearFecha(h.fecha_servicio),
        fotos: h.fotos
      }))
    };
  }

  /** "2026-09-02" -> "02 sep" (sin usar Date, para evitar desfases de zona horaria). */
  private formatearFecha(iso: string): string {
    const [, mes, dia] = iso.split('-');
    const nombreMes = MESES[Number(mes) - 1];
    return nombreMes ? `${dia} ${nombreMes}` : iso;
  }
}
