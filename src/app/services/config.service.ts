import { Injectable } from '@angular/core';

/**
 * Cadena de conexión al origen de datos (servidor donde corre XAMPP).
 * Se guarda en localStorage para que sobreviva al cierre de la app
 * y para que todos los servicios lean el mismo valor de forma dinámica.
 */
export interface CadenaConexion {
  host: string;        // IP o nombre de host del servidor (ej. 192.168.1.50)
  puertoApi: number;   // Apache/XAMPP (por defecto 80)
  puertoBd: number;    // MySQL (por defecto 3306)
  rutaApi: string;     // carpeta de la API dentro de htdocs
}

const CLAVE_CONEXION = 'autolog_conexion';

const CONEXION_POR_DEFECTO: CadenaConexion = {
  host: '',
  puertoApi: 80,
  puertoBd: 3306,
  rutaApi: 'wrenchrecord-api'
};

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  private conexion: CadenaConexion = this.leer();

  /** IP / host guardado ('' si todavía no se ha configurado). */
  get host(): string {
    return this.conexion.host;
  }

  /** ¿Ya hay una IP guardada? */
  get configurado(): boolean {
    return this.conexion.host.trim().length > 0;
  }

  /** URL base de la API, ej. http://192.168.1.50:80/wrenchrecord-api */
  get apiUrl(): string {
    const { host, puertoApi, rutaApi } = this.conexion;
    return `http://${host}:${puertoApi}/${rutaApi}`;
  }

  /** Cadena de conexión a MySQL (informativa: la conexión real la hace el PHP). */
  get cadenaBd(): string {
    const { host, puertoBd } = this.conexion;
    return `mysql://${host}:${puertoBd}`;
  }

  /** Valida IPv4 (0-255) o un nombre de host simple (localhost, mi-pc, etc.). */
  esHostValido(valor: string): boolean {
    const v = (valor || '').trim();
    if (!v) {
      return false;
    }
    const ipv4 = /^((25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(25[0-5]|2[0-4]\d|1?\d?\d)$/;
    const hostname = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
    return ipv4.test(v) || hostname.test(v);
  }

  /** Guarda la IP / host en persistencia. */
  guardarHost(host: string): void {
    this.conexion = { ...this.conexion, host: host.trim() };
    try {
      localStorage.setItem(CLAVE_CONEXION, JSON.stringify(this.conexion));
    } catch {
      // Si el almacenamiento no está disponible, se conserva solo en memoria.
    }
  }

  private leer(): CadenaConexion {
    try {
      const datos = localStorage.getItem(CLAVE_CONEXION);
      if (datos) {
        return { ...CONEXION_POR_DEFECTO, ...JSON.parse(datos) };
      }
    } catch {
      // JSON corrupto o sin acceso a localStorage: se usan los valores por defecto.
    }
    return { ...CONEXION_POR_DEFECTO };
  }
}
