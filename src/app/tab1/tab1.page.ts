import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, RegistroUsuario, LoginUsuario } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
  standalone: false
})
export class LoginPage {

  isRegister: boolean = false;

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
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

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

    this.enviandoLogin = true;

    this.authService.login(this.login).subscribe({
      next: (respuesta) => {
        this.ngZone.run(() => {
          this.enviandoLogin = false;
          this.mostrarResultado('login', respuesta.exito, respuesta.mensaje);
          // Forzamos el repintado explícitamente: si la app corre en
          // modo zoneless, nada más va a avisarle a Angular que estos
          // valores cambiaron.
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          this.enviandoLogin = false;
          const mensaje = error?.error?.mensaje
            || 'No se pudo conectar con el servidor. Verifica que XAMPP esté corriendo.';
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
            || 'No se pudo conectar con el servidor. Verifica que XAMPP esté corriendo.';
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
      // TODO: ajusta esta ruta a la de tu tab de dashboard real
      this.router.navigateByUrl('/tabs/tab3');
    }

    this.modalAccion = null;
    this.cdr.detectChanges();
  }

}
