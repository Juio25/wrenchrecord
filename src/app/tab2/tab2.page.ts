import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
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
  errorConsulta: string | null = null;
  desdeCache: boolean = false;   // true when results come from local cache

  constructor(
    private usuariosService: UsuariosService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
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
        this.ngZone.run(() => {
          this.cargando = false;
          this.seHaConsultado = true;
          this.desdeCache = !!respuesta.desdeCahe;

          if (respuesta.exito) {
            this.resultados = respuesta.usuarios;
          } else {
            this.resultados = [];
            this.errorConsulta = respuesta.mensaje;
          }

          // Sin esto, si la app corre en modo zoneless, esta pantalla
          // se queda "cargando" para siempre — nada más en tab2
          // dispara un ciclo de detección de cambios por su cuenta.
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          this.cargando = false;
          this.seHaConsultado = true;
          this.resultados = [];
          this.desdeCache = false;
          this.errorConsulta = error?.error?.mensaje
            || 'No se pudo conectar con el servidor. Verifica la IP configurada en el login y que XAMPP esté corriendo.';
          this.cdr.detectChanges();
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
    this.desdeCache = false;
  }

}
