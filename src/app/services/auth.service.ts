import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError } from 'rxjs';
import { ConfigService } from './config.service';
import { NetworkService } from './network.service';
import { ErrorHandlerService } from './error-handler.service';

export interface RegistroUsuario {
  nombre: string;
  apellido: string;
  correo: string;
  contrasena: string;
}

export interface LoginUsuario {
  correo: string;
  contrasena: string;
}

export interface UsuarioSesion {
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
}

export interface RespuestaApi {
  exito: boolean;
  mensaje: string;
  id_usuario?: number;
}

export interface RespuestaLogin {
  exito: boolean;
  mensaje: string;
  usuario?: UsuarioSesion;
}

const CLAVE_SESION = 'autolog_usuario';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // La URL base ya no está fija: se toma de ConfigService, que lee la IP
  // que el usuario capturó en el login (guardada en persistencia).
  constructor(
    private http: HttpClient,
    private config: ConfigService,
    private network: NetworkService,
    private errorHandler: ErrorHandlerService
  ) {}

  private get baseUrl(): string {
    return this.config.apiUrl;
  }

  registrar(datos: RegistroUsuario): Observable<RespuestaApi> {
    if (!this.network.estaOnline) {
      return of({ exito: false, mensaje: 'Sin conexión. No se puede crear la cuenta ahora.' });
    }
    return this.http.post<RespuestaApi>(`${this.baseUrl}/usuarios/registrar.php`, datos).pipe(
      catchError(error => {
        const info = this.errorHandler.interpretar(error);
        return of({ exito: false, mensaje: info.mensaje });
      })
    );
  }

  login(datos: LoginUsuario): Observable<RespuestaLogin> {
    if (!this.network.estaOnline) {
      return of({ exito: false, mensaje: 'Sin conexión. Verifica tu red e inténtalo de nuevo.' });
    }
    return this.http.post<RespuestaLogin>(`${this.baseUrl}/usuarios/login.php`, datos).pipe(
      tap((respuesta) => {
        if (respuesta.exito && respuesta.usuario) {
          this.guardarSesion(respuesta.usuario);
        }
      }),
      catchError(error => {
        const info = this.errorHandler.interpretar(error);
        return of({ exito: false, mensaje: info.mensaje });
      })
    );
  }

  guardarSesion(usuario: UsuarioSesion): void {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(usuario));
  }

  obtenerSesion(): UsuarioSesion | null {
    const datos = localStorage.getItem(CLAVE_SESION);
    return datos ? JSON.parse(datos) : null;
  }

  haySesionActiva(): boolean {
    return this.obtenerSesion() !== null;
  }

  cerrarSesion(): void {
    localStorage.removeItem(CLAVE_SESION);
  }
}
