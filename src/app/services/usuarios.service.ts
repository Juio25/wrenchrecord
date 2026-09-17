import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

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

  // Misma API que ya usa el login/registro (vive en htdocs de XAMPP).
  // Ajusta según dónde corras la app:
  //   - Navegador / "ionic serve"      -> http://localhost/wrenchrecord-api
  //   - Emulador de Android            -> http://10.0.2.2/wrenchrecord-api
  //   - Dispositivo físico (misma red) -> http://<IP-de-tu-PC-en-la-red>/wrenchrecord-api
  private baseUrl = 'http://localhost/wrenchrecord-api';

  constructor(private http: HttpClient) {}

  // ---------- READ ----------
  consultar(filtros: FiltrosConsulta): Observable<RespuestaConsulta> {
    let params = new HttpParams();

    if (filtros.nombre?.trim()) {
      params = params.set('nombre', filtros.nombre.trim());
    }
    if (filtros.apellido?.trim()) {
      params = params.set('apellido', filtros.apellido.trim());
    }
    if (filtros.correo?.trim()) {
      params = params.set('correo', filtros.correo.trim());
    }
    if (filtros.idUsuario?.trim()) {
      params = params.set('idUsuario', filtros.idUsuario.trim());
    }

    return this.http.get<RespuestaConsulta>(`${this.baseUrl}/usuarios/consultar.php`, { params });
  }

  // ---------- UPDATE ----------
  actualizar(usuario: UsuarioActualizar): Observable<RespuestaOperacion> {
    return this.http.put<RespuestaOperacion>(`${this.baseUrl}/usuarios/actualizar.php`, usuario);
  }

  // ---------- DELETE ----------
  eliminar(idUsuario: number): Observable<RespuestaOperacion> {
    const params = new HttpParams().set('id_usuario', idUsuario.toString());
    return this.http.delete<RespuestaOperacion>(`${this.baseUrl}/usuarios/eliminar.php`, { params });
  }
}
