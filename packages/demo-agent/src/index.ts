#!/usr/bin/env node

/**
 * Demo Agent for Wasteland POC
 *
 * Entry point for the demo agent application.
 */

import { program } from 'commander';
import { WastelandClient, TaskStatus, Priority } from '@wasteland/client';
import { TaskWorker } from './worker.js';
import { loadConfig, validateConfig, printConfig } from './config.js';

program
  .name('demo-agent')
  .description('Wasteland demo agent for task management POC')
  .version('0.0.1');

// Start worker command
program
  .command('start')
  .description('Start the agent worker')
  .action(async () => {
    try {
      const config = loadConfig();
      validateConfig(config);
      printConfig(config);

      const worker = new TaskWorker({
        relayUrl: config.relayUrl,
        privateKey: config.privateKey,
        agentName: config.agentName,
        ...config.workerConfig,
      });

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\nReceived SIGINT, shutting down...');
        worker.stop();
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        console.log('\nReceived SIGTERM, shutting down...');
        worker.stop();
        process.exit(0);
      });

      await worker.start();
    } catch (error) {
      console.error('Error starting worker:', error);
      process.exit(1);
    }
  });

// Create task command
program
  .command('create-task')
  .description('Create a new task')
  .requiredOption('-i, --id <id>', 'Task ID')
  .requiredOption('-t, --title <title>', 'Task title')
  .option('-c, --content <content>', 'Task content/description', '')
  .option('-s, --status <status>', 'Task status (open|in_progress|closed)', 'open')
  .option('-p, --priority <priority>', 'Priority (low|normal|high|urgent)', 'normal')
  .action(async (options) => {
    try {
      const config = loadConfig();
      validateConfig(config);

      const client = new WastelandClient({
        relayUrl: config.relayUrl,
        privateKey: config.privateKey,
      });

      await client.connect();

      console.log('Creating task...');
      const eventId = await client.createTask({
        id: options.id,
        title: options.title,
        content: options.content,
        status: options.status as TaskStatus,
        priority: options.priority as Priority,
      });

      console.log(`Task created successfully!`);
      console.log(`Event ID: ${eventId}`);
      console.log(`Task ID: ${options.id}`);

      client.disconnect();
    } catch (error) {
      console.error('Error creating task:', error);
      process.exit(1);
    }
  });

// List tasks command
program
  .command('list-tasks')
  .description('List tasks')
  .option('-s, --status <status>', 'Filter by status (open|in_progress|closed)')
  .option('-a, --author <pubkey>', 'Filter by author pubkey')
  .option('-r, --ready', 'Show only ready tasks (no blockers)')
  .action(async (options) => {
    try {
      const config = loadConfig();
      validateConfig(config);

      const client = new WastelandClient({
        relayUrl: config.relayUrl,
        privateKey: config.privateKey,
      });

      await client.connect();

      console.log('Querying tasks...\n');

      let tasks;
      if (options.ready) {
        tasks = await client.findReady(options.author);
      } else {
        tasks = await client.queryTasks({
          status: options.status as TaskStatus,
          authors: options.author ? [options.author] : undefined,
        });
      }

      if (tasks.length === 0) {
        console.log('No tasks found');
      } else {
        console.log(`Found ${tasks.length} task(s):\n`);
        tasks.forEach((task, index) => {
          const taskId = task.tags.find((t) => t[0] === 'd')?.[1] || 'unknown';
          const title = task.tags.find((t) => t[0] === 'title')?.[1] || 'Untitled';
          const status = task.tags.find((t) => t[0] === 'status')?.[1] || 'unknown';
          const priority = task.tags.find((t) => t[0] === 'priority')?.[1] || 'normal';

          console.log(`${index + 1}. ${title}`);
          console.log(`   ID: ${taskId}`);
          console.log(`   Status: ${status}`);
          console.log(`   Priority: ${priority}`);
          console.log(`   Event ID: ${task.id}`);
          console.log(`   Author: ${task.pubkey.substring(0, 16)}...`);
          console.log();
        });
      }

      client.disconnect();
    } catch (error) {
      console.error('Error listing tasks:', error);
      process.exit(1);
    }
  });

// Send message command
program
  .command('send-message')
  .description('Send a message to another agent')
  .requiredOption('-r, --recipient <pubkey>', 'Recipient public key')
  .requiredOption('-s, --subject <subject>', 'Message subject')
  .requiredOption('-c, --content <content>', 'Message content')
  .option('-t, --type <type>', 'Message type', 'notification')
  .option('-p, --priority <priority>', 'Priority (low|normal|high|urgent)', 'normal')
  .action(async (options) => {
    try {
      const config = loadConfig();
      validateConfig(config);

      const client = new WastelandClient({
        relayUrl: config.relayUrl,
        privateKey: config.privateKey,
      });

      await client.connect();

      console.log('Sending message...');
      const eventId = await client.sendMessage({
        recipient: options.recipient,
        subject: options.subject,
        content: options.content,
        messageType: options.type,
        priority: options.priority as Priority,
      });

      console.log(`Message sent successfully!`);
      console.log(`Event ID: ${eventId}`);

      client.disconnect();
    } catch (error) {
      console.error('Error sending message:', error);
      process.exit(1);
    }
  });

program.parse();
