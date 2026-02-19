/**
 * Performance benchmarks for Wasteland POC
 */

import { WastelandClient, TaskStatus } from '@wasteland/client';
import { generateSecretKey } from 'nostr-tools';
import { writeFileSync } from 'fs';

interface BenchmarkResults {
  timestamp: string;
  taskCreationLatency: LatencyStats;
  queryLatency: LatencyStats;
  concurrentAgents: ConcurrencyStats;
  throughput: ThroughputStats;
}

interface LatencyStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  samples: number;
}

interface ConcurrencyStats {
  agents: number;
  totalTasks: number;
  duration: number;
  successRate: number;
  errors: number;
}

interface ThroughputStats {
  eventsPerSecond: number;
  duration: number;
  totalEvents: number;
}

const RELAY_URL = process.env.RELAY_URL || 'ws://localhost:7100';

/**
 * Calculate latency statistics from samples
 */
function calculateStats(samples: number[]): LatencyStats {
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    min: sorted[0] || 0,
    max: sorted[sorted.length - 1] || 0,
    mean: sum / sorted.length || 0,
    median: sorted[Math.floor(sorted.length / 2)] || 0,
    p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
    p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
    samples: sorted.length,
  };
}

/**
 * Benchmark: Task creation latency
 */
async function benchmarkTaskCreation(
  iterations: number = 100
): Promise<LatencyStats> {
  console.log(`\n=== Task Creation Latency Benchmark ===`);
  console.log(`Iterations: ${iterations}`);

  const client = new WastelandClient({
    relayUrl: RELAY_URL,
    privateKey: generateSecretKey(),
  });

  await client.connect();

  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();

    await client.createTask({
      id: `bench-task-${Date.now()}-${i}`,
      title: `Benchmark Task ${i}`,
      content: 'Benchmark task creation',
    });

    const latency = Date.now() - start;
    latencies.push(latency);

    if ((i + 1) % 10 === 0) {
      console.log(`  Completed ${i + 1}/${iterations} tasks`);
    }
  }

  client.disconnect();

  const stats = calculateStats(latencies);
  console.log(`\nResults:`);
  console.log(`  Min: ${stats.min}ms`);
  console.log(`  Max: ${stats.max}ms`);
  console.log(`  Mean: ${stats.mean.toFixed(2)}ms`);
  console.log(`  Median: ${stats.median}ms`);
  console.log(`  p95: ${stats.p95}ms ${stats.p95 < 500 ? '✓' : '✗'} (target <500ms)`);
  console.log(`  p99: ${stats.p99}ms`);

  return stats;
}

/**
 * Benchmark: Query latency
 */
async function benchmarkQueryLatency(
  iterations: number = 100
): Promise<LatencyStats> {
  console.log(`\n=== Query Latency Benchmark ===`);
  console.log(`Iterations: ${iterations}`);

  const client = new WastelandClient({
    relayUrl: RELAY_URL,
    privateKey: generateSecretKey(),
  });

  await client.connect();

  // Create some tasks to query
  console.log('Creating test tasks...');
  for (let i = 0; i < 20; i++) {
    await client.createTask({
      id: `query-bench-${Date.now()}-${i}`,
      title: `Query Bench Task ${i}`,
      content: 'For query benchmark',
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for propagation

  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();

    await client.queryTasks({
      authors: [client.publicKey],
      status: TaskStatus.OPEN,
    });

    const latency = Date.now() - start;
    latencies.push(latency);

    if ((i + 1) % 10 === 0) {
      console.log(`  Completed ${i + 1}/${iterations} queries`);
    }
  }

  client.disconnect();

  const stats = calculateStats(latencies);
  console.log(`\nResults:`);
  console.log(`  Min: ${stats.min}ms`);
  console.log(`  Max: ${stats.max}ms`);
  console.log(`  Mean: ${stats.mean.toFixed(2)}ms`);
  console.log(`  Median: ${stats.median}ms`);
  console.log(`  p95: ${stats.p95}ms ${stats.p95 < 200 ? '✓' : '✗'} (target <200ms)`);
  console.log(`  p99: ${stats.p99}ms`);

  return stats;
}

/**
 * Benchmark: Concurrent agents
 */
async function benchmarkConcurrency(
  agentCount: number = 10
): Promise<ConcurrencyStats> {
  console.log(`\n=== Concurrent Agents Benchmark ===`);
  console.log(`Agents: ${agentCount}`);

  const agents = Array.from({ length: agentCount }, () => {
    return new WastelandClient({
      relayUrl: RELAY_URL,
      privateKey: generateSecretKey(),
    });
  });

  // Connect all agents
  console.log('Connecting agents...');
  await Promise.all(agents.map((agent) => agent.connect()));

  let successCount = 0;
  let errorCount = 0;

  const start = Date.now();

  // Each agent creates tasks simultaneously
  console.log('Creating tasks concurrently...');
  const results = await Promise.allSettled(
    agents.map(async (agent, index) => {
      const taskPromises = Array.from({ length: 5 }, (_, taskIndex) =>
        agent.createTask({
          id: `concurrent-${index}-${taskIndex}-${Date.now()}`,
          title: `Agent ${index} Task ${taskIndex}`,
          content: 'Concurrent task creation',
        })
      );

      return Promise.all(taskPromises);
    })
  );

  const duration = Date.now() - start;

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      successCount += result.value.length;
    } else {
      errorCount++;
    }
  });

  // Disconnect agents
  agents.forEach((agent) => agent.disconnect());

  const stats: ConcurrencyStats = {
    agents: agentCount,
    totalTasks: successCount,
    duration,
    successRate: successCount / (agentCount * 5),
    errors: errorCount,
  };

  console.log(`\nResults:`);
  console.log(`  Total tasks created: ${successCount}`);
  console.log(`  Duration: ${duration}ms`);
  console.log(`  Success rate: ${(stats.successRate * 100).toFixed(2)}%`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`  Tasks/second: ${((successCount / duration) * 1000).toFixed(2)}`);

  return stats;
}

/**
 * Benchmark: Throughput
 */
async function benchmarkThroughput(duration: number = 10000): Promise<ThroughputStats> {
  console.log(`\n=== Throughput Benchmark ===`);
  console.log(`Duration: ${duration}ms`);

  const client = new WastelandClient({
    relayUrl: RELAY_URL,
    privateKey: generateSecretKey(),
  });

  await client.connect();

  let eventCount = 0;
  const startTime = Date.now();
  const endTime = startTime + duration;

  console.log('Publishing events...');

  while (Date.now() < endTime) {
    try {
      await client.createTask({
        id: `throughput-${eventCount}-${Date.now()}`,
        title: `Throughput Task ${eventCount}`,
        content: 'Throughput benchmark',
      });
      eventCount++;

      if (eventCount % 10 === 0) {
        const elapsed = Date.now() - startTime;
        const rate = (eventCount / elapsed) * 1000;
        process.stdout.write(`\r  Events: ${eventCount}, Rate: ${rate.toFixed(2)}/s`);
      }
    } catch (error) {
      console.error('Error during throughput test:', error);
    }
  }

  const actualDuration = Date.now() - startTime;

  client.disconnect();

  const stats: ThroughputStats = {
    eventsPerSecond: (eventCount / actualDuration) * 1000,
    duration: actualDuration,
    totalEvents: eventCount,
  };

  console.log(`\n\nResults:`);
  console.log(`  Total events: ${eventCount}`);
  console.log(`  Duration: ${actualDuration}ms`);
  console.log(`  Events/second: ${stats.eventsPerSecond.toFixed(2)}`);

  return stats;
}

/**
 * Run all benchmarks
 */
async function runBenchmarks(): Promise<void> {
  console.log('='.repeat(50));
  console.log('WASTELAND POC PERFORMANCE BENCHMARKS');
  console.log('='.repeat(50));

  const results: BenchmarkResults = {
    timestamp: new Date().toISOString(),
    taskCreationLatency: await benchmarkTaskCreation(50),
    queryLatency: await benchmarkQueryLatency(50),
    concurrentAgents: await benchmarkConcurrency(10),
    throughput: await benchmarkThroughput(10000),
  };

  // Save results to file
  const outputFile = `benchmark-results-${Date.now()}.json`;
  writeFileSync(outputFile, JSON.stringify(results, null, 2));

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results saved to: ${outputFile}`);
  console.log('='.repeat(50));

  // Print summary
  console.log('\n=== SUMMARY ===');
  console.log(
    `Task Creation p95: ${results.taskCreationLatency.p95}ms ${results.taskCreationLatency.p95 < 500 ? '✓ PASS' : '✗ FAIL'}`
  );
  console.log(
    `Query Latency p95: ${results.queryLatency.p95}ms ${results.queryLatency.p95 < 200 ? '✓ PASS' : '✗ FAIL'}`
  );
  console.log(
    `Concurrent Agents: ${results.concurrentAgents.successRate * 100}% success with ${results.concurrentAgents.agents} agents`
  );
  console.log(
    `Throughput: ${results.throughput.eventsPerSecond.toFixed(2)} events/second`
  );
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmarks().catch((error) => {
    console.error('Benchmark failed:', error);
    process.exit(1);
  });
}

export { runBenchmarks, benchmarkTaskCreation, benchmarkQueryLatency, benchmarkConcurrency, benchmarkThroughput };
