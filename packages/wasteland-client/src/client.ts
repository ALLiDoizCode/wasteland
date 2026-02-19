/**
 * High-level WastelandClient for task and message management
 */

import type WebSocket from 'ws';
import { generateSecretKey, getPublicKey, type EventTemplate } from 'nostr-tools';
import {
  connectToRelay,
  disconnectFromRelay,
  publishEvent,
  type ILPPaymentConfig,
} from './relay.js';
import {
  createTaskEvent,
  signTaskEvent,
  updateTaskEvent,
  parseTaskEvent,
} from './task.js';
import {
  createMessageEvent,
  signMessageEvent,
  createReplyMessage,
  parseMessageEvent,
  publishMessage,
} from './message.js';
import {
  queryTasks,
  subscribeToTasks,
  findReadyTasks,
  queryMessages,
  subscribeToMessages as subscribeToMessagesLowLevel,
} from './query.js';
import { buildDependencyGraph } from './dependencies.js';
import type {
  TaskStatus,
  Priority,
  MessageType,
  TaskFilter,
  MessageFilter,
  TaskEvent,
  MessageEvent,
  CreateTaskParams,
  CreateMessageParams,
} from './types.js';

export interface WastelandClientConfig {
  relayUrl: string;
  privateKey?: Uint8Array;
  ilpConfig?: ILPPaymentConfig;
}

export class WastelandClient {
  private relayUrl: string;
  private privateKey: Uint8Array;
  public publicKey: string;
  private ws: WebSocket | null = null;
  private ilpConfig?: ILPPaymentConfig;
  private subscriptions: Map<string, () => void> = new Map();

  constructor(config: WastelandClientConfig) {
    this.relayUrl = config.relayUrl;
    this.privateKey = config.privateKey || generateSecretKey();
    this.publicKey = getPublicKey(this.privateKey);
    this.ilpConfig = config.ilpConfig;
  }

  /**
   * Connect to the relay
   */
  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === 1) {
      console.log('Already connected to relay');
      return;
    }

    this.ws = await connectToRelay(this.relayUrl);
    console.log(`WastelandClient connected to ${this.relayUrl}`);
  }

  /**
   * Disconnect from the relay
   */
  disconnect(): void {
    if (this.ws) {
      disconnectFromRelay(this.ws);
      this.ws = null;
      this.subscriptions.clear();
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === 1;
  }

  /**
   * Ensure connection is established
   */
  private ensureConnected(): WebSocket {
    if (!this.ws || this.ws.readyState !== 1) {
      throw new Error('Not connected to relay. Call connect() first.');
    }
    return this.ws;
  }

  // ===== TASK MANAGEMENT API =====

  /**
   * Create a new task
   */
  async createTask(params: CreateTaskParams): Promise<string> {
    const ws = this.ensureConnected();

    const eventTemplate = createTaskEvent(params);
    const signedEvent = signTaskEvent(eventTemplate, this.privateKey);

    return publishEvent(ws, signedEvent, this.ilpConfig);
  }

  /**
   * Update an existing task
   */
  async updateTask(
    existingTask: TaskEvent,
    updates: Partial<CreateTaskParams>
  ): Promise<string> {
    const ws = this.ensureConnected();

    const eventTemplate = updateTaskEvent(existingTask, updates);
    const signedEvent = signTaskEvent(eventTemplate, this.privateKey);

    return publishEvent(ws, signedEvent, this.ilpConfig);
  }

  /**
   * Query tasks with filters
   */
  async queryTasks(filter?: TaskFilter): Promise<TaskEvent[]> {
    const ws = this.ensureConnected();
    return queryTasks(ws, filter || {});
  }

  /**
   * Find ready tasks (no blockers)
   */
  async findReady(authorPubkey?: string): Promise<TaskEvent[]> {
    const ws = this.ensureConnected();
    // If authorPubkey is explicitly '', search all tasks (no author filter)
    // If undefined, default to this agent's tasks
    // Otherwise, search for specified author
    const author = authorPubkey === '' ? undefined : (authorPubkey ?? this.publicKey);
    return findReadyTasks(ws, author);
  }

  /**
   * Subscribe to task updates in real-time
   */
  subscribeToTaskUpdates(
    filter: TaskFilter,
    callback: (task: TaskEvent) => void
  ): string {
    const ws = this.ensureConnected();
    return subscribeToTasks(ws, filter, callback);
  }

  /**
   * Get my tasks (tasks authored by this agent)
   */
  async getMyTasks(status?: TaskStatus | TaskStatus[]): Promise<TaskEvent[]> {
    const filter: TaskFilter = {
      authors: [this.publicKey],
    };

    if (status) {
      filter.status = status;
    }

    return this.queryTasks(filter);
  }

  /**
   * Build dependency graph from tasks
   */
  async getDependencyGraph(filter?: TaskFilter): Promise<ReturnType<typeof buildDependencyGraph>> {
    const tasks = await this.queryTasks(filter || {});
    return buildDependencyGraph(tasks);
  }

  // ===== MESSAGING API =====

  /**
   * Send a message
   */
  async sendMessage(params: CreateMessageParams): Promise<string> {
    const ws = this.ensureConnected();

    const eventTemplate = createMessageEvent(params);
    const signedEvent = signMessageEvent(eventTemplate, this.privateKey);

    return publishMessage(ws, signedEvent, this.ilpConfig);
  }

  /**
   * Reply to a message
   */
  async replyToMessage(
    originalMessage: MessageEvent,
    replyContent: string
  ): Promise<string> {
    const ws = this.ensureConnected();

    const eventTemplate = createReplyMessage(
      originalMessage,
      replyContent,
      this.publicKey
    );
    const signedEvent = signMessageEvent(eventTemplate, this.privateKey);

    return publishMessage(ws, signedEvent, this.ilpConfig);
  }

  /**
   * Query messages with filters
   */
  async queryMessages(filter?: MessageFilter): Promise<MessageEvent[]> {
    const ws = this.ensureConnected();
    return queryMessages(ws, filter || {});
  }

  /**
   * Subscribe to incoming messages for this agent
   */
  subscribeToMessages(callback: (message: MessageEvent) => void): string {
    const ws = this.ensureConnected();
    return subscribeToMessagesLowLevel(ws, this.publicKey, callback);
  }

  /**
   * Get messages sent to this agent
   */
  async getMyMessages(filter?: Omit<MessageFilter, 'recipients'>): Promise<MessageEvent[]> {
    const fullFilter: MessageFilter = {
      ...filter,
      recipients: [this.publicKey],
    };

    return this.queryMessages(fullFilter);
  }

  /**
   * Send a POLECAT_DONE message
   */
  async sendPolecatDone(
    recipient: string,
    taskId: string,
    notes?: string
  ): Promise<string> {
    return this.sendMessage({
      recipient,
      subject: `Task Completed: ${taskId}`,
      content: notes || `Task ${taskId} completed`,
      messageType: 'POLECAT_DONE' as MessageType,
    });
  }

  /**
   * Send a notification
   */
  async sendNotification(
    recipient: string,
    subject: string,
    content: string,
    priority?: Priority
  ): Promise<string> {
    return this.sendMessage({
      recipient,
      subject,
      content,
      messageType: 'notification' as MessageType,
      priority,
    });
  }
}
