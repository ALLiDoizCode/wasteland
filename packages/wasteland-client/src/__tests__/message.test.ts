/**
 * Unit tests for message event creation
 */

import { describe, it, expect } from 'vitest';
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import {
  createMessageEvent,
  signMessageEvent,
  createReplyMessage,
  parseMessageEvent,
  createPolecatDoneMessage,
  createNotification,
} from '../message.js';
import { MESSAGE_EVENT_KIND, MessageType, Priority } from '../types.js';

describe('Message Event Creation', () => {
  it('should create a message event with required fields', () => {
    const recipientKey = generateSecretKey();
    const recipientPubkey = getPublicKey(recipientKey);

    const event = createMessageEvent({
      recipient: recipientPubkey,
      subject: 'Test Message',
      content: 'Hello World',
      messageType: MessageType.NOTIFICATION,
    });

    expect(event.kind).toBe(MESSAGE_EVENT_KIND);
    expect(event.content).toBe('Hello World');
    expect(event.tags).toContainEqual(['p', recipientPubkey]);
    expect(event.tags).toContainEqual(['subject', 'Test Message']);
    expect(event.tags).toContainEqual(['message-type', MessageType.NOTIFICATION]);
    expect(event.tags).toContainEqual(['priority', Priority.NORMAL]);
  });

  it('should create message with custom priority', () => {
    const recipientKey = generateSecretKey();
    const recipientPubkey = getPublicKey(recipientKey);

    const event = createMessageEvent({
      recipient: recipientPubkey,
      subject: 'Urgent',
      content: 'Important message',
      messageType: MessageType.NOTIFICATION,
      priority: Priority.URGENT,
    });

    expect(event.tags).toContainEqual(['priority', Priority.URGENT]);
  });

  it('should include thread-id when provided', () => {
    const recipientKey = generateSecretKey();
    const recipientPubkey = getPublicKey(recipientKey);

    const event = createMessageEvent({
      recipient: recipientPubkey,
      subject: 'Thread Message',
      content: 'Part of thread',
      messageType: MessageType.REPLY,
      threadId: 'thread-123',
    });

    expect(event.tags).toContainEqual(['thread-id', 'thread-123']);
  });

  it('should include reply-to event reference', () => {
    const recipientKey = generateSecretKey();
    const recipientPubkey = getPublicKey(recipientKey);

    const event = createMessageEvent({
      recipient: recipientPubkey,
      subject: 'Reply',
      content: 'Replying to message',
      messageType: MessageType.REPLY,
      replyTo: 'original-event-id',
    });

    expect(event.tags).toContainEqual(['e', 'original-event-id', '', 'reply']);
  });
});

describe('Message Event Signing', () => {
  it('should sign message event', () => {
    const privateKey = generateSecretKey();
    const recipientKey = generateSecretKey();
    const recipientPubkey = getPublicKey(recipientKey);

    const event = createMessageEvent({
      recipient: recipientPubkey,
      subject: 'Sign Test',
      content: 'Testing signing',
      messageType: MessageType.NOTIFICATION,
    });

    const signed = signMessageEvent(event, privateKey);

    expect(signed.id).toBeDefined();
    expect(signed.pubkey).toBeDefined();
    expect(signed.sig).toBeDefined();
  });
});

describe('Reply Message Creation', () => {
  it('should create reply with correct threading', () => {
    const senderKey = generateSecretKey();
    const recipientKey = generateSecretKey();

    const originalEvent = signMessageEvent(
      createMessageEvent({
        recipient: getPublicKey(recipientKey),
        subject: 'Original',
        content: 'Original message',
        messageType: MessageType.NOTIFICATION,
      }),
      senderKey
    );

    const reply = createReplyMessage(
      originalEvent,
      'Reply content',
      getPublicKey(recipientKey)
    );

    expect(reply.tags).toContainEqual(['p', getPublicKey(senderKey)]);
    expect(reply.tags).toContainEqual(['subject', 'Re: Original']);
    expect(reply.tags).toContainEqual(['thread-id', originalEvent.id]);
    expect(reply.tags).toContainEqual(['e', originalEvent.id, '', 'reply']);
  });

  it('should not duplicate "Re:" prefix', () => {
    const senderKey = generateSecretKey();
    const recipientKey = generateSecretKey();

    const originalEvent = signMessageEvent(
      createMessageEvent({
        recipient: getPublicKey(recipientKey),
        subject: 'Re: Already a reply',
        content: 'Content',
        messageType: MessageType.REPLY,
      }),
      senderKey
    );

    const reply = createReplyMessage(
      originalEvent,
      'Another reply',
      getPublicKey(recipientKey)
    );

    expect(reply.tags).toContainEqual(['subject', 'Re: Already a reply']);
  });
});

describe('Special Message Types', () => {
  it('should create POLECAT_DONE message', () => {
    const recipientKey = generateSecretKey();
    const recipientPubkey = getPublicKey(recipientKey);

    const event = createPolecatDoneMessage(
      recipientPubkey,
      'task-123',
      'Task completed successfully'
    );

    expect(event.tags).toContainEqual(['subject', 'Task Completed: task-123']);
    expect(event.tags).toContainEqual(['message-type', MessageType.POLECAT_DONE]);
    expect(event.content).toBe('Task completed successfully');
  });

  it('should create notification message', () => {
    const recipientKey = generateSecretKey();
    const recipientPubkey = getPublicKey(recipientKey);

    const event = createNotification(
      recipientPubkey,
      'System Update',
      'System will be updated soon',
      Priority.HIGH
    );

    expect(event.tags).toContainEqual(['subject', 'System Update']);
    expect(event.tags).toContainEqual(['message-type', MessageType.NOTIFICATION]);
    expect(event.tags).toContainEqual(['priority', Priority.HIGH]);
  });
});

describe('Message Event Parsing', () => {
  it('should parse message event into structured format', () => {
    const senderKey = generateSecretKey();
    const recipientKey = generateSecretKey();
    const recipientPubkey = getPublicKey(recipientKey);

    const event = createMessageEvent({
      recipient: recipientPubkey,
      subject: 'Parse Test',
      content: 'Testing parsing',
      messageType: MessageType.NOTIFICATION,
      priority: Priority.HIGH,
      threadId: 'thread-456',
    });
    const signed = signMessageEvent(event, senderKey);

    const parsed = parseMessageEvent(signed);

    expect(parsed.recipient).toBe(recipientPubkey);
    expect(parsed.subject).toBe('Parse Test');
    expect(parsed.content).toBe('Testing parsing');
    expect(parsed.messageType).toBe(MessageType.NOTIFICATION);
    expect(parsed.priority).toBe(Priority.HIGH);
    expect(parsed.threadId).toBe('thread-456');
    expect(parsed.sender).toBe(getPublicKey(senderKey));
  });
});
