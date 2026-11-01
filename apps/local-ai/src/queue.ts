import { AppError } from '@unforked/contracts';
export class SerialQueue {
  private running = false;
  private waiting: { start(): void; cancel(): void }[] = [];
  get active() { return this.running ? 1 : 0; }
  get pending() { return this.waiting.length; }
  run<T>(job: () => Promise<T>, signal: AbortSignal): Promise<T> {
    if (signal.aborted) return Promise.reject(new AppError('CANCELLED', 'This request was cancelled.', 499));
    if (this.running && this.waiting.length >= 2) return Promise.reject(new AppError('LOCAL_AI_BUSY', 'The local AI is busy. Please wait and try again.', 429, 15));
    return new Promise<T>((resolve, reject) => {
      const entry = {
        start: () => {
          signal.removeEventListener('abort', entry.cancel);
          if (signal.aborted) { reject(new AppError('CANCELLED', 'This request was cancelled.', 499)); this.next(); return; }
          this.running = true;
          void job().then(resolve, reject).finally(() => { this.running = false; this.next(); });
        },
        cancel: () => { const index = this.waiting.indexOf(entry); if (index >= 0) { this.waiting.splice(index, 1); signal.removeEventListener('abort', entry.cancel); reject(new AppError('CANCELLED', 'This request was cancelled.', 499)); } }
      };
      if (this.running) { this.waiting.push(entry); signal.addEventListener('abort', entry.cancel, { once: true }); }
      else entry.start();
    });
  }
  private next() { if (!this.running) this.waiting.shift()?.start(); }
}
