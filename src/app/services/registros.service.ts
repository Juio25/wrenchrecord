import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { ConfigService } from './config.service';
import { NetworkService } from './network.service';
import { LocalDbService, TipoRegistro } from './local-db.service';

// ==================== INTERFACES ====================

export interface PiezaPayload {
  nombre: string;
  cantidad: number;
  costo_unitario: number;
}

/** Lo que recibe la API en POST /registros/crear.php */
export interface PayloadRegistro {
  tipo: TipoRegistro;
  id_usuario: number;
  id_vehiculo: number;
  nombre: string;
  fecha: string;                 // AAAA-MM-DD
  kilometraje?: number | null;   // solo servicio
  realizado_por?: string | null; // solo servicio
  categoria?: string | null;     // solo modificación
  estado?: string;               // solo modificación
  costo_mano_obra?: number | null;
  notas?: string | null;
  refacciones: PiezaPayload[];
}

interface RespuestaCrear {
  exito: boolean;
  mensaje: string;
  id_registro?: number;
  tipo?: TipoRegistro;
  costo_total?: number | null;
}

export interface ResultadoGuardado {
  idLocal: number;
  sincronizado: boolean;   // true = ya está en el servidor
  rechazado: boolean;      // true = el servidor lo rechazó
  mensaje: string;
}

type ResultadoEnvio =
  | { estado: 'ok' }
  | { estado: 'rechazado'; mensaje: string }
  | { estado: 'sin_conexion' };

// ==================== SERVICIO ====================

/**
 * RegistrosService – guarda servicios y modificaciones con enfoque "local primero":
 *
 *  1. Todo registro se escribe primero en SQLite (estado "pendiente").
 *  2. Si hay Internet se envía de inmediato a la API (POST) y se marca "sincronizado".
 *  3. Si no hay Internet, se queda pendiente y se envía solo cuando regresa la conexión.
 */
@Injectable({
  providedIn: 'root'
})
export class RegistrosService {

  private readonly _pendientes$ = new BehaviorSubject<number>(0);

  /** Cuántos registros están esperando conexión para enviarse. */
  readonly pendientes$: Observable<number> = this._pendientes$.asObservable();

  private sincronizando = false;

  constructor(
    private http: HttpClient,
    private config: ConfigService,
    private network: NetworkService,
    private db: LocalDbService
  ) {
    // Recuperación de conexión: al volver el Internet se envía lo pendiente
    this.network.reconectado$.subscribe(() => { void this.sincronizarPendientes(); });
    void this.refrescarPendientes();
  }

  // ---------- Guardar ----------

  async guardar(payload: PayloadRegistro, rutasFotos: string[]): Promise<ResultadoGuardado> {
    const idLocal = await this.db.insertarRegistro(payload.tipo, payload);

    for (const ruta of rutasFotos) {
      await this.db.agregarFoto(idLocal, ruta);
    }
    await this.refrescarPendientes();

    const pendiente: ResultadoGuardado = {
      idLocal,
      sincronizado: false,
      rechazado: false,
      mensaje: 'Guardado en tu celular. Se enviará al servidor cuando regrese el Internet.'
    };

    if (!this.network.estaOnline) {
      return pendiente;
    }

    const envio = await this.enviar(idLocal, payload);
    await this.refrescarPendientes();

    switch (envio.estado) {
      case 'ok':
        return { idLocal, sincronizado: true, rechazado: false, mensaje: 'Registro guardado y sincronizado con el servidor.' };
      case 'rechazado':
        return { idLocal, sincronizado: false, rechazado: true, mensaje: envio.mensaje };
      default:
        return pendiente;
    }
  }

  // ---------- Sincronizar ----------

  /** Envía a la API todo lo que esté pendiente. Devuelve cuántos se enviaron. */
  async sincronizarPendientes(): Promise<number> {
    if (this.sincronizando || !this.network.estaOnline) {
      return 0;
    }

    this.sincronizando = true;
    let enviados = 0;

    try {
      const pendientes = await this.db.listarPendientes();

      for (const registro of pendientes) {
        const payload = JSON.parse(registro.payload) as PayloadRegistro;
        const envio = await this.enviar(registro.idLocal, payload);

        if (envio.estado === 'ok') {
          enviados++;
        } else if (envio.estado === 'sin_conexion') {
          break;   // sigue sin haber servidor: se reintenta después
        }
      }
    } catch {
      // un fallo local no debe romper la pantalla; se reintenta en la próxima ocasión
    } finally {
      this.sincronizando = false;
      await this.refrescarPendientes();
    }

    return enviados;
  }

  // ---------- Fotos en el historial ----------

  /** Suma las fotos locales al contador de fotos que vienen del servidor. */
  async conFotosLocales<T extends { id: number; fotos: number }>(items: T[]): Promise<T[]> {
    try {
      const locales = await this.db.contarFotosPorRemoto('servicio', items.map(i => i.id));
      return items.map(i => ({ ...i, fotos: i.fotos + (locales[i.id] ?? 0) }));
    } catch {
      return items;
    }
  }

  // ---------- Uso interno ----------

  private async enviar(idLocal: number, payload: PayloadRegistro): Promise<ResultadoEnvio> {
    try {
      const resp = await firstValueFrom(
        this.http.post<RespuestaCrear>(`${this.config.apiUrl}/registros/crear.php`, payload)
      );

      if (resp.exito && resp.id_registro !== undefined) {
        await this.db.marcarSincronizado(idLocal, resp.id_registro);
        return { estado: 'ok' };
      }

      await this.db.marcarRechazado(idLocal, resp.mensaje);
      return { estado: 'rechazado', mensaje: resp.mensaje };

    } catch (error) {
      // Solo se considera "rechazado" si la respuesta es un error de NUESTRA API
      // (JSON con exito:false). Cualquier otra cosa (sin red, servidor apagado,
      // ruta mal puesta) deja el registro pendiente para reintentar.
      if (error instanceof HttpErrorResponse
          && error.status >= 400 && error.status < 500
          && error.error && error.error.exito === false) {
        const motivo = String(error.error.mensaje ?? 'El servidor rechazó el registro.');
        await this.db.marcarRechazado(idLocal, motivo);
        return { estado: 'rechazado', mensaje: motivo };
      }
      return { estado: 'sin_conexion' };
    }
  }

  private async refrescarPendientes(): Promise<void> {
    try {
      this._pendientes$.next(await this.db.contarPendientes());
    } catch {
      this._pendientes$.next(0);
    }
  }
}
