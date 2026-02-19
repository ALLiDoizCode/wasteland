/**
 * Task and message querying functionality
 */

import type WebSocket from 'ws';
import type { Event } from 'nostr-tools';
import { subscribe, sendMessage } from './relay.js';
import { TASK_EVENT_KIND, MESSAGE_EVENT_KIND, type TaskFilter, type MessageFilter, type TaskEvent, type MessageEvent } from './types.js';
import { parseTaskEvent } from './task.js';

/**
 * Query tasks from relay
 *
 * @param ws - WebSocket connection to relay
 * @param filter - Task filter criteria
 * @returns Promise resolving to array of task events
 */
export async function queryTasks(
  ws: WebSocket,
  filter: TaskFilter = {}
): Promise<TaskEvent[]> {
  return new Promise((resolve, reject) => {
    const subscriptionId = `query-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const tasks: TaskEvent[] = [];
    let eoseReceived = false;

    // Build Nostr filter
    const nostrFilter: Record<string, unknown> = {
      kinds: [TASK_EVENT_KIND],
    };

    if (filter.authors) {
      nostrFilter.authors = filter.authors;
    }

    if (filter.ids) {
      nostrFilter.ids = filter.ids;
    }

    if (filter.since) {
      nostrFilter.since = filter.since;
    }

    if (filter.until) {
      nostrFilter.until = filter.until;
    }

    if (filter.limit) {
      nostrFilter.limit = filter.limit;
    }

    // Add tag filters for status and priority
    if (filter.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      nostrFilter['#status'] = statuses;
    }

    if (filter.priority) {
      const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
      nostrFilter['#priority'] = priorities;
    }

    // Message handler
    const messageHandler = (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());

        if (Array.isArray(message)) {
          const [type, subId, event] = message;

          if (type === 'EVENT' && subId === subscriptionId) {
            tasks.push(event as TaskEvent);
          } else if (type === 'EOSE' && subId === subscriptionId) {
            eoseReceived = true;
            ws.off('message', messageHandler);

            // Close subscription
            sendMessage(ws, ['CLOSE', subscriptionId]).catch(console.error);

            resolve(tasks);
          }
        }
      } catch (error) {
        ws.off('message', messageHandler);
        reject(error);
      }
    };

    ws.on('message', messageHandler);

    // Send REQ
    sendMessage(ws, ['REQ', subscriptionId, nostrFilter]).catch((error) => {
      ws.off('message', messageHandler);
      reject(error);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!eoseReceived) {
        ws.off('message', messageHandler);
        sendMessage(ws, ['CLOSE', subscriptionId]).catch(console.error);
        resolve(tasks); // Return what we have so far
      }
    }, 10000);
  });
}

/**
 * Subscribe to task events in real-time
 *
 * @param ws - WebSocket connection
 * @param filter - Task filter criteria
 * @param callback - Callback for each task event
 * @returns Subscription ID for unsubscribing
 */
export function subscribeToTasks(
  ws: WebSocket,
  filter: TaskFilter,
  callback: (task: TaskEvent) => void
): string {
  const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // Build Nostr filter (same as queryTasks)
  const nostrFilter: Record<string, unknown> = {
    kinds: [TASK_EVENT_KIND],
  };

  if (filter.authors) {
    nostrFilter.authors = filter.authors;
  }

  if (filter.status) {
    const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
    nostrFilter['#status'] = statuses;
  }

  if (filter.priority) {
    const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
    nostrFilter['#priority'] = priorities;
  }

  if (filter.since) {
    nostrFilter.since = filter.since;
  }

  // Subscribe
  subscribe(ws, subscriptionId, [nostrFilter], (event) => {
    callback(event as TaskEvent);
  }).catch(console.error);

  return subscriptionId;
}

/**
 * Find ready tasks (tasks with no blocked-by tags)
 *
 * @param ws - WebSocket connection
 * @param authorPubkey - Optional author filter
 * @returns Promise resolving to array of ready tasks
 */
export async function findReadyTasks(
  ws: WebSocket,
  authorPubkey?: string
): Promise<TaskEvent[]> {
  // Query all open/in_progress tasks
  const filter: TaskFilter = {
    status: ['open', 'in_progress'] as any,
  };

  if (authorPubkey) {
    filter.authors = [authorPubkey];
  }

  const allTasks = await queryTasks(ws, filter);

  // Filter out tasks that have blocked-by tags
  const readyTasks = allTasks.filter((task) => {
    const blockedByTags = task.tags.filter((tag) => tag[0] === 'blocked-by');
    return blockedByTags.length === 0;
  });

  return readyTasks;
}

/**
 * Query messages from relay
 *
 * @param ws - WebSocket connection
 * @param filter - Message filter criteria
 * @returns Promise resolving to array of message events
 */
export async function queryMessages(
  ws: WebSocket,
  filter: MessageFilter = {}
): Promise<MessageEvent[]> {
  return new Promise((resolve, reject) => {
    const subscriptionId = `msg-query-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const messages: MessageEvent[] = [];
    let eoseReceived = false;

    // Build Nostr filter
    const nostrFilter: Record<string, unknown> = {
      kinds: [MESSAGE_EVENT_KIND],
    };

    if (filter.authors) {
      nostrFilter.authors = filter.authors;
    }

    if (filter.recipients) {
      nostrFilter['#p'] = filter.recipients;
    }

    if (filter.messageType) {
      const types = Array.isArray(filter.messageType) ? filter.messageType : [filter.messageType];
      nostrFilter['#message-type'] = types;
    }

    if (filter.threadId) {
      nostrFilter['#thread-id'] = [filter.threadId];
    }

    if (filter.since) {
      nostrFilter.since = filter.since;
    }

    if (filter.until) {
      nostrFilter.until = filter.until;
    }

    if (filter.limit) {
      nostrFilter.limit = filter.limit;
    }

    // Message handler
    const messageHandler = (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());

        if (Array.isArray(message)) {
          const [type, subId, event] = message;

          if (type === 'EVENT' && subId === subscriptionId) {
            messages.push(event as MessageEvent);
          } else if (type === 'EOSE' && subId === subscriptionId) {
            eoseReceived = true;
            ws.off('message', messageHandler);
            sendMessage(ws, ['CLOSE', subscriptionId]).catch(console.error);
            resolve(messages);
          }
        }
      } catch (error) {
        ws.off('message', messageHandler);
        reject(error);
      }
    };

    ws.on('message', messageHandler);

    // Send REQ
    sendMessage(ws, ['REQ', subscriptionId, nostrFilter]).catch((error) => {
      ws.off('message', messageHandler);
      reject(error);
    });

    // Timeout
    setTimeout(() => {
      if (!eoseReceived) {
        ws.off('message', messageHandler);
        sendMessage(ws, ['CLOSE', subscriptionId]).catch(console.error);
        resolve(messages);
      }
    }, 10000);
  });
}

/**
 * Subscribe to messages in real-time
 *
 * @param ws - WebSocket connection
 * @param recipientPubkey - Recipient public key to filter messages
 * @param callback - Callback for each message event
 * @returns Subscription ID
 */
export function subscribeToMessages(
  ws: WebSocket,
  recipientPubkey: string,
  callback: (message: MessageEvent) => void
): string {
  const subscriptionId = `msg-sub-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const nostrFilter: Record<string, unknown> = {
    kinds: [MESSAGE_EVENT_KIND],
    '#p': [recipientPubkey],
  };

  subscribe(ws, subscriptionId, [nostrFilter], (event) => {
    callback(event as MessageEvent);
  }).catch(console.error);

  return subscriptionId;
}
