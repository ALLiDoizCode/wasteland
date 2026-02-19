/**
 * Unit tests for dependency graph traversal
 */

import { describe, it, expect } from 'vitest';
import { generateSecretKey } from 'nostr-tools';
import { createTaskEvent, signTaskEvent } from '../task.js';
import { TaskStatus } from '../types.js';
import {
  buildDependencyGraph,
  getBlockedTasks,
  getBlockingTasks,
  isTaskReady,
  getReadyTasks,
  getDescendants,
  getAncestors,
  detectCircularDependencies,
  topologicalSort,
} from '../dependencies.js';

describe('Dependency Graph Construction', () => {
  it('should build graph from tasks', () => {
    const privateKey = generateSecretKey();

    const task1 = signTaskEvent(
      createTaskEvent({
        id: 'task-1',
        title: 'Task 1',
        content: 'First task',
      }),
      privateKey
    );

    const task2 = signTaskEvent(
      createTaskEvent({
        id: 'task-2',
        title: 'Task 2',
        content: 'Second task',
        blockedBy: [task1.id],
      }),
      privateKey
    );

    const graph = buildDependencyGraph([task1, task2]);

    expect(graph.nodes.size).toBe(2);
    expect(graph.nodes.has(task1.id)).toBe(true);
    expect(graph.nodes.has(task2.id)).toBe(true);
  });
});

describe('Dependency Queries', () => {
  it('should find blocked tasks', () => {
    const privateKey = generateSecretKey();

    const task1 = signTaskEvent(
      createTaskEvent({
        id: 'task-1',
        title: 'Task 1',
        content: 'Blocks task 2',
        blocks: [],
      }),
      privateKey
    );

    const task2 = signTaskEvent(
      createTaskEvent({
        id: 'task-2',
        title: 'Task 2',
        content: 'Blocked by task 1',
        blockedBy: [task1.id],
      }),
      privateKey
    );

    // Update task1 to block task2
    const task1Updated = signTaskEvent(
      createTaskEvent({
        id: 'task-1',
        title: 'Task 1',
        content: 'Blocks task 2',
        blocks: [task2.id],
      }),
      privateKey
    );

    const graph = buildDependencyGraph([task1Updated, task2]);
    const blocked = getBlockedTasks(task1Updated.id, graph);

    expect(blocked).toContain(task2.id);
  });

  it('should find blocking tasks', () => {
    const privateKey = generateSecretKey();

    const task1 = signTaskEvent(
      createTaskEvent({
        id: 'task-1',
        title: 'Task 1',
        content: 'Blocks task 2',
      }),
      privateKey
    );

    const task2 = signTaskEvent(
      createTaskEvent({
        id: 'task-2',
        title: 'Task 2',
        content: 'Blocked by task 1',
        blockedBy: [task1.id],
      }),
      privateKey
    );

    const graph = buildDependencyGraph([task1, task2]);
    const blockers = getBlockingTasks(task2.id, graph);

    expect(blockers).toContain(task1.id);
  });

  it('should identify ready tasks', () => {
    const privateKey = generateSecretKey();

    const task1 = signTaskEvent(
      createTaskEvent({
        id: 'task-1',
        title: 'Ready Task',
        content: 'No blockers',
      }),
      privateKey
    );

    const task2 = signTaskEvent(
      createTaskEvent({
        id: 'task-2',
        title: 'Blocked Task',
        content: 'Has blockers',
        blockedBy: [task1.id],
      }),
      privateKey
    );

    const graph = buildDependencyGraph([task1, task2]);

    expect(isTaskReady(task1.id, graph)).toBe(true);
    expect(isTaskReady(task2.id, graph)).toBe(false);
  });

  it('should get all ready tasks from graph', () => {
    const privateKey = generateSecretKey();

    const task1 = signTaskEvent(
      createTaskEvent({
        id: 'task-1',
        title: 'Ready 1',
        content: 'No blockers',
      }),
      privateKey
    );

    const task2 = signTaskEvent(
      createTaskEvent({
        id: 'task-2',
        title: 'Blocked',
        content: 'Has blockers',
        blockedBy: [task1.id],
      }),
      privateKey
    );

    const task3 = signTaskEvent(
      createTaskEvent({
        id: 'task-3',
        title: 'Ready 2',
        content: 'No blockers',
      }),
      privateKey
    );

    const graph = buildDependencyGraph([task1, task2, task3]);
    const ready = getReadyTasks(graph);

    expect(ready).toHaveLength(2);
    expect(ready).toContain(task1.id);
    expect(ready).toContain(task3.id);
  });
});

describe('Graph Traversal', () => {
  it('should find all descendants', () => {
    const privateKey = generateSecretKey();

    const taskA = signTaskEvent(
      createTaskEvent({
        id: 'task-a',
        title: 'A',
        content: 'Root',
      }),
      privateKey
    );

    const taskB = signTaskEvent(
      createTaskEvent({
        id: 'task-b',
        title: 'B',
        content: 'Child of A',
        blockedBy: [taskA.id],
      }),
      privateKey
    );

    const taskC = signTaskEvent(
      createTaskEvent({
        id: 'task-c',
        title: 'C',
        content: 'Child of B',
        blockedBy: [taskB.id],
      }),
      privateKey
    );

    // Update tasks to include blocks relationships
    const taskAUpdated = signTaskEvent(
      createTaskEvent({
        id: 'task-a',
        title: 'A',
        content: 'Root',
        blocks: [taskB.id],
      }),
      privateKey
    );

    const taskBUpdated = signTaskEvent(
      createTaskEvent({
        id: 'task-b',
        title: 'B',
        content: 'Child of A',
        blockedBy: [taskAUpdated.id],
        blocks: [taskC.id],
      }),
      privateKey
    );

    const graph = buildDependencyGraph([taskAUpdated, taskBUpdated, taskC]);
    const descendants = getDescendants(taskAUpdated.id, graph);

    expect(descendants).toContain(taskBUpdated.id);
    expect(descendants).toContain(taskC.id);
  });

  it('should find all ancestors', () => {
    const privateKey = generateSecretKey();

    const taskA = signTaskEvent(
      createTaskEvent({
        id: 'task-a',
        title: 'A',
        content: 'Root',
      }),
      privateKey
    );

    const taskB = signTaskEvent(
      createTaskEvent({
        id: 'task-b',
        title: 'B',
        content: 'Child of A',
        blockedBy: [taskA.id],
      }),
      privateKey
    );

    const taskC = signTaskEvent(
      createTaskEvent({
        id: 'task-c',
        title: 'C',
        content: 'Child of B',
        blockedBy: [taskB.id],
      }),
      privateKey
    );

    const graph = buildDependencyGraph([taskA, taskB, taskC]);
    const ancestors = getAncestors(taskC.id, graph);

    expect(ancestors).toContain(taskA.id);
    expect(ancestors).toContain(taskB.id);
  });
});

describe('Circular Dependency Detection', () => {
  it('should detect no circular dependencies in valid graph', () => {
    const privateKey = generateSecretKey();

    const task1 = signTaskEvent(
      createTaskEvent({
        id: 'task-1',
        title: 'Task 1',
        content: 'First',
      }),
      privateKey
    );

    const task2 = signTaskEvent(
      createTaskEvent({
        id: 'task-2',
        title: 'Task 2',
        content: 'Second',
        blockedBy: [task1.id],
      }),
      privateKey
    );

    const graph = buildDependencyGraph([task1, task2]);
    const circular = detectCircularDependencies(graph);

    expect(circular).toHaveLength(0);
  });
});

describe('Topological Sort', () => {
  it('should sort tasks in dependency order', () => {
    const privateKey = generateSecretKey();

    const taskA = signTaskEvent(
      createTaskEvent({
        id: 'task-a',
        title: 'A',
        content: 'Root',
      }),
      privateKey
    );

    const taskB = signTaskEvent(
      createTaskEvent({
        id: 'task-b',
        title: 'B',
        content: 'Depends on A',
        blockedBy: [taskA.id],
      }),
      privateKey
    );

    const taskC = signTaskEvent(
      createTaskEvent({
        id: 'task-c',
        title: 'C',
        content: 'Independent',
      }),
      privateKey
    );

    const graph = buildDependencyGraph([taskB, taskA, taskC]);
    const sorted = topologicalSort(graph);

    // A should come before B in the sorted order
    const indexA = sorted.indexOf(taskA.id);
    const indexB = sorted.indexOf(taskB.id);

    expect(indexA).toBeLessThan(indexB);
  });
});
