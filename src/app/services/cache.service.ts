import { Injectable } from '@angular/core';

export interface EntradaCache<T> {
  datos: T;
  guardadoEn: number;   // timestamp ms
  ttlMs: number;        // time-to-live in ms
}

/**
 * CacheService – lightweight key/value cache backed by localStorage.
 * Entries expire automatically after their TTL.
 *
 * Default TTL: 5 minutes.
 */
@Injectable({
  providedIn: 'root'
})
export class CacheService {

  private readonly PREFIJO = 'wr_cache_';
  private readonly TTL_DEFAULT_MS = 5 * 60 * 1000; // 5 min

  // ───────────────────────── write ─────────────────────────

  /** Stores a value in cache with the given TTL (default 5 min). */
  guardar<T>(clave: string, datos: T, ttlMs = this.TTL_DEFAULT_MS): void {
    const entrada: EntradaCache<T> = {
      datos,
      guardadoEn: Date.now(),
      ttlMs
    };
    try {
      localStorage.setItem(this.PREFIJO + clave, JSON.stringify(entrada));
    } catch {
      // localStorage might be full or unavailable – fail silently
    }
  }

  // ───────────────────────── read ──────────────────────────

  /**
   * Retrieves a cached value.
   * Returns `null` when the entry is missing or expired.
   */
  obtener<T>(clave: string): T | null {
    try {
      const raw = localStorage.getItem(this.PREFIJO + clave);
      if (!raw) { return null; }

      const entrada: EntradaCache<T> = JSON.parse(raw);
      const edad = Date.now() - entrada.guardadoEn;

      if (edad > entrada.ttlMs) {
        this.eliminar(clave);
        return null;
      }

      return entrada.datos;
    } catch {
      return null;
    }
  }

  /** Returns true when the key exists and has not expired. */
  tieneCache(clave: string): boolean {
    return this.obtener(clave) !== null;
  }

  // ───────────────────────── delete ────────────────────────

  eliminar(clave: string): void {
    localStorage.removeItem(this.PREFIJO + clave);
  }

  /** Removes all cache entries created by this service. */
  limpiarTodo(): void {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(this.PREFIJO)) { keys.push(k); }
    }
    keys.forEach(k => localStorage.removeItem(k));
  }
}

