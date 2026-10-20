import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { CacheService } from './cache.service';
import { NetworkService } from './network.service';
import { AuthService } from './auth.service';
import { ErrorHandlerService } from './error-handler.service';

// ==================== INTERFACES ====================

/** Total gastado en un mes (mes: 1 = enero ... 12 = diciembre). */
export interface GastoMes {
  mes: number;
  total: number;
}

export interface RespuestaGastos {
  exito: boolean;
  mensaje: string;
  gastos: GastoMes[];
  desdeCache?: boolean;   // true cuando vienen de la copia local
}

const TTL_CACHE_MS = 24 * 60 * 60 * 1000;   // 24 h: para ver la gráfica sin conexión

// ==================== SERVICIO ====================

@Injectable({
  providedIn: 'root'
})
export class GastosService {

  constructor(
    private http: HttpClient,
    private config: ConfigService,
    private cache: CacheService,
    private network: NetworkService,
    private auth: AuthService,
    private errorHandler: ErrorHandlerService
  ) {}

  private get baseUrl(): string {
    return this.config.apiUrl;
  }

  /**
   * GET /gastos/por_mes.php?anio=2026&id_usuario=1
   *
   * El id del usuario sale de la sesión iniciada en el login, así cada persona
   * solo ve sus propios gastos.
   *
   * Respuesta del PHP:
   * { "exito": true, "mensaje": "OK",
   *   "gastos": [ { "mes": 3, "total": 2481 }, { "mes": 5, "total": 420 } ] }
   *
   * Solo vienen los meses que tienen gasto; el componente rellena con 0 el resto.
   */
  obtenerPorMes(anio: number): Observable<RespuestaGastos> {
    const sesion = this.auth.obtenerSesion();
    if (!sesion) {
      return of({
        exito: false,
        mensaje: 'Inicia sesión para ver tus gastos.',
        gastos: []
      });
    }

    const clave = `gastos_${sesion.id_usuario}_${anio}`;

    if (!this.network.estaOnline) {
      const guardado = this.cache.obtener<RespuestaGastos>(clave);
      if (guardado) {
        return of({ ...guardado, desdeCache: true });
      }
      return of({
        exito: false,
        mensaje: 'Sin conexión y sin datos guardados de este año.',
        gastos: []
      });
    }

    const params = new HttpParams()
      .set('anio', anio.toString())
      .set('id_usuario', sesion.id_usuario.toString());

    return this.http
      .get<RespuestaGastos>(`${this.baseUrl}/gastos/por_mes.php`, { params })
      .pipe(
        tap(resp => {
          if (resp.exito) {
            this.cache.guardar(clave, resp, TTL_CACHE_MS);
          }
        }),
        catchError((error): Observable<RespuestaGastos> => {
          // Si la API falla, se muestra la última copia guardada (si existe)
          const guardado = this.cache.obtener<RespuestaGastos>(clave);
          if (guardado) {
            return of({ ...guardado, desdeCache: true });
          }
          const info = this.errorHandler.interpretar(error);
          return of({ exito: false, mensaje: info.mensaje, gastos: [] });
        })
      );
  }
}
