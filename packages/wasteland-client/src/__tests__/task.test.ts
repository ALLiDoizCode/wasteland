/**
 * Unit tests for task event creation and management
 */

import { describe, it, expect } from 'vitest';
import { generateSecretKey } from 'nostr-tools';
import {
  createTaskEvent,
  signTaskEvent,
  updateTaskEvent,
  parseTaskEvent,
} from '../task.js';
import { TASK_EVENT_KIND, TaskStatus, Priority } from '../types.js';

describe('Task Event Creation', () => {
  it('should create a task event with required fields', () => {
    const event = createTaskEvent({
      id: 'task-1',
      title: 'Test Task',
      content: 'This is a test task',
    });

    expect(event.kind).toBe(TASK_EVENT_KIND);
    expect(event.content).toBe('This is a test task');
    expect(event.tags).toContainEqual(['d', 'task-1']);
    expect(event.tags).toContainEqual(['title', 'Test Task']);
    expect(event.tags).toContainEqual(['status', TaskStatus.OPEN]);
    expect(event.tags).toContainEqual(['priority', Priority.NORMAL]);
  });

  it('should create task with custom status and priority', () => {
    const event = createTaskEvent({
      id: 'task-2',
      title: 'Urgent Task',
      content: 'High priority task',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.URGENT,
    });

    expect(event.tags).toContainEqual(['status', TaskStatus.IN_PROGRESS]);
    expect(event.tags).toContainEqual(['priority', Priority.URGENT]);
  });

  it('should include dependency tags', () => {
    const event = createTaskEvent({
      id: 'task-3',
      title: 'Dependent Task',
      content: 'Has dependencies',
      blocks: ['event-id-1', 'event-id-2'],
      blockedBy: ['event-id-3'],
    });

    expect(event.tags).toContainEqual(['blocks', 'event-id-1']);
    expect(event.tags).toContainEqual(['blocks', 'event-id-2']);
    expect(event.tags).toContainEqual(['blocked-by', 'event-id-3']);
  });

  it('should include parent tag when provided', () => {
    const event = createTaskEvent({
      id: 'task-4',
      title: 'Child Task',
      content: 'Has parent',
      parent: 'parent-event-id',
    });

    expect(event.tags).toContainEqual(['parent', 'parent-event-id']);
  });
});

describe('Task Event Signing', () => {
  it('should sign task event with private key', () => {
    const privateKey = generateSecretKey();
    const event = createTaskEvent({
      id: 'task-5',
      title: 'Sign Test',
      content: 'Testing signing',
    });

    const signed = signTaskEvent(event, privateKey);

    expect(signed.id).toBeDefined();
    expect(signed.pubkey).toBeDefined();
    expect(signed.sig).toBeDefined();
    expect(signed.kind).toBe(TASK_EVENT_KIND);
  });
});

describe('Task Event Updating', () => {
  it('should update task status', () => {
    const privateKey = generateSecretKey();
    const original = createTaskEvent({
      id: 'task-6',
      title: 'Update Test',
      content: 'Original',
      status: TaskStatus.OPEN,
    });
    const signed = signTaskEvent(original, privateKey);

    const updated = updateTaskEvent(signed, {
      status: TaskStatus.CLOSED,
    });

    expect(updated.tags).toContainEqual(['status', TaskStatus.CLOSED]);
    expect(updated.tags).toContainEqual(['title', 'Update Test']);
  });

  it('should update multiple fields', () => {
    const privateKey = generateSecretKey();
    const original = createTaskEvent({
      id: 'task-7',
      title: 'Original Title',
      content: 'Original content',
    });
    const signed = signTaskEvent(original, privateKey);

    const updated = updateTaskEvent(signed, {
      title: 'Updated Title',
      content: 'Updated content',
      priority: Priority.HIGH,
    });

    expect(updated.tags).toContainEqual(['title', 'Updated Title']);
    expect(updated.content).toBe('Updated content');
    expect(updated.tags).toContainEqual(['priority', Priority.HIGH]);
  });
});

describe('Task Event Parsing', () => {
  it('should parse task event into structured format', () => {
    const privateKey = generateSecretKey();
    const event = createTaskEvent({
      id: 'task-8',
      title: 'Parse Test',
      content: 'Testing parsing',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      blocks: ['blocked-1'],
      blockedBy: ['blocker-1', 'blocker-2'],
      parent: 'parent-1',
    });
    const signed = signTaskEvent(event, privateKey);

    const parsed = parseTaskEvent(signed);

    expect(parsed.id).toBe('task-8');
    expect(parsed.title).toBe('Parse Test');
    expect(parsed.content).toBe('Testing parsing');
    expect(parsed.status).toBe(TaskStatus.IN_PROGRESS);
    expect(parsed.priority).toBe(Priority.HIGH);
    expect(parsed.blocks).toEqual(['blocked-1']);
    expect(parsed.blockedBy).toEqual(['blocker-1', 'blocker-2']);
    expect(parsed.parent).toBe('parent-1');
    expect(parsed.eventId).toBe(signed.id);
    expect(parsed.author).toBe(signed.pubkey);
  });
});
