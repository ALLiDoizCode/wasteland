/**
 * Core types for Wasteland Nostr events
 */

import type { Event, UnsignedEvent } from 'nostr-tools';

// Event kinds
export const TASK_EVENT_KIND = 30100; // Parameterized replaceable
export const MESSAGE_EVENT_KIND = 31000; // Regular replaceable
export const TASK_WISP_KIND = 20100; // Ephemeral (Phase 1)
export const MESSAGE_EPHEMERAL_KIND = 21000; // Ephemeral (Phase 1)

// Task status enumeration
export enum TaskStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  CLOSED = 'closed',
}

// Priority levels
export enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

// Message types (from Gastown protocol)
export enum MessageType {
  POLECAT_DONE = 'POLECAT_DONE',
  MERGE_READY = 'MERGE_READY',
  MERGED = 'MERGED',
  MERGE_FAILED = 'MERGE_FAILED',
  REWORK_REQUEST = 'REWORK_REQUEST',
  NOTIFICATION = 'notification',
  REPLY = 'reply',
  TASK = 'task',
  SCAVENGE = 'scavenge',
}

// Task event structure
export interface TaskEvent extends Event {
  kind: typeof TASK_EVENT_KIND;
  tags: string[][];
  content: string; // Task description/notes in markdown
}

export interface UnsignedTaskEvent extends UnsignedEvent {
  kind: typeof TASK_EVENT_KIND;
  tags: string[][];
  content: string;
}

// Message event structure
export interface MessageEvent extends Event {
  kind: typeof MESSAGE_EVENT_KIND;
  tags: string[][];
  content: string; // Message body in markdown
}

export interface UnsignedMessageEvent extends UnsignedEvent {
  kind: typeof MESSAGE_EVENT_KIND;
  tags: string[][];
  content: string;
}

// Task tag schema
export interface TaskTags {
  /** Task identifier (d tag - unique within author namespace) */
  id: string;
  /** Task title */
  title: string;
  /** Task status */
  status: TaskStatus;
  /** Event IDs of tasks this task blocks */
  blocks?: string[];
  /** Event IDs of tasks blocking this task */
  blockedBy?: string[];
  /** Event ID of parent task/epic */
  parent?: string;
  /** Priority level */
  priority?: Priority;
}

// Message tag schema
export interface MessageTags {
  /** Recipient pubkey (p tag) */
  recipient: string;
  /** Message subject */
  subject: string;
  /** Message type */
  messageType: MessageType;
  /** Priority level */
  priority?: Priority;
  /** Thread identifier for conversation tracking */
  threadId?: string;
  /** Event ID being replied to (e tag for threading) */
  replyTo?: string;
}

// Helper type for creating task events
export interface CreateTaskParams {
  id: string;
  title: string;
  content: string;
  status?: TaskStatus;
  blocks?: string[];
  blockedBy?: string[];
  parent?: string;
  priority?: Priority;
}

// Helper type for creating message events
export interface CreateMessageParams {
  recipient: string;
  subject: string;
  content: string;
  messageType: MessageType;
  priority?: Priority;
  threadId?: string;
  replyTo?: string;
}

// Query filter types
export interface TaskFilter {
  authors?: string[];
  ids?: string[];
  status?: TaskStatus | TaskStatus[];
  priority?: Priority | Priority[];
  since?: number;
  until?: number;
  limit?: number;
}

export interface MessageFilter {
  authors?: string[];
  recipients?: string[];
  messageType?: MessageType | MessageType[];
  threadId?: string;
  since?: number;
  until?: number;
  limit?: number;
}
