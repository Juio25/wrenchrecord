import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge, timer } from 'rxjs';
import { map, distinctUntilChanged, pairwise, filter, switchMap, takeUntil } from 'rxjs/operators';

export type EstadoConexion = 'online' | 'offline';

/**
 * NetworkService – detects connectivity changes and exposes reactive
 * observables so any component or service can react when the device goes
 * offline or comes back online.
 */
@Injectable({
  providedIn: 'root'
})
export class NetworkService {

  private _estado$ = new BehaviorSubject<EstadoConexion>(
    navigator.onLine ? 'online' : 'offline'
  );

  /** Observable that emits every time the connection status changes. */
  readonly estado$: Observable<EstadoConexion> = this._estado$.asObservable().pipe(
    distinctUntilChanged()
  );

  /**
   * Emite UNA vez cada vez que el dispositivo pasa de offline a online.
   * Las pantallas lo usan para volver a consultar la API y sincronizar su
   * información. Espera un momento (700 ms) porque el sistema avisa "online"
   * antes de que la red esté realmente lista; si en ese lapso se vuelve a
   * perder la conexión, el aviso se cancela.
   */
  readonly reconectado$: Observable<void> = this.estado$.pipe(
    pairwise(),
    filter(([anterior, actual]) => anterior === 'offline' && actual === 'online'),
    switchMap(() =>
      timer(700).pipe(
        takeUntil(this.estado$.pipe(filter(estado => estado === 'offline')))
      )
    ),
    map(() => undefined)
  );

  /** Synchronous snapshot of the current connection status. */
  get estaOnline(): boolean {
    return this._estado$.getValue() === 'online';
  }

  constructor() {
    // Listen to native browser/WebView events
    merge(
      fromEvent(window, 'online').pipe(map(() => 'online' as EstadoConexion)),
      fromEvent(window, 'offline').pipe(map(() => 'offline' as EstadoConexion))
    ).subscribe(estado => this._estado$.next(estado));
  }
}
