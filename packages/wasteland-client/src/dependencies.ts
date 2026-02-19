/**
 * Dependency graph traversal for task management
 */

import type { TaskEvent } from './types.js';
import { parseTaskEvent } from './task.js';

export interface DependencyNode {
  eventId: string;
  taskId: string;
  title: string;
  status: string;
  blocks: string[]; // Event IDs this task blocks
  blockedBy: string[]; // Event IDs blocking this task
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
}

/**
 * Build a dependency graph from an array of task events
 *
 * @param tasks - Array of task events
 * @returns Dependency graph structure
 */
export function buildDependencyGraph(tasks: TaskEvent[]): DependencyGraph {
  const nodes = new Map<string, DependencyNode>();

  for (const task of tasks) {
    const parsed = parseTaskEvent(task);

    const node: DependencyNode = {
      eventId: parsed.eventId,
      taskId: parsed.id,
      title: parsed.title,
      status: parsed.status,
      blocks: parsed.blocks || [],
      blockedBy: parsed.blockedBy || [],
    };

    nodes.set(parsed.eventId, node);
  }

  return { nodes };
}

/**
 * Get all tasks blocked by a specific task
 *
 * @param taskEventId - Event ID of the task
 * @param graph - Dependency graph
 * @returns Array of event IDs blocked by this task
 */
export function getBlockedTasks(
  taskEventId: string,
  graph: DependencyGraph
): string[] {
  const node = graph.nodes.get(taskEventId);
  if (!node) {
    return [];
  }

  return node.blocks;
}

/**
 * Get all tasks blocking a specific task
 *
 * @param taskEventId - Event ID of the task
 * @param graph - Dependency graph
 * @returns Array of event IDs blocking this task
 */
export function getBlockingTasks(
  taskEventId: string,
  graph: DependencyGraph
): string[] {
  const node = graph.nodes.get(taskEventId);
  if (!node) {
    return [];
  }

  return node.blockedBy;
}

/**
 * Check if a task is ready (has no blocking dependencies)
 *
 * @param taskEventId - Event ID of the task
 * @param graph - Dependency graph
 * @returns True if task is ready (no blockers), false otherwise
 */
export function isTaskReady(
  taskEventId: string,
  graph: DependencyGraph
): boolean {
  const node = graph.nodes.get(taskEventId);
  if (!node) {
    return false;
  }

  return node.blockedBy.length === 0;
}

/**
 * Get all ready tasks from the graph
 *
 * @param graph - Dependency graph
 * @returns Array of event IDs for tasks that are ready
 */
export function getReadyTasks(graph: DependencyGraph): string[] {
  const readyTasks: string[] = [];

  for (const [eventId, node] of graph.nodes) {
    if (node.blockedBy.length === 0 && node.status !== 'closed') {
      readyTasks.push(eventId);
    }
  }

  return readyTasks;
}

/**
 * Get all descendants of a task (tasks that would be unblocked by completing this task)
 *
 * @param taskEventId - Event ID of the task
 * @param graph - Dependency graph
 * @returns Array of all descendant event IDs
 */
export function getDescendants(
  taskEventId: string,
  graph: DependencyGraph
): string[] {
  const descendants = new Set<string>();
  const queue = [taskEventId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const blocked = getBlockedTasks(current, graph);

    for (const blockedId of blocked) {
      if (!descendants.has(blockedId)) {
        descendants.add(blockedId);
        queue.push(blockedId);
      }
    }
  }

  return Array.from(descendants);
}

/**
 * Get all ancestors of a task (tasks that must be completed before this task can start)
 *
 * @param taskEventId - Event ID of the task
 * @param graph - Dependency graph
 * @returns Array of all ancestor event IDs
 */
export function getAncestors(
  taskEventId: string,
  graph: DependencyGraph
): string[] {
  const ancestors = new Set<string>();
  const queue = [taskEventId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const blockers = getBlockingTasks(current, graph);

    for (const blockerId of blockers) {
      if (!ancestors.has(blockerId)) {
        ancestors.add(blockerId);
        queue.push(blockerId);
      }
    }
  }

  return Array.from(ancestors);
}

/**
 * Check for circular dependencies in the graph
 *
 * @param graph - Dependency graph
 * @returns Array of event IDs involved in circular dependencies (empty if none)
 */
export function detectCircularDependencies(graph: DependencyGraph): string[] {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const circularNodes: string[] = [];

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const blocked = getBlockedTasks(nodeId, graph);

    for (const blockedId of blocked) {
      if (!visited.has(blockedId)) {
        if (dfs(blockedId)) {
          circularNodes.push(nodeId);
          return true;
        }
      } else if (recursionStack.has(blockedId)) {
        circularNodes.push(nodeId);
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const [nodeId] of graph.nodes) {
    if (!visited.has(nodeId)) {
      dfs(nodeId);
    }
  }

  return circularNodes;
}

/**
 * Get topologically sorted tasks (tasks in order they can be completed)
 *
 * @param graph - Dependency graph
 * @returns Array of event IDs in topological order, or empty array if circular dependencies exist
 */
export function topologicalSort(graph: DependencyGraph): string[] {
  const circular = detectCircularDependencies(graph);
  if (circular.length > 0) {
    console.warn('Circular dependencies detected, cannot sort topologically');
    return [];
  }

  const sorted: string[] = [];
  const visited = new Set<string>();

  function visit(nodeId: string) {
    if (visited.has(nodeId)) {
      return;
    }

    visited.add(nodeId);

    // Visit all dependencies first
    const blockers = getBlockingTasks(nodeId, graph);
    for (const blockerId of blockers) {
      visit(blockerId);
    }

    sorted.push(nodeId);
  }

  for (const [nodeId] of graph.nodes) {
    visit(nodeId);
  }

  return sorted;
}
