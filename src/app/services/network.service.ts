import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge, of } from 'rxjs';
import { map, distinctUntilChanged, startWith } from 'rxjs/operators';

export type EstadoConexion = 'online' | 'offline';

/**
 * NetworkService – detects connectivity changes and exposes a reactive
 * observable so any component or service can react when the device goes
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

