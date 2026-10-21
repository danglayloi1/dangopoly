import type { ClientMessage, ServerMessage } from './protocol';

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting';

interface Handlers {
  onOpen: () => void; // connected (again): say who we are
  onMessage: (msg: ServerMessage) => void;
  onStatus: (status: ConnectionStatus) => void;
}

/**
 * A WebSocket to one room that reconnects by itself: phones lose the connection whenever the
 * screen locks or the signal drops. Waits 0.5 s, 1 s, 2 s… (at most 10 s) between tries, and tries
 * at once when the page is shown again.
 */
export class RoomConnection {
  private ws: WebSocket | null = null;
  private attempts = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;

  constructor(
    private readonly url: string,
    private readonly handlers: Handlers,
  ) {
    this.connect();
    document.addEventListener('visibilitychange', this.onVisible);
  }

  send(msg: ClientMessage): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(msg));
    return true;
  }

  close(): void {
    this.stopped = true;
    clearTimeout(this.timer);
    document.removeEventListener('visibilitychange', this.onVisible);
    this.ws?.close();
  }

  private connect(): void {
    clearTimeout(this.timer);
    this.handlers.onStatus(this.attempts === 0 ? 'connecting' : 'reconnecting');
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.attempts = 0;
      this.handlers.onStatus('open');
      this.handlers.onOpen();
    };
    ws.onmessage = (e) => {
      try {
        this.handlers.onMessage(JSON.parse(e.data as string) as ServerMessage);
      } catch {
        // not a message we understand
      }
    };
    ws.onclose = () => {
      if (this.stopped || this.ws !== ws) return;
      this.attempts++;
      this.handlers.onStatus('reconnecting');
      this.timer = setTimeout(() => this.connect(), Math.min(10_000, 250 * 2 ** this.attempts));
    };
  }

  private onVisible = (): void => {
    const state = this.ws?.readyState;
    if (document.visibilityState === 'visible' && !this.stopped && state !== WebSocket.OPEN && state !== WebSocket.CONNECTING) {
      this.connect();
    }
  };
}
