import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { ConfigService } from '../services/config.service';
import { AuthService, RegistroUsuario, LoginUsuario } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage {

  isRegister: boolean = false;

  // IP / host del origen de datos (XAMPP: API en puerto 80, MySQL en 3306)
  servidorHost: string = '';

  enviandoLogin: boolean = false;
  enviandoRegistro: boolean = false;

  login: LoginUsuario = {
    correo: '',
    contrasena: ''
  };

  registro: RegistroUsuario = {
    nombre: '',
    apellido: '',
    correo: '',
    contrasena: ''
  };

  // Estado del modal de resultado (éxito / error)
  mostrarModal: boolean = false;
  modalExito: boolean = false;
  modalMensaje: string = '';

  // Distingue si el modal actual corresponde al login o al registro,
  // para saber qué hacer cuando el usuario lo cierra.
  private modalAccion: 'login' | 'registro' | null = null;

  constructor(
    private authService: AuthService,
    private config: ConfigService,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ionViewWillEnter(): void {
    // Precarga la IP guardada la última vez
    this.servidorHost = this.config.host;
    this.cdr.detectChanges();
  }

  get puertoApi(): number { return 80; }
  get puertoBd(): number { return 3306; }

  /** Guarda la IP en persistencia. Devuelve false (y muestra el modal) si es inválida. */
  private guardarServidor(accion: 'login' | 'registro'): boolean {
    if (!this.config.esHostValido(this.servidorHost)) {
      this.mostrarResultado(accion, false, 'Ingresa una IP válida del servidor (ej. 192.168.1.50).');
      return false;
    }
    this.config.guardarHost(this.servidorHost);
    return true;
  }

  onServidorChange(): void {
    if (this.config.esHostValido(this.servidorHost)) {
      this.config.guardarHost(this.servidorHost);
    }
  }

  toggleForm(): void {
    this.isRegister = !this.isRegister;
  }

  // ==================== LOGIN ====================

  onLogin(): void {
    if (this.enviandoLogin) {
      return;
    }

    const { correo, contrasena } = this.login;

    if (!correo || !contrasena) {
      this.mostrarResultado('login', false, 'Ingresa tu correo y contraseña.');
      return;
    }

    if (!this.guardarServidor('login')) {
      return;
    }

    this.enviandoLogin = true;

    this.authService.login(this.login).subscribe({
      next: (respuesta) => {
        this.ngZone.run(() => {
          this.enviandoLogin = false;
          this.mostrarResultado('login', respuesta.exito, respuesta.mensaje);
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          this.enviandoLogin = false;
          const mensaje = error?.error?.mensaje
            || 'No se pudo conectar con el servidor. Verifica la IP y que XAMPP esté corriendo.';
          this.mostrarResultado('login', false, mensaje);
          this.cdr.detectChanges();
        });
      }
    });
  }

  // ==================== REGISTRO ====================

  onRegistrar(): void {
    if (this.enviandoRegistro) {
      return;
    }

    const { nombre, apellido, correo, contrasena } = this.registro;

    if (!nombre || !apellido || !correo || !contrasena) {
      this.mostrarResultado('registro', false, 'Completa todos los campos para crear tu cuenta.');
      return;
    }

    if (!this.guardarServidor('registro')) {
      return;
    }

    this.enviandoRegistro = true;

    this.authService.registrar(this.registro).subscribe({
      next: (respuesta) => {
        this.ngZone.run(() => {
          this.enviandoRegistro = false;
          this.mostrarResultado('registro', respuesta.exito, respuesta.mensaje);

          if (respuesta.exito) {
            this.registro = { nombre: '', apellido: '', correo: '', contrasena: '' };
            this.isRegister = false; // regresa a la cara de login tras crear la cuenta
          }

          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          this.enviandoRegistro = false;
          const mensaje = error?.error?.mensaje
            || 'No se pudo conectar con el servidor. Verifica la IP y que XAMPP esté corriendo.';
          this.mostrarResultado('registro', false, mensaje);
          this.cdr.detectChanges();
        });
      }
    });
  }

  // ==================== MODAL ====================

  private mostrarResultado(accion: 'login' | 'registro', exito: boolean, mensaje: string): void {
    this.modalAccion = accion;
    this.modalExito = exito;
    this.modalMensaje = mensaje;
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;

    if (this.modalAccion === 'login' && this.modalExito) {
      this.login = { correo: '', contrasena: '' };
      // tab3 sigue viviendo dentro de ion-tabs, así que esta ruta no cambia
      this.router.navigateByUrl('/tabs/tab3');
    }

    this.modalAccion = null;
    this.cdr.detectChanges();
  }

}
