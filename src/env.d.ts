/// <reference types="astro/client" />

// Variables y conexiones configuradas en Cloudflare Pages
interface Env {
  DB: import('./lib/datos').D1;           // Base de datos D1
  FOTOS: R2Bucket;                         // Almacenamiento R2 para las fotos
  ADMIN_USUARIO: string;                   // Usuario del panel
  ADMIN_CLAVE: string;                     // Contraseña del panel (secreto)
  SESION_SECRETO: string;                  // Clave para firmar la sesión (secreto)
}
interface R2Bucket {
  get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string }; httpEtag: string } | null>;
  put(key: string, value: ArrayBuffer | ReadableStream, opts?: { httpMetadata?: { contentType?: string; cacheControl?: string } }): Promise<unknown>;
  delete(keys: string | string[]): Promise<void>;
}

declare namespace App {
  interface Locals {
    runtime: { env: Env; ctx: { waitUntil(p: Promise<unknown>): void } };
    usuario?: string;
  }
}
