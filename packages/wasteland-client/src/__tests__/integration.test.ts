/**
 * Integration tests for Wasteland client
 *
 * These tests require a running Crosstown relay.
 * Run with: docker-compose up relay
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateSecretKey } from 'nostr-tools';
import { WastelandClient } from '../client.js';
import { TaskStatus, Priority, MessageType } from '../types.js';

const RELAY_URL = process.env.TEST_RELAY_URL || 'ws://localhost:7001';
const TEST_TIMEOUT = 30000; // 30 seconds for integration tests

describe('Integration Tests', () => {
  describe(
    'End-to-End Workflow',
    () => {
      let client: WastelandClient;

      beforeAll(async () => {
        client = new WastelandClient({
          relayUrl: RELAY_URL,
          privateKey: generateSecretKey(),
        });
        await client.connect();
      });

      afterAll(() => {
        client.disconnect();
      });

      it('should complete full task lifecycle', async () => {
        const taskId = `integration-task-${Date.now()}`;

        // Create task
        const createEventId = await client.createTask({
          id: taskId,
          title: 'Integration Test Task',
          content: 'Testing full lifecycle',
          status: TaskStatus.OPEN,
          priority: Priority.NORMAL,
        });

        expect(createEventId).toBeDefined();

        // Wait for propagation
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Query task
        const tasks = await client.queryTasks({
          authors: [client.publicKey],
        });

        const createdTask = tasks.find((t) =>
          t.tags.some((tag) => tag[0] === 'd' && tag[1] === taskId)
        );
        expect(createdTask).toBeDefined();

        if (!createdTask) {
          throw new Error('Task not found');
        }

        // Update task status
        const updateEventId = await client.updateTask(createdTask, {
          status: TaskStatus.CLOSED,
        });

        expect(updateEventId).toBeDefined();

        // Wait for propagation
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Verify update
        const updatedTasks = await client.queryTasks({
          authors: [client.publicKey],
        });

        const updatedTask = updatedTasks.find((t) =>
          t.tags.some((tag) => tag[0] === 'd' && tag[1] === taskId)
        );

        expect(updatedTask).toBeDefined();
        expect(
          updatedTask?.tags.some(
            (tag) => tag[0] === 'status' && tag[1] === TaskStatus.CLOSED
          )
        ).toBe(true);
      }, TEST_TIMEOUT);

      it('should send and query messages', async () => {
        const recipientKey = generateSecretKey();
        const recipientClient = new WastelandClient({
          relayUrl: RELAY_URL,
          privateKey: recipientKey,
        });
        await recipientClient.connect();

        // Send message
        const messageEventId = await client.sendMessage({
          recipient: recipientClient.publicKey,
          subject: 'Integration Test Message',
          content: 'Testing message sending',
          messageType: MessageType.NOTIFICATION,
          priority: Priority.NORMAL,
        });

        expect(messageEventId).toBeDefined();

        // Wait for propagation
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Query messages
        const messages = await recipientClient.getMyMessages();

        const sentMessage = messages.find((m) => m.id === messageEventId);
        expect(sentMessage).toBeDefined();

        recipientClient.disconnect();
      }, TEST_TIMEOUT);
    },
    { timeout: TEST_TIMEOUT }
  );

  describe(
    'Multi-Agent Scenarios',
    () => {
      let agent1: WastelandClient;
      let agent2: WastelandClient;

      beforeAll(async () => {
        agent1 = new WastelandClient({
          relayUrl: RELAY_URL,
          privateKey: generateSecretKey(),
        });

        agent2 = new WastelandClient({
          relayUrl: RELAY_URL,
          privateKey: generateSecretKey(),
        });

        await agent1.connect();
        await agent2.connect();
      });

      afterAll(() => {
        agent1.disconnect();
        agent2.disconnect();
      });

      it('should allow agent1 to create task and agent2 to find it', async () => {
        const taskId = `multi-agent-task-${Date.now()}`;

        // Agent 1 creates task
        await agent1.createTask({
          id: taskId,
          title: 'Multi-Agent Task',
          content: 'Created by agent 1',
        });

        // Wait for propagation
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Agent 2 queries all tasks
        const allTasks = await agent2.queryTasks({});

        const foundTask = allTasks.find((t) =>
          t.tags.some((tag) => tag[0] === 'd' && tag[1] === taskId)
        );

        expect(foundTask).toBeDefined();
        expect(foundTask?.pubkey).toBe(agent1.publicKey);
      }, TEST_TIMEOUT);

      it('should support agent-to-agent messaging', async () => {
        // Agent 1 sends message to Agent 2
        await agent1.sendMessage({
          recipient: agent2.publicKey,
          subject: 'Test Message',
          content: 'Hello Agent 2',
          messageType: MessageType.NOTIFICATION,
        });

        // Wait for propagation
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Agent 2 receives message
        const messages = await agent2.getMyMessages();

        const receivedMessage = messages.find(
          (m) => m.pubkey === agent1.publicKey
        );

        expect(receivedMessage).toBeDefined();

        if (!receivedMessage) {
          throw new Error('Message not found');
        }

        // Agent 2 replies
        await agent2.replyToMessage(receivedMessage, 'Hello Agent 1');

        // Wait for propagation
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Agent 1 receives reply
        const repliesAgent1 = await agent1.getMyMessages();

        const receivedReply = repliesAgent1.find(
          (m) => m.pubkey === agent2.publicKey
        );

        expect(receivedReply).toBeDefined();
      }, TEST_TIMEOUT);
    },
    { timeout: TEST_TIMEOUT }
  );

  describe(
    'Ready Task Detection',
    () => {
      let client: WastelandClient;

      beforeAll(async () => {
        client = new WastelandClient({
          relayUrl: RELAY_URL,
          privateKey: generateSecretKey(),
        });
        await client.connect();
      });

      afterAll(() => {
        client.disconnect();
      });

      it('should find ready tasks with no blockers', async () => {
        const task1Id = `ready-task-1-${Date.now()}`;
        const task2Id = `ready-task-2-${Date.now()}`;

        // Create task 1 (ready - no blockers)
        await client.createTask({
          id: task1Id,
          title: 'Ready Task 1',
          content: 'No blockers',
        });

        // Create task 1 event first to get its event ID
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const tasks = await client.queryTasks({
          authors: [client.publicKey],
        });

        const task1 = tasks.find((t) =>
          t.tags.some((tag) => tag[0] === 'd' && tag[1] === task1Id)
        );

        if (!task1) {
          throw new Error('Task 1 not found');
        }

        // Create task 2 (blocked by task 1)
        await client.createTask({
          id: task2Id,
          title: 'Blocked Task 2',
          content: 'Blocked by task 1',
          blockedBy: [task1.id],
        });

        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Find ready tasks
        const readyTasks = await client.findReady(client.publicKey);

        // Task 1 should be ready, Task 2 should not
        const task1Ready = readyTasks.some((t) =>
          t.tags.some((tag) => tag[0] === 'd' && tag[1] === task1Id)
        );
        const task2Ready = readyTasks.some((t) =>
          t.tags.some((tag) => tag[0] === 'd' && tag[1] === task2Id)
        );

        expect(task1Ready).toBe(true);
        expect(task2Ready).toBe(false);
      }, TEST_TIMEOUT);
    },
    { timeout: TEST_TIMEOUT }
  );
});
