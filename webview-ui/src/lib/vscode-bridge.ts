// ============================================================
// King Agents — VS Code Webview Communication Bridge
// ============================================================

import type { ExtensionMessage, WebviewMessage } from './types';

type MessageHandler = (message: ExtensionMessage) => void;

// Acquire VS Code API (available in webview context)
interface VSCodeAPI {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VSCodeAPI;

class VSCodeBridge {
  private vscode: VSCodeAPI | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private isVSCode = false;

  constructor() {
    try {
      // In VS Code webview, the API is injected by extension.ts onto window
      const win = window as unknown as Record<string, unknown>;
      if (win.__VSCODE_API__) {
        this.vscode = win.__VSCODE_API__ as VSCodeAPI;
        this.isVSCode = true;
      } else {
        this.vscode = acquireVsCodeApi();
        this.isVSCode = true;
      }
    } catch {
      // Running outside VS Code (dev mode)
      console.log('[VSCodeBridge] Running in standalone mode (no VS Code API)');
      this.isVSCode = false;
    }

    // Listen for messages from Extension Host
    window.addEventListener('message', (event: MessageEvent) => {
      const message = event.data as ExtensionMessage;
      if (message && message.type) {
        this.handlers.forEach((handler) => {
          try {
            handler(message);
          } catch (err) {
            console.error('[VSCodeBridge] Handler error:', err);
          }
        });
      }
    });
  }

  /**
   * Send a message to the Extension Host
   */
  postMessage(message: WebviewMessage): void {
    if (this.vscode) {
      this.vscode.postMessage(message);
    } else {
      console.log('[VSCodeBridge] postMessage (dev):', message);
    }
  }

  /**
   * Register a handler for messages from Extension Host
   */
  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  /**
   * Save webview state (persists across webview hide/show)
   */
  saveState(state: unknown): void {
    if (this.vscode) {
      this.vscode.setState(state);
    }
  }

  /**
   * Restore webview state
   */
  getState<T>(): T | null {
    if (this.vscode) {
      return this.vscode.getState() as T | null;
    }
    return null;
  }

  /**
   * Whether we are running inside VS Code
   */
  get inVSCode(): boolean {
    return this.isVSCode;
  }

  /**
   * Notify Extension Host that webview is ready
   */
  notifyReady(): void {
    this.postMessage({ type: 'ui:ready' });
  }

  /**
   * Request full state refresh from Extension Host
   */
  requestState(): void {
    this.postMessage({ type: 'ui:requestState' });
  }

  /**
   * Send worker click event
   */
  workerClick(role: string): void {
    this.postMessage({ type: 'worker:click', role: role as any });
  }

  /**
   * Send worker pause event
   */
  workerPause(role: string): void {
    this.postMessage({ type: 'worker:pause', role: role as any });
  }

  /**
   * Send worker retry event
   */
  workerRetry(role: string): void {
    this.postMessage({ type: 'worker:retry', role: role as any });
  }
}

// Singleton
export const bridge = new VSCodeBridge();
