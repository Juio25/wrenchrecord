import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ConfigService } from './config.service';
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
}

// ==================== SERVICIO ====================

@Injectable({
  providedIn: 'root'
})
export class GastosService {

  constructor(
    private http: HttpClient,
    private config: ConfigService,
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

    if (!this.network.estaOnline) {
      return of({
        exito: false,
        mensaje: 'Sin conexión. No se pueden cargar los gastos ahora.',
        gastos: []
      });
    }

    const params = new HttpParams()
      .set('anio', anio.toString())
      .set('id_usuario', sesion.id_usuario.toString());

    return this.http
      .get<RespuestaGastos>(`${this.baseUrl}/gastos/por_mes.php`, { params })
      .pipe(
        catchError(error => {
          const info = this.errorHandler.interpretar(error);
          return of({ exito: false, mensaje: info.mensaje, gastos: [] });
        })
      );
  }
}
