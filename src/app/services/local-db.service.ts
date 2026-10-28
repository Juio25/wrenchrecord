import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

// ==================== TIPOS ====================

export type TipoRegistro = 'servicio' | 'modificacion';
export type EstadoRegistro = 'pendiente' | 'sincronizado' | 'rechazado';

export interface RegistroLocal {
  idLocal: number;
  tipo: TipoRegistro;
  payload: string;            // JSON de lo que se enviará a la API
  estado: EstadoRegistro;
  idRemoto: number | null;    // id en MySQL cuando ya se sincronizó
  creadoEn: string;
  ultimoError: string | null;
}

export interface FotoLocal {
  idFoto: number;
  idLocal: number;
  ruta: string;               // archivo dentro del almacenamiento privado de la app
  creadoEn: string;
}

/** Lo mínimo que se usa de SQLiteDBConnection (así se puede probar sin el celular). */
export interface ConexionSql {
  execute(statements: string): Promise<unknown>;
  run(statement: string, values?: any[]): Promise<{ changes?: { lastId?: number } }>;
  query(statement: string, values?: any[]): Promise<{ values?: any[] }>;
}

// ==================== ESQUEMA ====================

const NOMBRE_BD = 'autolog';

export const ESQUEMA_SQLITE = `
CREATE TABLE IF NOT EXISTS registros (
  id_local     INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo         TEXT NOT NULL,
  payload      TEXT NOT NULL,
  estado       TEXT NOT NULL DEFAULT 'pendiente',
  id_remoto    INTEGER,
  creado_en    TEXT NOT NULL,
  ultimo_error TEXT
);
CREATE TABLE IF NOT EXISTS fotos (
  id_foto   INTEGER PRIMARY KEY AUTOINCREMENT,
  id_local  INTEGER NOT NULL,
  ruta      TEXT NOT NULL,
  creado_en TEXT NOT NULL,
  FOREIGN KEY (id_local) REFERENCES registros (id_local) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_registros_estado ON registros (estado);
CREATE INDEX IF NOT EXISTS idx_fotos_local ON fotos (id_local);
`;

// ==================== RESPALDO PARA EL NAVEGADOR ====================

interface AlmacenWeb {
  seqRegistro: number;
  seqFoto: number;
  registros: RegistroLocal[];
  fotos: FotoLocal[];
}

const CLAVE_WEB = 'autolog_local_db';

/**
 * LocalDbService – base de datos local de la app.
 *
 *  - En el celular o emulador (Android) usa SQLite de verdad
 *    (@capacitor-community/sqlite).
 *  - En el navegador (ionic serve) SQLite no está disponible sin configurar un
 *    componente extra, así que se usa un respaldo en localStorage con la misma
 *    interfaz. Sirve solo para desarrollar; la evidencia debe hacerse en el celular.
 *
 * Guarda dos cosas: los registros (servicios/modificaciones) que se capturan en el
 * celular, con su estado de sincronización, y las rutas de las fotos locales.
 */
@Injectable({
  providedIn: 'root'
})
export class LocalDbService {

  private readonly sqlite = new SQLiteConnection(CapacitorSQLite);
  private db?: ConexionSql;
  private listo?: Promise<void>;

  /** true si se está usando SQLite real (celular), false con el respaldo web. */
  get usaSqlite(): boolean {
    return !!this.db;
  }

  /** Abre la base y crea las tablas. Es seguro llamarlo muchas veces. */
  init(): Promise<void> {
    if (!this.listo) {
      this.listo = this.abrir().catch(error => {
        this.listo = undefined;   // permite reintentar
        throw error;
      });
    }
    return this.listo;
  }

  private async abrir(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;   // navegador: se usa el respaldo en localStorage
    }

    const consistente = (await this.sqlite.checkConnectionsConsistency()).result;
    const existe = (await this.sqlite.isConnection(NOMBRE_BD, false)).result;

    const conexion = (consistente && existe)
      ? await this.sqlite.retrieveConnection(NOMBRE_BD, false)
      : await this.sqlite.createConnection(NOMBRE_BD, false, 'no-encryption', 1, false);

    await conexion.open();
    await conexion.execute(ESQUEMA_SQLITE);
    this.db = conexion;
  }

  // ==================== REGISTROS ====================

  async insertarRegistro(tipo: TipoRegistro, payload: object): Promise<number> {
    await this.init();
    const creadoEn = new Date().toISOString();
    const json = JSON.stringify(payload);

    if (this.db) {
      const r = await this.db.run(
        'INSERT INTO registros (tipo, payload, estado, creado_en) VALUES (?, ?, ?, ?)',
        [tipo, json, 'pendiente', creadoEn]
      );
      const id = r.changes?.lastId;
      if (id === undefined) {
        throw new Error('SQLite no devolvió el id del registro.');
      }
      return id;
    }

    const s = this.leerWeb();
    const idLocal = ++s.seqRegistro;
    s.registros.push({
      idLocal, tipo, payload: json, estado: 'pendiente', idRemoto: null, creadoEn, ultimoError: null
    });
    this.guardarWeb(s);
    return idLocal;
  }

  async listarPendientes(): Promise<RegistroLocal[]> {
    await this.init();

    if (this.db) {
      const r = await this.db.query(
        `SELECT id_local, tipo, payload, estado, id_remoto, creado_en, ultimo_error
         FROM registros WHERE estado = 'pendiente' ORDER BY id_local`
      );
      return (r.values ?? []).map(fila => ({
        idLocal: fila.id_local,
        tipo: fila.tipo,
        payload: fila.payload,
        estado: fila.estado,
        idRemoto: fila.id_remoto ?? null,
        creadoEn: fila.creado_en,
        ultimoError: fila.ultimo_error ?? null
      }));
    }

    return this.leerWeb().registros
      .filter(r => r.estado === 'pendiente')
      .sort((a, b) => a.idLocal - b.idLocal);
  }

  async contarPendientes(): Promise<number> {
    await this.init();

    if (this.db) {
      const r = await this.db.query(`SELECT COUNT(*) AS total FROM registros WHERE estado = 'pendiente'`);
      return Number(r.values?.[0]?.total ?? 0);
    }

    return this.leerWeb().registros.filter(r => r.estado === 'pendiente').length;
  }

  async marcarSincronizado(idLocal: number, idRemoto: number): Promise<void> {
    await this.init();

    if (this.db) {
      await this.db.run(
        `UPDATE registros SET estado = 'sincronizado', id_remoto = ?, ultimo_error = NULL WHERE id_local = ?`,
        [idRemoto, idLocal]
      );
      return;
    }

    const s = this.leerWeb();
    const r = s.registros.find(x => x.idLocal === idLocal);
    if (r) {
      r.estado = 'sincronizado';
      r.idRemoto = idRemoto;
      r.ultimoError = null;
      this.guardarWeb(s);
    }
  }

  async marcarRechazado(idLocal: number, motivo: string): Promise<void> {
    await this.init();

    if (this.db) {
      await this.db.run(
        `UPDATE registros SET estado = 'rechazado', ultimo_error = ? WHERE id_local = ?`,
        [motivo, idLocal]
      );
      return;
    }

    const s = this.leerWeb();
    const r = s.registros.find(x => x.idLocal === idLocal);
    if (r) {
      r.estado = 'rechazado';
      r.ultimoError = motivo;
      this.guardarWeb(s);
    }
  }

  // ==================== FOTOS ====================

  async agregarFoto(idLocal: number, ruta: string): Promise<void> {
    await this.init();
    const creadoEn = new Date().toISOString();

    if (this.db) {
      await this.db.run('INSERT INTO fotos (id_local, ruta, creado_en) VALUES (?, ?, ?)', [idLocal, ruta, creadoEn]);
      return;
    }

    const s = this.leerWeb();
    s.fotos.push({ idFoto: ++s.seqFoto, idLocal, ruta, creadoEn });
    this.guardarWeb(s);
  }

  async fotosDeRegistro(idLocal: number): Promise<FotoLocal[]> {
    await this.init();

    if (this.db) {
      const r = await this.db.query(
        'SELECT id_foto, id_local, ruta, creado_en FROM fotos WHERE id_local = ? ORDER BY id_foto',
        [idLocal]
      );
      return (r.values ?? []).map(f => ({
        idFoto: f.id_foto, idLocal: f.id_local, ruta: f.ruta, creadoEn: f.creado_en
      }));
    }

    return this.leerWeb().fotos.filter(f => f.idLocal === idLocal);
  }

  /**
   * Cuántas fotos locales tiene cada registro YA sincronizado.
   * Devuelve { idRemoto: cantidad }; sirve para el contador del historial del Dashboard.
   */
  async contarFotosPorRemoto(tipo: TipoRegistro, idsRemotos: number[]): Promise<Record<number, number>> {
    if (idsRemotos.length === 0) {
      return {};
    }
    await this.init();
    const resultado: Record<number, number> = {};

    if (this.db) {
      const marcas = idsRemotos.map(() => '?').join(', ');
      const r = await this.db.query(
        `SELECT r.id_remoto AS id_remoto, COUNT(f.id_foto) AS total
         FROM registros r
         JOIN fotos f ON f.id_local = r.id_local
         WHERE r.tipo = ? AND r.estado = 'sincronizado' AND r.id_remoto IN (${marcas})
         GROUP BY r.id_remoto`,
        [tipo, ...idsRemotos]
      );
      (r.values ?? []).forEach(fila => { resultado[Number(fila.id_remoto)] = Number(fila.total); });
      return resultado;
    }

    const s = this.leerWeb();
    s.registros
      .filter(r => r.tipo === tipo && r.estado === 'sincronizado' && r.idRemoto !== null && idsRemotos.includes(r.idRemoto))
      .forEach(r => {
        const total = s.fotos.filter(f => f.idLocal === r.idLocal).length;
        if (total > 0) {
          resultado[r.idRemoto as number] = total;
        }
      });
    return resultado;
  }

  // ==================== USO INTERNO ====================

  /** Solo para pruebas: inyecta una conexión SQL ya abierta. */
  usarConexion(conexion: ConexionSql): void {
    this.db = conexion;
    this.listo = Promise.resolve();
  }

  private leerWeb(): AlmacenWeb {
    try {
      const crudo = localStorage.getItem(CLAVE_WEB);
      if (crudo) {
        return JSON.parse(crudo) as AlmacenWeb;
      }
    } catch {
      // datos dañados: se empieza de cero
    }
    return { seqRegistro: 0, seqFoto: 0, registros: [], fotos: [] };
  }

  private guardarWeb(almacen: AlmacenWeb): void {
    localStorage.setItem(CLAVE_WEB, JSON.stringify(almacen));
  }
}
