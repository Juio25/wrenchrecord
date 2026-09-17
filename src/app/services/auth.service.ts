import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

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

  // La API vive dentro de htdocs de XAMPP, en local.
  // Ajusta esta URL según dónde estés corriendo la app:
  //   - Navegador / "ionic serve"      -> http://localhost/wrenchrecord-api
  //   - Emulador de Android            -> http://10.0.2.2/wrenchrecord-api
  //   - Dispositivo físico (misma red) -> http://<IP-de-tu-PC-en-la-red>/wrenchrecord-api
  private baseUrl = 'http://127.0.0.1/wrenchrecord-api';

  constructor(private http: HttpClient) {}

  registrar(datos: RegistroUsuario): Observable<RespuestaApi> {
    return this.http.post<RespuestaApi>(`${this.baseUrl}/usuarios/registrar.php`, datos);
  }

  login(datos: LoginUsuario): Observable<RespuestaLogin> {
    return this.http.post<RespuestaLogin>(`${this.baseUrl}/usuarios/login.php`, datos).pipe(
      tap((respuesta) => {
        if (respuesta.exito && respuesta.usuario) {
          this.guardarSesion(respuesta.usuario);
        }
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
