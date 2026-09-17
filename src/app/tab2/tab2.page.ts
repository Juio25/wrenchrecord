import { Component, NgZone } from '@angular/core';
import { UsuariosService, FiltrosConsulta, UsuarioResultado } from '../services/usuarios.service';

@Component({
  selector: 'app-consulta',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  standalone: false
})
export class ConsultaPage {

  filtros: FiltrosConsulta = {
    nombre: '',
    apellido: '',
    correo: '',
    idUsuario: ''
  };

  resultados: UsuarioResultado[] = [];
  cargando: boolean = false;
  seHaConsultado: boolean = false;

  // Mensaje de error a nivel de consulta (ej. "ingresa al menos un
  // filtro" o problemas de conexión). No es un error por usuario,
  // sino de la búsqueda en sí.
  errorConsulta: string | null = null;

  constructor(
    private usuariosService: UsuariosService,
    private ngZone: NgZone
  ) {}

  onConsultar(): void {
    if (this.cargando) {
      return;
    }

    const { nombre, apellido, correo, idUsuario } = this.filtros;

    if (!nombre.trim() && !apellido.trim() && !correo.trim() && !idUsuario.trim()) {
      this.errorConsulta = 'Ingresa al menos un filtro para realizar la consulta.';
      this.resultados = [];
      return;
    }

    this.cargando = true;
    this.errorConsulta = null;

    this.usuariosService.consultar(this.filtros).subscribe({
      next: (respuesta) => {
        // Forzamos que esto corra dentro de la zona de Angular, igual
        // que en tab1, para que la vista se actualice de inmediato.
        this.ngZone.run(() => {
          this.cargando = false;
          this.seHaConsultado = true;

          if (respuesta.exito) {
            this.resultados = respuesta.usuarios;
          } else {
            this.resultados = [];
            this.errorConsulta = respuesta.mensaje;
          }
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          this.cargando = false;
          this.seHaConsultado = true;
          this.resultados = [];
          this.errorConsulta = error?.error?.mensaje
            || 'No se pudo conectar con el servidor. Verifica que XAMPP esté corriendo.';
        });
      }
    });
  }

  limpiarFiltros(): void {
    this.filtros = {
      nombre: '',
      apellido: '',
      correo: '',
      idUsuario: ''
    };
    this.resultados = [];
    this.seHaConsultado = false;
    this.errorConsulta = null;
  }

}
