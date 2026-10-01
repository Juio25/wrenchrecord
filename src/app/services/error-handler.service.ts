import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

export interface ErrorInfo {
  /** User-friendly message in Spanish */
  mensaje: string;
  /** Category so the UI can adjust its icon/color */
  tipo: 'red' | 'warning' | 'sin_datos' | 'desconocido';
}

/**
 * ErrorHandlerService – centralises the translation of raw HTTP /
 * runtime errors into consistent, user-friendly Spanish messages.
 *
 * All error paths in the app should call `interpretar()` and use the
 * returned `ErrorInfo` to display messages, rather than scattering
 * string literals across components.
 */
@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {

  /**
   * Converts any error (HttpErrorResponse, Error, unknown) into an
   * `ErrorInfo` with a friendly message and a semantic type.
   */
  interpretar(error: unknown): ErrorInfo {

    // ── Network / HTTP layer ────────────────────────────────────────
    if (error instanceof HttpErrorResponse) {

      // status 0 → no connection (network unreachable, CORS pre-flight, …)
      if (error.status === 0) {
        return {
          mensaje: 'Sin conexión al servidor. '
            + 'Verifica que estés en la misma red y que XAMPP esté corriendo.',
          tipo: 'red'
        };
      }

      if (error.status === 404) {
        return {
          mensaje: 'El recurso solicitado no fue encontrado en el servidor.',
          tipo: 'warning'
        };
      }

      if (error.status === 401 || error.status === 403) {
        return {
          mensaje: 'No tienes permiso para realizar esta acción. '
            + 'Inicia sesión nuevamente.',
          tipo: 'warning'
        };
      }

      if (error.status >= 500) {
        return {
          mensaje: 'Error interno del servidor. '
            + 'Contacta al administrador si el problema persiste.',
          tipo: 'red'
        };
      }

      // Any other HTTP error – use the body message if available
      const mensajeApi = (error.error as { mensaje?: string })?.mensaje;
      return {
        mensaje: mensajeApi ?? `Error del servidor (${error.status}).`,
        tipo: 'warning'
      };
    }

    // ── Generic JS Error ─────────────────────────────────────────────
    if (error instanceof Error) {
      return {
        mensaje: error.message || 'Ocurrió un error inesperado.',
        tipo: 'desconocido'
      };
    }

    // ── Fallback ─────────────────────────────────────────────────────
    return {
      mensaje: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
      tipo: 'desconocido'
    };
  }

  /**
   * Quick helper: returns true when the error looks like a network failure
   * (status 0 or no navigator.onLine) so callers can decide to fall back
   * to cached data.
   */
  esErrorDeRed(error: unknown): boolean {
    if (error instanceof HttpErrorResponse) {
      return error.status === 0;
    }
    return !navigator.onLine;
  }
}

