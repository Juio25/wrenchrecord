import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../services/auth.service';
import { DashboardService, Vehiculo } from '../services/dashboard.service';
import { RegistrosService, PayloadRegistro, PiezaPayload } from '../services/registros.service';
import { FotosLocalesService } from '../services/fotos-locales.service';
import { TipoRegistro } from '../services/local-db.service';
import { FotoEditorComponent } from '../shared/foto-editor/foto-editor.component';

interface PiezaForm {
  nombre: string;
  cantidad: number | null;
  costo: number | null;
}

interface FotoForm {
  ruta: string;    // archivo guardado en el celular
  vista: string;   // data URL para mostrar la miniatura
}

type EstadoModificacion = 'planeada' | 'en_progreso' | 'terminada';

const MAX_FOTOS = 6;

@Component({
  selector: 'app-nuevo-registro',
  templateUrl: './nuevo-registro.page.html',
  styleUrls: ['./nuevo-registro.page.scss'],
  standalone: false
})
export class NuevoRegistroPage implements OnInit, OnDestroy {

  readonly maxFotos = MAX_FOTOS;

  tipo: TipoRegistro = 'servicio';

  vehiculos: Vehiculo[] = [];
  cargandoVehiculos = true;

  // Campos del formulario
  idVehiculo: number | null = null;
  nombre = '';
  fecha = this.hoy();
  kilometraje: number | null = null;
  realizadoPor = '';
  categoria = '';
  estadoMod: EstadoModificacion = 'terminada';
  manoObra: number | null = null;
  notas = '';
  piezas: PiezaForm[] = [];
  fotos: FotoForm[] = [];

  guardando = false;
  error: string | null = null;

  private guardado = false;

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private registros: RegistrosService,
    private fotosLocales: FotosLocalesService,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const sesion = this.authService.obtenerSesion();
    if (!sesion) {
      this.router.navigateByUrl('/login');
      return;
    }

    // Los vehículos salen del mismo resumen que usa el Dashboard (con su caché local)
    this.dashboardService.obtenerResumen(sesion.id_usuario).subscribe(resp => {
      this.vehiculos = resp.resumen.vehiculos;
      if (this.vehiculos.length === 1) {
        this.idVehiculo = this.vehiculos[0].id;
      }
      this.cargandoVehiculos = false;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    // Si se sale sin guardar, se borran las fotos que ya se habían copiado al celular
    if (!this.guardado) {
      this.fotos.forEach(f => { void this.fotosLocales.borrar(f.ruta); });
    }
  }

  // ==================== Interfaz ====================

  cambiarTipo(tipo: TipoRegistro): void {
    this.tipo = tipo;
    this.error = null;
  }

  agregarPieza(): void {
    this.piezas.push({ nombre: '', cantidad: 1, costo: null });
  }

  quitarPieza(indice: number): void {
    this.piezas.splice(indice, 1);
  }

  trackPorIndice(indice: number): number {
    return indice;
  }

  get totalEstimado(): number {
    const piezas = this.piezas.reduce((suma, p) => suma + (p.cantidad ?? 0) * (p.costo ?? 0), 0);
    return piezas + (this.manoObra ?? 0);
  }

  volver(): void {
    this.router.navigateByUrl('/tabs/tab3');
  }

  // ==================== Fotos ====================

  async onArchivoSeleccionado(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = '';   // permite elegir la misma foto otra vez

    if (!archivo) {
      return;
    }
    if (this.fotos.length >= MAX_FOTOS) {
      this.error = `Máximo ${MAX_FOTOS} fotos por registro.`;
      return;
    }

    const url = URL.createObjectURL(archivo);

    const modal = await this.modalCtrl.create({
      component: FotoEditorComponent,
      componentProps: { src: url },
      cssClass: 'modal-editor-foto',
      backdropDismiss: false
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    URL.revokeObjectURL(url);

    if (role !== 'exportada' || !data?.dataUrl) {
      return;
    }

    try {
      const ruta = await this.fotosLocales.guardar(data.dataUrl);
      this.fotos.push({ ruta, vista: data.dataUrl });
      this.error = null;
    } catch {
      this.error = 'No se pudo guardar la foto en el celular.';
    }
    this.cdr.detectChanges();
  }

  async quitarFoto(indice: number): Promise<void> {
    const [foto] = this.fotos.splice(indice, 1);
    if (foto) {
      await this.fotosLocales.borrar(foto.ruta);
    }
    this.cdr.detectChanges();
  }

  // ==================== Guardar ====================

  async onGuardar(): Promise<void> {
    this.error = null;

    const sesion = this.authService.obtenerSesion();
    if (!sesion) {
      this.router.navigateByUrl('/login');
      return;
    }

    const problema = this.validar();
    if (problema) {
      this.error = problema;
      return;
    }

    const piezas = this.piezasParaEnviar();

    const payload: PayloadRegistro = {
      tipo: this.tipo,
      id_usuario: sesion.id_usuario,
      id_vehiculo: this.idVehiculo as number,
      nombre: this.nombre.trim(),
      fecha: this.fecha,
      costo_mano_obra: this.manoObra,
      notas: this.notas.trim() || null,
      refacciones: piezas
    };

    if (this.tipo === 'servicio') {
      payload.kilometraje = this.kilometraje;
      payload.realizado_por = this.realizadoPor.trim() || null;
    } else {
      payload.categoria = this.categoria.trim() || null;
      payload.estado = this.estadoMod;
    }

    this.guardando = true;
    this.cdr.detectChanges();

    try {
      const resultado = await this.registros.guardar(payload, this.fotos.map(f => f.ruta));
      this.guardado = true;

      await this.mostrarToast(
        resultado.mensaje,
        resultado.rechazado ? 'danger' : resultado.sincronizado ? 'success' : 'warning'
      );
      await this.router.navigateByUrl('/tabs/tab3');

    } catch {
      this.error = 'No se pudo guardar el registro en el celular. Inténtalo de nuevo.';
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  private validar(): string | null {
    if (this.idVehiculo === null) {
      return 'Elige el vehículo.';
    }
    if (!this.nombre.trim()) {
      return this.tipo === 'servicio' ? 'Escribe qué servicio se hizo.' : 'Escribe el nombre de la modificación.';
    }
    if (!this.fecha) {
      return 'Elige la fecha.';
    }
    if (this.kilometraje !== null && this.kilometraje < 0) {
      return 'El kilometraje no puede ser negativo.';
    }
    if (this.manoObra !== null && this.manoObra < 0) {
      return 'La mano de obra no puede ser negativa.';
    }

    for (const [i, p] of this.piezas.entries()) {
      const vacia = !p.nombre.trim() && p.costo === null;
      if (vacia) {
        continue;   // las filas totalmente vacías se ignoran
      }
      if (!p.nombre.trim()) {
        return `La pieza #${i + 1} necesita un nombre.`;
      }
      if (p.cantidad === null || p.cantidad <= 0) {
        return `La cantidad de "${p.nombre.trim()}" debe ser mayor a 0.`;
      }
      if (p.costo === null || p.costo < 0) {
        return `Escribe el costo de "${p.nombre.trim()}".`;
      }
    }
    return null;
  }

  private piezasParaEnviar(): PiezaPayload[] {
    return this.piezas
      .filter(p => p.nombre.trim() !== '')
      .map(p => ({
        nombre: p.nombre.trim(),
        cantidad: p.cantidad as number,
        costo_unitario: p.costo as number
      }));
  }

  private async mostrarToast(mensaje: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({ message: mensaje, duration: 3500, position: 'bottom', color });
    await toast.present();
  }

  /** Fecha de hoy en formato AAAA-MM-DD, con la hora local (no UTC). */
  private hoy(): string {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }
}
