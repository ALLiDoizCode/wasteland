/**
 * Relay connection and event publishing with ILP payment
 */

import WebSocket from 'ws';
import type { Event } from 'nostr-tools';

export interface ILPPaymentConfig {
  paymentPointer?: string;
  amount?: number;
}

export interface RelayConnection {
  url: string;
  ws: WebSocket | null;
  subscriptions: Map<string, (event: Event) => void>;
}

/**
 * Connect to a Nostr relay
 *
 * @param relayUrl - WebSocket URL of the relay
 * @returns Promise resolving to WebSocket connection
 */
export async function connectToRelay(relayUrl: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(relayUrl);

    ws.on('open', () => {
      console.log(`Connected to relay: ${relayUrl}`);
      resolve(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      reject(error);
    });
  });
}

/**
 * Publish an event to the relay with ILP payment
 *
 * @param ws - WebSocket connection to relay
 * @param event - Signed Nostr event
 * @param ilpConfig - ILP payment configuration (optional for POC)
 * @returns Promise resolving to event ID on success
 */
export async function publishEvent(
  ws: WebSocket,
  event: Event,
  ilpConfig?: ILPPaymentConfig
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (ws.readyState !== WebSocket.OPEN) {
      reject(new Error('WebSocket is not open'));
      return;
    }

    // Create EVENT message per NIP-01
    const message = JSON.stringify(['EVENT', event]);

    // Set up response handler
    const responseHandler = (data: WebSocket.Data) => {
      try {
        const response = JSON.parse(data.toString());

        if (Array.isArray(response)) {
          const [type, eventId, accepted, message] = response;

          if (type === 'OK') {
            if (accepted) {
              ws.off('message', responseHandler);
              resolve(eventId);
            } else {
              ws.off('message', responseHandler);
              reject(new Error(`Event rejected: ${message}`));
            }
          } else if (type === 'NOTICE') {
            // Handle relay notices (might include payment required)
            console.warn('Relay notice:', response[1]);

            // Check if payment is required
            if (response[1]?.includes('payment') || response[1]?.includes('ILP')) {
              // For POC, we'll simulate payment success
              // In production, integrate with @crosstown/core for actual payment
              console.log('ILP payment would be processed here');
            }
          }
        }
      } catch (error) {
        ws.off('message', responseHandler);
        reject(error);
      }
    };

    // Listen for response
    ws.on('message', responseHandler);

    // Send event
    ws.send(message, (error) => {
      if (error) {
        ws.off('message', responseHandler);
        reject(error);
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      ws.off('message', responseHandler);
      reject(new Error('Publish timeout'));
    }, 10000);
  });
}

/**
 * Close relay connection
 *
 * @param ws - WebSocket connection to close
 */
export function disconnectFromRelay(ws: WebSocket): void {
  if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
    ws.close();
    console.log('Disconnected from relay');
  }
}

/**
 * Send a Nostr message to relay
 *
 * @param ws - WebSocket connection
 * @param message - Nostr message (e.g., ["REQ", ...], ["EVENT", ...])
 * @returns Promise resolving when message is sent
 */
export async function sendMessage(
  ws: WebSocket,
  message: unknown[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws.readyState !== WebSocket.OPEN) {
      reject(new Error('WebSocket is not open'));
      return;
    }

    const serialized = JSON.stringify(message);
    ws.send(serialized, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Subscribe to relay events
 *
 * @param ws - WebSocket connection
 * @param subscriptionId - Unique subscription identifier
 * @param filters - Nostr filters
 * @param callback - Callback for received events
 */
export async function subscribe(
  ws: WebSocket,
  subscriptionId: string,
  filters: Record<string, unknown>[],
  callback: (event: Event) => void
): Promise<void> {
  // Set up message handler
  const messageHandler = (data: WebSocket.Data) => {
    try {
      const message = JSON.parse(data.toString());

      if (Array.isArray(message) && message[0] === 'EVENT' && message[1] === subscriptionId) {
        callback(message[2] as Event);
      }
    } catch (error) {
      console.error('Error parsing subscription message:', error);
    }
  };

  ws.on('message', messageHandler);

  // Send REQ message
  const reqMessage = ['REQ', subscriptionId, ...filters];
  await sendMessage(ws, reqMessage);
}

/**
 * Unsubscribe from relay events
 *
 * @param ws - WebSocket connection
 * @param subscriptionId - Subscription identifier to close
 */
export async function unsubscribe(
  ws: WebSocket,
  subscriptionId: string
): Promise<void> {
  const closeMessage = ['CLOSE', subscriptionId];
  await sendMessage(ws, closeMessage);
}
