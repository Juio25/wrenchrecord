import { Component, ChangeDetectorRef, NgZone, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AlertController, LoadingController, ToastController } from '@ionic/angular/lazy';
import { UsuariosService, FiltrosConsulta, UsuarioResultado } from '../services/usuarios.service';
import { NetworkService } from '../services/network.service';

@Component({
  selector: 'app-consulta',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  standalone: false
})
export class ConsultaPage implements OnInit, OnDestroy {

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

  private ultimosFiltros: FiltrosConsulta | null = null;   // para re-consultar al reconectar
  private subReconexion?: Subscription;

  constructor(
    private usuariosService: UsuariosService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private network: NetworkService
  ) {}

  ngOnInit(): void {
    // Recuperación de conexión: al volver el Internet se repite la última consulta
    this.subReconexion = this.network.reconectado$.subscribe(() => this.sincronizarAlReconectar());
  }

  ngOnDestroy(): void {
    this.subReconexion?.unsubscribe();
  }

  /** Vuelve a pedir al servidor la última consulta y refresca la copia local. */
  private sincronizarAlReconectar(): void {
    if (!this.ultimosFiltros || this.cargando) {
      return;
    }

    this.usuariosService.consultar(this.ultimosFiltros).subscribe(respuesta => {
      this.ngZone.run(() => {
        this.desdeCache = !!respuesta.desdeCahe;
        if (respuesta.exito) {
          this.resultados = respuesta.usuarios;
          this.errorConsulta = null;
          if (!this.desdeCache) {
            this.mostrarToast('Datos sincronizados con el servidor.', 'success');
          }
        }
        this.cdr.detectChanges();
      });
    });
  }

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
    this.ultimosFiltros = { ...this.filtros };

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

  // =========================================================
  //  PUT  — Editar usuario (actualizar.php)
  // =========================================================

  async onEditar(usuario: UsuarioResultado): Promise<void> {
    const alerta = await this.alertCtrl.create({
      header: 'Editar usuario',
      subHeader: `ID: ${usuario.id_usuario}`,
      inputs: [
        { name: 'nombre',   type: 'text',  value: usuario.nombre,   placeholder: 'Nombre' },
        { name: 'apellido', type: 'text',  value: usuario.apellido, placeholder: 'Apellido' },
        { name: 'correo',   type: 'email', value: usuario.correo,   placeholder: 'Correo electrónico' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (datos) => {
            const nombre   = (datos.nombre   || '').trim();
            const apellido = (datos.apellido || '').trim();
            const correo   = (datos.correo   || '').trim();

            if (!nombre || !apellido || !correo) {
              this.mostrarToast('Completa nombre, apellido y correo.', 'warning');
              return false;                       // mantiene la alerta abierta
            }
            if (!correo.includes('@')) {
              this.mostrarToast('Escribe un correo válido.', 'warning');
              return false;
            }

            this.guardarCambios(usuario, { nombre, apellido, correo });
            return true;
          }
        }
      ]
    });

    await alerta.present();
  }

  private async guardarCambios(
    usuario: UsuarioResultado,
    cambios: { nombre: string; apellido: string; correo: string }
  ): Promise<void> {

    const loading = await this.loadingCtrl.create({
      message: 'Guardando cambios...',
      spinner: 'crescent'
    });
    await loading.present();

    this.usuariosService.actualizar({
      id_usuario: usuario.id_usuario,
      ...cambios
    }).subscribe({
      next: async (resp) => {
        await loading.dismiss();
        this.ngZone.run(() => {
          if (resp.exito) {
            this.resultados = this.resultados.map(u =>
              u.id_usuario === usuario.id_usuario ? { ...u, ...cambios } : u
            );
          }
          this.cdr.detectChanges();
        });
        this.mostrarToast(resp.mensaje, resp.exito ? 'success' : 'danger');
      },
      error: async () => {
        await loading.dismiss();
        this.mostrarToast('No se pudo conectar con el servidor.', 'danger');
      }
    });
  }

  // =========================================================
  //  DELETE — Eliminar usuario (eliminar.php, baja lógica)
  // =========================================================

  async onEliminar(usuario: UsuarioResultado): Promise<void> {
    const alerta = await this.alertCtrl.create({
      header: 'Eliminar usuario',
      message: `¿Seguro que quieres eliminar a ${usuario.nombre} ${usuario.apellido}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => { this.confirmarEliminar(usuario); }
        }
      ]
    });

    await alerta.present();
  }

  private async confirmarEliminar(usuario: UsuarioResultado): Promise<void> {

    const loading = await this.loadingCtrl.create({
      message: 'Eliminando usuario...',
      spinner: 'crescent'
    });
    await loading.present();

    this.usuariosService.eliminar(usuario.id_usuario).subscribe({
      next: async (resp) => {
        await loading.dismiss();
        this.ngZone.run(() => {
          if (resp.exito) {
            // El backend hace baja lógica (activo = 0): se refleja en la lista
            this.resultados = this.resultados.map(u =>
              u.id_usuario === usuario.id_usuario ? { ...u, activo: 0 } : u
            );
          }
          this.cdr.detectChanges();
        });
        this.mostrarToast(resp.mensaje, resp.exito ? 'success' : 'danger');
      },
      error: async () => {
        await loading.dismiss();
        this.mostrarToast('No se pudo conectar con el servidor.', 'danger');
      }
    });
  }

  // =========================================================
  //  Mensajes al usuario
  // =========================================================

  private async mostrarToast(
    mensaje: string,
    color: 'success' | 'danger' | 'warning'
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2800,
      position: 'bottom',
      color
    });
    await toast.present();
  }

}
