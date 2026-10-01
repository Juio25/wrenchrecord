import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { CacheService } from './cache.service';
import { NetworkService } from './network.service';
import { ErrorHandlerService } from './error-handler.service';

// ==================== INTERFACES ====================

export interface FiltrosConsulta {
  nombre: string;
  apellido: string;
  correo: string;
  idUsuario: string;
}

export interface UsuarioResultado {
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  fecha_registro: string;
  activo: number;
}

export interface RespuestaConsulta {
  exito: boolean;
  mensaje: string;
  usuarios: UsuarioResultado[];
  desdeCahe?: boolean;   // true when the response comes from local cache
}

export interface UsuarioActualizar {
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
}

export interface RespuestaOperacion {
  exito: boolean;
  mensaje: string;
}

// ==================== SERVICIO ====================

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {

  // La URL base se toma dinámicamente de ConfigService (IP guardada en el login).
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

  // ---------- READ ----------

  /**
   * Queries users from the API.
   * - When online: fetches from the API and stores the result in cache (5 min TTL).
   * - When offline: returns cached data if available, otherwise returns an error response.
   */
  consultar(filtros: FiltrosConsulta): Observable<RespuestaConsulta> {
    let params = new HttpParams();

    if (filtros.nombre?.trim()) { params = params.set('nombre', filtros.nombre.trim()); }
    if (filtros.apellido?.trim()) { params = params.set('apellido', filtros.apellido.trim()); }
    if (filtros.correo?.trim()) { params = params.set('correo', filtros.correo.trim()); }
    if (filtros.idUsuario?.trim()) { params = params.set('idUsuario', filtros.idUsuario.trim()); }

    const claveCache = `consulta_usuarios_${params.toString()}`;

    // ── Offline path: serve from cache if available ─────────────────
    if (!this.network.estaOnline) {
      const cached = this.cache.obtener<RespuestaConsulta>(claveCache);
      if (cached) {
        return of({ ...cached, desdeCahe: true });
      }
      return of({
        exito: false,
        mensaje: 'Sin conexión. No hay datos guardados para esta consulta.',
        usuarios: []
      });
    }

    // ── Online path: fetch and cache ─────────────────────────────────
    return this.http
      .get<RespuestaConsulta>(`${this.baseUrl}/usuarios/consultar.php`, { params })
      .pipe(
        tap(respuesta => {
          if (respuesta.exito) {
            this.cache.guardar(claveCache, respuesta);
          }
        }),
        catchError(error => {
          // On HTTP error, try to serve stale cache before giving up
          const cached = this.cache.obtener<RespuestaConsulta>(claveCache);
          if (cached) {
            return of({ ...cached, desdeCahe: true });
          }
          const info = this.errorHandler.interpretar(error);
          return of({ exito: false, mensaje: info.mensaje, usuarios: [] });
        })
      );
  }

  // ---------- UPDATE ----------

  /** Blocks the request when offline and returns a descriptive error. */
  actualizar(usuario: UsuarioActualizar): Observable<RespuestaOperacion> {
    if (!this.network.estaOnline) {
      return of({ exito: false, mensaje: 'Sin conexión. No se puede actualizar el usuario ahora.' });
    }
    return this.http
      .put<RespuestaOperacion>(`${this.baseUrl}/usuarios/actualizar.php`, usuario)
      .pipe(
        catchError(error => {
          const info = this.errorHandler.interpretar(error);
          return of({ exito: false, mensaje: info.mensaje });
        })
      );
  }

  // ---------- DELETE ----------

  /** Blocks the request when offline and returns a descriptive error. */
  eliminar(idUsuario: number): Observable<RespuestaOperacion> {
    if (!this.network.estaOnline) {
      return of({ exito: false, mensaje: 'Sin conexión. No se puede eliminar el usuario ahora.' });
    }
    const params = new HttpParams().set('id_usuario', idUsuario.toString());
    return this.http
      .delete<RespuestaOperacion>(`${this.baseUrl}/usuarios/eliminar.php`, { params })
      .pipe(
        catchError(error => {
          const info = this.errorHandler.interpretar(error);
          return of({ exito: false, mensaje: info.mensaje });
        })
      );
  }
}
