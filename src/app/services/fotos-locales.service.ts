import { Injectable } from '@angular/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * FotosLocalesService – guarda las fotos como archivos en el almacenamiento PRIVADO
 * de la app (Directory.Data). No se suben al servidor: se quedan solo en el celular.
 */
@Injectable({
  providedIn: 'root'
})
export class FotosLocalesService {

  private readonly CARPETA = 'fotos';

  /** Guarda una imagen (data URL o base64) y devuelve su ruta relativa. */
  async guardar(imagen: string): Promise<string> {
    const base64 = imagen.includes(',') ? imagen.split(',')[1] : imagen;
    const ruta = `${this.CARPETA}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;

    await Filesystem.writeFile({
      path: ruta,
      data: base64,
      directory: Directory.Data,
      recursive: true
    });

    return ruta;
  }

  /** Lee una foto guardada y la devuelve como data URL para mostrarla. */
  async leerComoDataUrl(ruta: string): Promise<string> {
    const archivo = await Filesystem.readFile({ path: ruta, directory: Directory.Data });

    if (typeof archivo.data === 'string') {
      return `data:image/jpeg;base64,${archivo.data}`;
    }
    return this.blobADataUrl(archivo.data);
  }

  async borrar(ruta: string): Promise<void> {
    try {
      await Filesystem.deleteFile({ path: ruta, directory: Directory.Data });
    } catch {
      // si el archivo ya no existe no pasa nada
    }
  }

  private blobADataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(lector.result as string);
      lector.onerror = () => reject(lector.error);
      lector.readAsDataURL(blob);
    });
  }
}
