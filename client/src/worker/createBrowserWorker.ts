/**
 * Tarayıcı Worker fabrikası — SADECE ana thread'de import edilir.
 *
 * `import.meta.url` içerdiği için node test grafiğine ASLA girmez
 * (testler `engineClient`'a sahte fabrika enjekte eder). Vite,
 * `new Worker(new URL(...), { type: 'module' })` desenini yerleşik destekler.
 */

export function createBrowserWorker(): Worker {
  return new Worker(new URL('./engineWorker.ts', import.meta.url), {
    type: 'module',
  });
}

/** Worker API'si mevcut mu? (SSR / eski tarayıcı guard'ı) */
export function isWorkerSupported(): boolean {
  return typeof Worker !== 'undefined';
}
