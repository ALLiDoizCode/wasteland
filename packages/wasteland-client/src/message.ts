/**
 * Message event creation and management
 */

import { finalizeEvent, type EventTemplate } from 'nostr-tools';
import type WebSocket from 'ws';
import { publishEvent, type ILPPaymentConfig } from './relay.js';
import {
  MESSAGE_EVENT_KIND,
  Priority,
  MessageType,
  type CreateMessageParams,
  type MessageEvent,
} from './types.js';

/**
 * Create a message event (kind 31000)
 *
 * @param params - Message parameters
 * @returns Unsigned message event template
 */
export function createMessageEvent(params: CreateMessageParams): EventTemplate {
  const {
    recipient,
    subject,
    content,
    messageType,
    priority = Priority.NORMAL,
    threadId,
    replyTo,
  } = params;

  const tags: string[][] = [
    ['p', recipient], // Recipient pubkey
    ['subject', subject],
    ['message-type', messageType],
    ['priority', priority],
  ];

  // Add thread ID if specified
  if (threadId) {
    tags.push(['thread-id', threadId]);
  }

  // Add reply-to event reference if specified
  if (replyTo) {
    tags.push(['e', replyTo, '', 'reply']); // NIP-10 reply marker
  }

  const eventTemplate: EventTemplate = {
    kind: MESSAGE_EVENT_KIND,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content,
  };

  return eventTemplate;
}

/**
 * Sign a message event template
 *
 * @param eventTemplate - Unsigned event template
 * @param privateKey - Agent's private key (hex string)
 * @returns Signed message event
 */
export function signMessageEvent(
  eventTemplate: EventTemplate,
  privateKey: Uint8Array
): MessageEvent {
  return finalizeEvent(eventTemplate, privateKey) as MessageEvent;
}

/**
 * Create a reply message event
 *
 * @param originalMessage - Original message being replied to
 * @param replyContent - Reply content
 * @param sender - Sender pubkey (will become recipient in reply)
 * @returns Unsigned reply message event template
 */
export function createReplyMessage(
  originalMessage: MessageEvent,
  replyContent: string,
  sender: string
): EventTemplate {
  // Extract original message data
  const originalSubject =
    originalMessage.tags.find((t) => t[0] === 'subject')?.[1] || '';
  const originalThreadId =
    originalMessage.tags.find((t) => t[0] === 'thread-id')?.[1];
  const originalSender = originalMessage.pubkey;

  // Thread ID is either the existing thread or the original message ID
  const threadId = originalThreadId || originalMessage.id;

  // Reply subject (add "Re: " prefix if not already present)
  const replySubject = originalSubject.startsWith('Re: ')
    ? originalSubject
    : `Re: ${originalSubject}`;

  return createMessageEvent({
    recipient: originalSender, // Reply to original sender
    subject: replySubject,
    content: replyContent,
    messageType: MessageType.REPLY,
    threadId,
    replyTo: originalMessage.id,
  });
}

/**
 * Get message thread (all messages with same thread-id)
 *
 * This is a helper that should be used with queryMessages from query.ts
 *
 * @param messages - All messages to search
 * @param threadId - Thread identifier
 * @returns Array of messages in the thread, sorted by timestamp
 */
export function getMessageThread(
  messages: MessageEvent[],
  threadId: string
): MessageEvent[] {
  const threadMessages = messages.filter((msg) => {
    const msgThreadId = msg.tags.find((t) => t[0] === 'thread-id')?.[1];
    return msgThreadId === threadId || msg.id === threadId;
  });

  // Sort by created_at timestamp
  return threadMessages.sort((a, b) => a.created_at - b.created_at);
}

/**
 * Parse message event tags into structured format
 *
 * @param event - Message event
 * @returns Parsed message data
 */
export function parseMessageEvent(event: MessageEvent) {
  const getRecipient = () => event.tags.find((t) => t[0] === 'p')?.[1] || '';
  const getSubject = () =>
    event.tags.find((t) => t[0] === 'subject')?.[1] || '';
  const getMessageType = () =>
    (event.tags.find((t) => t[0] === 'message-type')?.[1] as MessageType) ||
    MessageType.NOTIFICATION;
  const getPriority = () =>
    (event.tags.find((t) => t[0] === 'priority')?.[1] as Priority) ||
    Priority.NORMAL;
  const getThreadId = () =>
    event.tags.find((t) => t[0] === 'thread-id')?.[1];
  const getReplyTo = () => event.tags.find((t) => t[0] === 'e')?.[1];

  return {
    eventId: event.id,
    sender: event.pubkey,
    recipient: getRecipient(),
    subject: getSubject(),
    content: event.content,
    messageType: getMessageType(),
    priority: getPriority(),
    threadId: getThreadId(),
    replyTo: getReplyTo(),
    createdAt: event.created_at,
  };
}

/**
 * Create a POLECAT_DONE message
 *
 * @param recipient - Recipient pubkey
 * @param taskId - Task identifier that was completed
 * @param notes - Optional completion notes
 * @returns Unsigned message event template
 */
export function createPolecatDoneMessage(
  recipient: string,
  taskId: string,
  notes?: string
): EventTemplate {
  const content = notes || `Task ${taskId} completed`;

  return createMessageEvent({
    recipient,
    subject: `Task Completed: ${taskId}`,
    content,
    messageType: MessageType.POLECAT_DONE,
    priority: Priority.NORMAL,
  });
}

/**
 * Create a MERGE_READY message (from Witness to Refinery)
 *
 * @param recipient - Refinery pubkey
 * @param branchName - Branch name ready for merge
 * @param notes - Optional merge notes
 * @returns Unsigned message event template
 */
export function createMergeReadyMessage(
  recipient: string,
  branchName: string,
  notes?: string
): EventTemplate {
  const content = notes || `Branch ${branchName} is ready for merge`;

  return createMessageEvent({
    recipient,
    subject: `Merge Ready: ${branchName}`,
    content,
    messageType: MessageType.MERGE_READY,
    priority: Priority.HIGH,
  });
}

/**
 * Create a notification message
 *
 * @param recipient - Recipient pubkey
 * @param subject - Notification subject
 * @param content - Notification content
 * @param priority - Priority level
 * @returns Unsigned message event template
 */
export function createNotification(
  recipient: string,
  subject: string,
  content: string,
  priority: Priority = Priority.NORMAL
): EventTemplate {
  return createMessageEvent({
    recipient,
    subject,
    content,
    messageType: MessageType.NOTIFICATION,
    priority,
  });
}

/**
 * Publish a message event to the relay
 *
 * @param ws - WebSocket connection to relay
 * @param message - Signed message event
 * @param ilpConfig - ILP payment configuration (optional for POC)
 * @returns Promise resolving to event ID on success
 */
export async function publishMessage(
  ws: WebSocket,
  message: MessageEvent,
  ilpConfig?: ILPPaymentConfig
): Promise<string> {
  return publishEvent(ws, message, ilpConfig);
}
