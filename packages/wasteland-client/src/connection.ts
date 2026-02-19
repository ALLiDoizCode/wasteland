/**
 * Connection management with auto-reconnection and subscription resume
 */

import type WebSocket from 'ws';
import { connectToRelay } from './relay.js';
import type { Event } from 'nostr-tools';

export interface ReconnectionConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

export interface SubscriptionState {
  id: string;
  filters: Record<string, unknown>[];
  callback: (event: Event) => void;
}

export class ConnectionManager {
  private relayUrl: string;
  private ws: WebSocket | null = null;
  private reconnectConfig: Required<ReconnectionConfig>;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private subscriptions: Map<string, SubscriptionState> = new Map();
  private seenEvents: Set<string> = new Set();
  private maxSeenEvents = 10000; // Limit memory usage
  private isManualDisconnect = false;

  constructor(
    relayUrl: string,
    reconnectConfig?: ReconnectionConfig
  ) {
    this.relayUrl = relayUrl;
    this.reconnectConfig = {
      maxRetries: reconnectConfig?.maxRetries ?? Infinity,
      initialDelay: reconnectConfig?.initialDelay ?? 1000,
      maxDelay: reconnectConfig?.maxDelay ?? 30000,
      backoffMultiplier: reconnectConfig?.backoffMultiplier ?? 2,
    };
  }

  /**
   * Connect to relay with auto-reconnection
   */
  async connect(): Promise<WebSocket> {
    this.isManualDisconnect = false;

    try {
      this.ws = await connectToRelay(this.relayUrl);
      this.reconnectAttempts = 0;

      this.setupConnectionHandlers();
      this.resumeSubscriptions();

      return this.ws;
    } catch (error) {
      console.error('Connection failed:', error);
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * Disconnect from relay
   */
  disconnect(): void {
    this.isManualDisconnect = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    console.log('Disconnected from relay');
  }

  /**
   * Get WebSocket connection
   */
  getConnection(): WebSocket | null {
    return this.ws;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === 1;
  }

  /**
   * Register a subscription to be resumed on reconnect
   */
  registerSubscription(
    id: string,
    filters: Record<string, unknown>[],
    callback: (event: Event) => void
  ): void {
    this.subscriptions.set(id, { id, filters, callback });
  }

  /**
   * Unregister a subscription
   */
  unregisterSubscription(id: string): void {
    this.subscriptions.delete(id);
  }

  /**
   * Check if event has been seen (for deduplication)
   */
  hasSeenEvent(eventId: string): boolean {
    return this.seenEvents.has(eventId);
  }

  /**
   * Mark event as seen
   */
  markEventSeen(eventId: string): void {
    this.seenEvents.add(eventId);

    // Limit memory usage by trimming old events
    if (this.seenEvents.size > this.maxSeenEvents) {
      const firstHalf = Array.from(this.seenEvents).slice(0, this.maxSeenEvents / 2);
      this.seenEvents = new Set(firstHalf);
    }
  }

  /**
   * Clear seen events cache
   */
  clearSeenEvents(): void {
    this.seenEvents.clear();
  }

  /**
   * Set up WebSocket event handlers for reconnection
   */
  private setupConnectionHandlers(): void {
    if (!this.ws) {
      return;
    }

    this.ws.on('close', () => {
      console.log('WebSocket closed');

      if (!this.isManualDisconnect) {
        this.scheduleReconnect();
      }
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);

      if (!this.isManualDisconnect) {
        this.scheduleReconnect();
      }
    });

    this.ws.on('ping', () => {
      this.ws?.pong();
    });
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.isManualDisconnect) {
      return;
    }

    if (this.reconnectAttempts >= this.reconnectConfig.maxRetries) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(
      this.reconnectConfig.initialDelay *
        Math.pow(this.reconnectConfig.backoffMultiplier, this.reconnectAttempts),
      this.reconnectConfig.maxDelay
    );

    console.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.reconnectConfig.maxRetries})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Resume all subscriptions after reconnection
   */
  private async resumeSubscriptions(): Promise<void> {
    if (!this.ws || this.subscriptions.size === 0) {
      return;
    }

    console.log(`Resuming ${this.subscriptions.size} subscriptions`);

    for (const [id, state] of this.subscriptions) {
      try {
        const reqMessage = JSON.stringify(['REQ', id, ...state.filters]);
        this.ws.send(reqMessage);

        // Re-attach message handler for this subscription
        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());

            if (
              Array.isArray(message) &&
              message[0] === 'EVENT' &&
              message[1] === id
            ) {
              const event = message[2] as Event;

              // Deduplicate events
              if (!this.hasSeenEvent(event.id)) {
                this.markEventSeen(event.id);
                state.callback(event);
              }
            }
          } catch (error) {
            console.error('Error processing subscription message:', error);
          }
        });
      } catch (error) {
        console.error(`Failed to resume subscription ${id}:`, error);
      }
    }
  }
}

/**
 * Create a connection manager instance
 */
export function createConnectionManager(
  relayUrl: string,
  config?: ReconnectionConfig
): ConnectionManager {
  return new ConnectionManager(relayUrl, config);
}
