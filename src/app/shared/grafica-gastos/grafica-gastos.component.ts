import {
  Component, ElementRef, OnInit, OnDestroy, ViewChild,
  ChangeDetectorRef, NgZone, CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import * as d3 from 'd3';
import { GastosService, GastoMes } from '../../services/gastos.service';
import { NetworkService } from '../../services/network.service';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
               'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * GraficaGastosComponent – standalone
 *
 * Gráfica de barras (D3.js) con el gasto total por mes: suma del precio de las
 * piezas usadas en los servicios/modificaciones. Los datos vienen de la API REST.
 *
 * Uso: agregar GraficaGastosComponent a los `imports` del módulo de la página y
 *   <app-grafica-gastos></app-grafica-gastos>
 */
@Component({
  selector: 'app-grafica-gastos',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="gastos-header">
      <button class="anio-btn" (click)="cambiarAnio(-1)" aria-label="Año anterior">‹</button>
      <span class="anio-texto">{{ anio }}</span>
      <button class="anio-btn" (click)="cambiarAnio(1)" aria-label="Año siguiente">›</button>
    </div>

    <div class="estado" *ngIf="cargando">
      <ion-spinner name="crescent"></ion-spinner>
      <span>Cargando gastos...</span>
    </div>

    <p class="estado error" *ngIf="!cargando && error">{{ error }}</p>

    <p class="estado" *ngIf="!cargando && !error && totalAnual === 0">
      Sin gastos registrados en {{ anio }}.
    </p>

    <p class="total" *ngIf="!cargando && !error && totalAnual > 0">
      Total {{ anio }}: <strong>{{ totalAnual | currency:'MXN':'symbol-narrow':'1.0-2' }}</strong>
    </p>

    <div #contenedor class="grafica" [hidden]="cargando || !!error || totalAnual === 0"></div>
  `,
  styles: [`
    :host { display: block; }
    .gastos-header { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 8px; }
    .anio-texto { color: #ffffff; font-weight: 600; min-width: 48px; text-align: center; }
    .anio-btn { background: transparent; border: 1px solid #3b3c48; color: #ffeba7;
                width: 32px; height: 32px; border-radius: 8px; font-size: 18px; cursor: pointer; }
    .estado { display: flex; align-items: center; justify-content: center; gap: 8px;
              color: #9d9ca5; font-size: 13px; margin: 16px 0; text-align: center; }
    .estado.error { color: #eb445a; }
    .total { text-align: center; color: #9d9ca5; font-size: 13px; margin: 0 0 4px; }
    .total strong { color: #ffeba7; }
    .grafica { width: 100%; }
  `]
})
export class GraficaGastosComponent implements OnInit, OnDestroy {

  @ViewChild('contenedor', { static: true }) contenedor!: ElementRef<HTMLDivElement>;

  anio = new Date().getFullYear();
  cargando = false;
  error: string | null = null;
  totalAnual = 0;

  private datos: GastoMes[] = [];
  private observador?: ResizeObserver;
  private subReconexion?: Subscription;

  constructor(
    private gastosService: GastosService,
    private network: NetworkService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargar();

    // Redibuja si cambia el ancho (rotar el celular, redimensionar la ventana)
    this.observador = new ResizeObserver(() => {
      if (this.datos.length) { this.dibujar(); }
    });
    this.observador.observe(this.contenedor.nativeElement);

    // Al volver el Internet se piden otra vez los gastos al servidor
    this.subReconexion = this.network.reconectado$.subscribe(() => this.cargar());
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
    this.subReconexion?.unsubscribe();
  }

  cambiarAnio(delta: number): void {
    this.anio += delta;
    this.cargar();
  }

  /** Vuelve a pedir los datos a la API (el Dashboard lo llama al volver a entrar). */
  recargar(): void {
    this.cargar();
  }

  // ---------- Datos (GET a la API) ----------

  private cargar(): void {
    this.cargando = true;
    this.error = null;
    this.cdr.detectChanges();

    this.gastosService.obtenerPorMes(this.anio).subscribe(resp => {
      this.ngZone.run(() => {
        this.cargando = false;

        if (!resp.exito) {
          this.error = resp.mensaje;
          this.datos = [];
          this.totalAnual = 0;
          this.cdr.detectChanges();
          return;
        }

        // Siempre 12 barras: los meses sin gasto valen 0
        this.datos = MESES.map((_, i) => ({
          mes: i + 1,
          total: Number(resp.gastos.find(g => Number(g.mes) === i + 1)?.total ?? 0)
        }));
        this.totalAnual = this.datos.reduce((suma, g) => suma + g.total, 0);

        this.cdr.detectChanges();      // muestra el contenedor antes de dibujar
        this.dibujar();
      });
    });
  }

  // ---------- Gráfica (D3.js) ----------

  private dibujar(): void {
    const host = this.contenedor.nativeElement;
    d3.select(host).selectAll('*').remove();

    const margin = { top: 16, right: 12, bottom: 28, left: 52 };
    const ancho = Math.max(host.clientWidth, 280);
    const alto = 280;
    const w = ancho - margin.left - margin.right;
    const h = alto - margin.top - margin.bottom;

    const svg = d3.select(host)
      .append('svg')
        .attr('width', ancho)
        .attr('height', alto)
      .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Eje X: un mes por barra
    const x = d3.scaleBand<string>()
      .domain(MESES)
      .range([0, w])
      .padding(0.2);

    // Eje Y: de 0 al mayor gasto mensual
    const maximo = d3.max(this.datos, d => d.total) || 1;
    const y = d3.scaleLinear()
      .domain([0, maximo])
      .nice()
      .range([h, 0]);

    const estiloEjes = (g: d3.Selection<SVGGElement, unknown, null, undefined>) => {
      g.selectAll('text').style('fill', '#9d9ca5').style('font-size', '11px');
      g.selectAll('line, path').style('stroke', '#3b3c48');
    };

    svg.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x))
      .call(estiloEjes);

    svg.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => '$' + d3.format('~s')(d as number)))
      .call(estiloEjes);

    // Tooltip con el monto exacto
    const tooltip = d3.select(host)
      .append('div')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('opacity', '0')
        .style('background', '#1f2029')
        .style('color', '#ffffff')
        .style('border', '1px solid #ffeba7')
        .style('border-radius', '6px')
        .style('padding', '4px 8px')
        .style('font-size', '12px');
    d3.select(host).style('position', 'relative');

    const formato = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

    // Barras (animadas al entrar)
    svg.selectAll('rect')
      .data(this.datos)
      .enter()
      .append('rect')
        .attr('x', d => x(MESES[d.mes - 1])!)
        .attr('width', x.bandwidth())
        .attr('y', h)
        .attr('height', 0)
        .attr('rx', 3)
        .style('fill', '#ffeba7')
        .on('mouseover', function (event, d) {
          d3.select(this).style('fill', '#ffd24a');
          tooltip.style('opacity', '1')
            .html(`${MESES[d.mes - 1]}: <strong>${formato.format(d.total)}</strong>`);
        })
        .on('mousemove', (event: MouseEvent) => {
          const caja = host.getBoundingClientRect();
          tooltip
            .style('left', `${event.clientX - caja.left + 10}px`)
            .style('top', `${event.clientY - caja.top - 30}px`);
        })
        .on('mouseout', function () {
          d3.select(this).style('fill', '#ffeba7');
          tooltip.style('opacity', '0');
        })
      .transition()
        .duration(600)
        .attr('y', d => y(d.total))
        .attr('height', d => h - y(d.total));
  }
}
