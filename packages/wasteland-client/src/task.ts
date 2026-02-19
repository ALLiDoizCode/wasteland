/**
 * Task event creation and management
 */

import { finalizeEvent, type EventTemplate } from 'nostr-tools';
import {
  TASK_EVENT_KIND,
  TaskStatus,
  Priority,
  type CreateTaskParams,
  type UnsignedTaskEvent,
  type TaskEvent,
} from './types.js';

/**
 * Create a task event (kind 30100)
 *
 * @param params - Task parameters
 * @returns Unsigned task event ready for signing
 */
export function createTaskEvent(params: CreateTaskParams): EventTemplate {
  const {
    id,
    title,
    content,
    status = TaskStatus.OPEN,
    blocks = [],
    blockedBy = [],
    parent,
    priority = Priority.NORMAL,
  } = params;

  const tags: string[][] = [
    ['d', id], // Unique task identifier (parameterized replaceable)
    ['title', title],
    ['status', status],
    ['priority', priority],
  ];

  // Add dependency tags
  blocks.forEach((blockId) => {
    tags.push(['blocks', blockId]);
  });

  blockedBy.forEach((blockerId) => {
    tags.push(['blocked-by', blockerId]);
  });

  // Add parent reference if specified
  if (parent) {
    tags.push(['parent', parent]);
  }

  const eventTemplate: EventTemplate = {
    kind: TASK_EVENT_KIND,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content,
  };

  return eventTemplate;
}

/**
 * Sign a task event template
 *
 * @param eventTemplate - Unsigned event template
 * @param privateKey - Agent's private key (hex string)
 * @returns Signed task event
 */
export function signTaskEvent(
  eventTemplate: EventTemplate,
  privateKey: Uint8Array
): TaskEvent {
  return finalizeEvent(eventTemplate, privateKey) as TaskEvent;
}

/**
 * Update a task event (creates new version with same 'd' tag)
 *
 * @param existingTask - Existing task event
 * @param updates - Fields to update
 * @returns New unsigned task event template
 */
export function updateTaskEvent(
  existingTask: TaskEvent,
  updates: Partial<CreateTaskParams>
): EventTemplate {
  // Extract current values from tags
  const getId = () => existingTask.tags.find((t) => t[0] === 'd')?.[1] || '';
  const getTitle = () =>
    existingTask.tags.find((t) => t[0] === 'title')?.[1] || '';
  const getStatus = () =>
    (existingTask.tags.find((t) => t[0] === 'status')?.[1] as TaskStatus) ||
    TaskStatus.OPEN;
  const getPriority = () =>
    (existingTask.tags.find((t) => t[0] === 'priority')?.[1] as Priority) ||
    Priority.NORMAL;
  const getBlocks = () =>
    existingTask.tags.filter((t) => t[0] === 'blocks').map((t) => t[1]);
  const getBlockedBy = () =>
    existingTask.tags.filter((t) => t[0] === 'blocked-by').map((t) => t[1]);
  const getParent = () =>
    existingTask.tags.find((t) => t[0] === 'parent')?.[1];

  // Merge with updates
  const params: CreateTaskParams = {
    id: updates.id ?? getId(),
    title: updates.title ?? getTitle(),
    content: updates.content ?? existingTask.content,
    status: updates.status ?? getStatus(),
    blocks: updates.blocks ?? getBlocks(),
    blockedBy: updates.blockedBy ?? getBlockedBy(),
    parent: updates.parent ?? getParent(),
    priority: updates.priority ?? getPriority(),
  };

  return createTaskEvent(params);
}

/**
 * Parse task event tags into structured format
 *
 * @param event - Task event
 * @returns Parsed task data
 */
export function parseTaskEvent(event: TaskEvent) {
  const getId = () => event.tags.find((t) => t[0] === 'd')?.[1] || '';
  const getTitle = () => event.tags.find((t) => t[0] === 'title')?.[1] || '';
  const getStatus = () =>
    (event.tags.find((t) => t[0] === 'status')?.[1] as TaskStatus) ||
    TaskStatus.OPEN;
  const getPriority = () =>
    (event.tags.find((t) => t[0] === 'priority')?.[1] as Priority) ||
    Priority.NORMAL;
  const getBlocks = () =>
    event.tags.filter((t) => t[0] === 'blocks').map((t) => t[1]);
  const getBlockedBy = () =>
    event.tags.filter((t) => t[0] === 'blocked-by').map((t) => t[1]);
  const getParent = () => event.tags.find((t) => t[0] === 'parent')?.[1];

  return {
    id: getId(),
    eventId: event.id,
    author: event.pubkey,
    title: getTitle(),
    content: event.content,
    status: getStatus(),
    priority: getPriority(),
    blocks: getBlocks(),
    blockedBy: getBlockedBy(),
    parent: getParent(),
    createdAt: event.created_at,
  };
}
