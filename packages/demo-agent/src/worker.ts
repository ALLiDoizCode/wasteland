/**
 * Simple task worker agent for POC
 */

import { WastelandClient } from '@wasteland/client';
import type { TaskEvent } from '@wasteland/client';
import { TaskStatus } from '@wasteland/client';

export interface WorkerConfig {
  relayUrl: string;
  privateKey?: Uint8Array;
  agentName: string;
  pollingInterval?: number; // milliseconds
  workDurationMin?: number; // seconds
  workDurationMax?: number; // seconds
  notifyPubkey?: string; // Optional pubkey to notify when tasks complete
}

export class TaskWorker {
  private client: WastelandClient;
  private config: Required<Omit<WorkerConfig, 'privateKey' | 'notifyPubkey'>> & Pick<WorkerConfig, 'notifyPubkey'>;
  private running = false;
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(config: WorkerConfig) {
    this.client = new WastelandClient({
      relayUrl: config.relayUrl,
      privateKey: config.privateKey,
    });

    this.config = {
      relayUrl: config.relayUrl,
      agentName: config.agentName,
      pollingInterval: config.pollingInterval ?? 5000,
      workDurationMin: config.workDurationMin ?? 2,
      workDurationMax: config.workDurationMax ?? 5,
      notifyPubkey: config.notifyPubkey,
    };
  }

  /**
   * Start the worker agent
   */
  async start(): Promise<void> {
    console.log(`Starting worker agent: ${this.config.agentName}`);
    console.log(`Public key: ${this.client.publicKey}`);

    await this.client.connect();

    this.running = true;
    this.scheduleNextPoll();

    console.log('Worker agent started. Polling for ready tasks...');
  }

  /**
   * Stop the worker agent
   */
  stop(): void {
    console.log('Stopping worker agent...');
    this.running = false;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    this.client.disconnect();
    console.log('Worker agent stopped');
  }

  /**
   * Schedule next task poll
   */
  private scheduleNextPoll(): void {
    if (!this.running) {
      return;
    }

    this.pollTimer = setTimeout(() => {
      this.pollForTasks().catch((error) => {
        console.error('Error polling for tasks:', error);
        this.scheduleNextPoll();
      });
    }, this.config.pollingInterval);
  }

  /**
   * Poll for ready tasks and process one
   */
  private async pollForTasks(): Promise<void> {
    try {
      // Find ready tasks (no blockers, open or in_progress status)
      const readyTasks = await this.client.findReady();

      if (readyTasks.length === 0) {
        console.log('No ready tasks found');
        this.scheduleNextPoll();
        return;
      }

      // Filter for open tasks only (not already claimed)
      const openTasks = readyTasks.filter((task) => {
        const statusTag = task.tags.find((t) => t[0] === 'status');
        return statusTag && statusTag[1] === TaskStatus.OPEN;
      });

      if (openTasks.length === 0) {
        console.log('No open tasks found (all ready tasks are already claimed)');
        this.scheduleNextPoll();
        return;
      }

      // Pick the first open task
      const task = openTasks[0];
      await this.processTask(task);
    } catch (error) {
      console.error('Error in pollForTasks:', error);
    }

    this.scheduleNextPoll();
  }

  /**
   * Process a single task
   */
  private async processTask(task: TaskEvent): Promise<void> {
    const taskId = task.tags.find((t) => t[0] === 'd')?.[1] || 'unknown';
    const title = task.tags.find((t) => t[0] === 'title')?.[1] || 'Untitled';

    console.log(`\n=== Processing Task ===`);
    console.log(`Task ID: ${taskId}`);
    console.log(`Title: ${title}`);
    console.log(`Event ID: ${task.id}`);

    // Step 1: Claim task by updating status to in_progress
    console.log('Claiming task...');
    try {
      await this.client.updateTask(task, {
        status: TaskStatus.IN_PROGRESS,
      });
      console.log('Task claimed successfully');
    } catch (error) {
      console.error('Failed to claim task:', error);
      return;
    }

    // Step 2: Simulate work
    const workDuration =
      Math.random() *
        (this.config.workDurationMax - this.config.workDurationMin) +
      this.config.workDurationMin;

    console.log(`Working on task for ${workDuration.toFixed(1)} seconds...`);
    await this.sleep(workDuration * 1000);

    // Step 3: Complete task
    console.log('Completing task...');
    try {
      await this.client.updateTask(task, {
        status: TaskStatus.CLOSED,
      });
      console.log('Task completed successfully');
    } catch (error) {
      console.error('Failed to complete task:', error);
      return;
    }

    // Step 4: Send POLECAT_DONE message if notify pubkey is configured
    if (this.config.notifyPubkey) {
      console.log('Sending POLECAT_DONE message...');
      try {
        await this.client.sendPolecatDone(
          this.config.notifyPubkey,
          taskId,
          `Task "${title}" completed by ${this.config.agentName}`
        );
        console.log('POLECAT_DONE message sent');
      } catch (error) {
        console.error('Failed to send POLECAT_DONE message:', error);
      }
    }

    console.log('=== Task Complete ===\n');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get agent's public key
   */
  getPublicKey(): string {
    return this.client.publicKey;
  }
}
