export class RequestGate {
  private current: { id: string; controller: AbortController } | null = null;
  start() { this.cancel(); const controller = new AbortController(); const id = crypto.randomUUID(); this.current = { id, controller }; return { id, signal: controller.signal }; }
  cancel() { this.current?.controller.abort(); this.current = null; }
  isCurrent(id: string) { return this.current?.id === id && !this.current.controller.signal.aborted; }
}
