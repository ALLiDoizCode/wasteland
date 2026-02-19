/**
 * Agent configuration management
 */

import { config as loadEnv } from 'dotenv';
import { hexToBytes } from '@noble/hashes/utils';

loadEnv();

export interface AgentConfig {
  agentName: string;
  relayUrl: string;
  privateKey?: Uint8Array;
  ilpConfig?: {
    paymentPointer?: string;
    amount?: number;
  };
  workerConfig?: {
    pollingInterval?: number;
    workDurationMin?: number;
    workDurationMax?: number;
    notifyPubkey?: string;
  };
}

/**
 * Load agent configuration from environment variables
 */
export function loadConfig(): AgentConfig {
  const agentName = process.env.AGENT_NAME || 'demo-agent';
  const relayUrl = process.env.RELAY_URL || 'ws://localhost:7001';

  // Load private key from env (hex string)
  let privateKey: Uint8Array | undefined;
  if (process.env.AGENT_PRIVATE_KEY) {
    try {
      privateKey = hexToBytes(process.env.AGENT_PRIVATE_KEY);
    } catch (error) {
      console.error('Invalid AGENT_PRIVATE_KEY format (must be hex):', error);
    }
  }

  // ILP configuration
  const ilpConfig = {
    paymentPointer: process.env.ILP_PAYMENT_POINTER,
    amount: process.env.ILP_AMOUNT ? parseInt(process.env.ILP_AMOUNT, 10) : undefined,
  };

  // Worker configuration
  const workerConfig = {
    pollingInterval: process.env.POLLING_INTERVAL
      ? parseInt(process.env.POLLING_INTERVAL, 10)
      : 5000,
    workDurationMin: process.env.WORK_DURATION_MIN
      ? parseInt(process.env.WORK_DURATION_MIN, 10)
      : 2,
    workDurationMax: process.env.WORK_DURATION_MAX
      ? parseInt(process.env.WORK_DURATION_MAX, 10)
      : 5,
    notifyPubkey: process.env.NOTIFY_PUBKEY,
  };

  return {
    agentName,
    relayUrl,
    privateKey,
    ilpConfig,
    workerConfig,
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: AgentConfig): void {
  if (!config.relayUrl) {
    throw new Error('RELAY_URL is required');
  }

  if (!config.relayUrl.startsWith('ws://') && !config.relayUrl.startsWith('wss://')) {
    throw new Error('RELAY_URL must start with ws:// or wss://');
  }

  if (config.privateKey && config.privateKey.length !== 32) {
    throw new Error('AGENT_PRIVATE_KEY must be 32 bytes (64 hex characters)');
  }
}

/**
 * Print configuration (without sensitive data)
 */
export function printConfig(config: AgentConfig): void {
  console.log('\n=== Agent Configuration ===');
  console.log(`Agent Name: ${config.agentName}`);
  console.log(`Relay URL: ${config.relayUrl}`);
  console.log(`Private Key: ${config.privateKey ? '[PROVIDED]' : '[GENERATED]'}`);
  console.log(`ILP Payment Pointer: ${config.ilpConfig?.paymentPointer || '[NOT SET]'}`);
  console.log(`Polling Interval: ${config.workerConfig?.pollingInterval}ms`);
  console.log(`Work Duration: ${config.workerConfig?.workDurationMin}-${config.workerConfig?.workDurationMax}s`);
  console.log(`Notify Pubkey: ${config.workerConfig?.notifyPubkey || '[NOT SET]'}`);
  console.log('===========================\n');
}
