/**
 * Custom Load Test for Matrix Federation
 *
 * Tests specific Matrix federation scenarios:
 * - Message sync throughput (CIA Web → Matrix)
 * - Federated message ingestion (Matrix → CIA Web)
 * - Circuit breaker behavior under load
 * - Retry queue performance
 * - Database performance under federation load
 *
 * Usage:
 * node custom-load-test.js --duration=300 --rate=100
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  jwtToken: process.env.JWT_TOKEN || '',
  projectId: process.env.TEST_PROJECT_ID || '',
  duration: parseInt(process.argv.find(arg => arg.startsWith('--duration='))?.split('=')[1] || '300'),
  messagesPerSecond: parseInt(process.argv.find(arg => arg.startsWith('--rate='))?.split('=')[1] || '100'),
};

// Metrics
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  circuitBreakerOpens: 0,
  retryQueueSizes: [],
  errors: {},
};

// Helper: Make HTTP request
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, CONFIG.baseUrl);
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${CONFIG.jwtToken}`,
        'Content-Type': 'application/json',
      },
    };

    const startTime = performance.now();
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        metrics.totalRequests++;
        metrics.responseTimes.push(responseTime);

        if (res.statusCode >= 200 && res.statusCode < 300) {
          metrics.successfulRequests++;
          try {
            resolve({ statusCode: res.statusCode, data: JSON.parse(data), responseTime });
          } catch (e) {
            resolve({ statusCode: res.statusCode, data, responseTime });
          }
        } else {
          metrics.failedRequests++;
          const error = `HTTP ${res.statusCode}`;
          metrics.errors[error] = (metrics.errors[error] || 0) + 1;
          reject(new Error(error));
        }
      });
    });

    req.on('error', (err) => {
      metrics.totalRequests++;
      metrics.failedRequests++;
      metrics.errors[err.message] = (metrics.errors[err.message] || 0) + 1;
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Test 1: Message send throughput
async function testMessageThroughput() {
  console.log('\n=== Test 1: Message Send Throughput ===');

  // Create test room
  const room = await makeRequest('POST', `/api/projects/${CONFIG.projectId}/rooms`, {
    name: `Load Test ${Date.now()}`,
    description: 'Throughput test room',
  });

  const roomId = room.data.id;
  console.log(`Created room: ${roomId}`);

  const startTime = Date.now();
  const endTime = startTime + (CONFIG.duration * 1000);
  const intervalMs = 1000 / CONFIG.messagesPerSecond;

  let messagesSent = 0;
  let messagesFailed = 0;

  console.log(`Sending ${CONFIG.messagesPerSecond} messages/second for ${CONFIG.duration} seconds...`);

  while (Date.now() < endTime) {
    const batchStartTime = Date.now();

    // Send a batch of messages
    const promises = [];
    for (let i = 0; i < CONFIG.messagesPerSecond; i++) {
      const promise = makeRequest('POST', `/api/rooms/${roomId}/messages`, {
        message: `Load test message ${messagesSent++}`,
        type: 'text',
      }).then(() => {
        // Success
      }).catch(() => {
        messagesFailed++;
      });

      promises.push(promise);
    }

    await Promise.allSettled(promises);

    // Wait for next batch
    const elapsed = Date.now() - batchStartTime;
    const waitTime = Math.max(0, 1000 - elapsed);
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // Print progress every 10 seconds
    if (messagesSent % (CONFIG.messagesPerSecond * 10) === 0) {
      const progress = ((Date.now() - startTime) / (CONFIG.duration * 1000) * 100).toFixed(1);
      console.log(`  Progress: ${progress}% (${messagesSent} sent, ${messagesFailed} failed)`);
    }
  }

  console.log(`\nTotal messages sent: ${messagesSent}`);
  console.log(`Failed: ${messagesFailed} (${(messagesFailed / messagesSent * 100).toFixed(2)}%)`);
  console.log(`Success rate: ${((messagesSent - messagesFailed) / messagesSent * 100).toFixed(2)}%`);

  return { messagesSent, messagesFailed };
}

// Test 2: Circuit breaker behavior
async function testCircuitBreaker() {
  console.log('\n=== Test 2: Circuit Breaker Behavior ===');

  // Check initial state
  const initialStatus = await makeRequest('GET', '/api/matrix/status');
  console.log(`Initial circuit state: ${initialStatus.data.circuitBreaker.state}`);

  // Simulate Matrix downtime by sending to non-existent rooms
  console.log('Simulating failures to trigger circuit breaker...');

  for (let i = 0; i < 10; i++) {
    try {
      await makeRequest('POST', `/api/matrix/rooms/join`, {
        roomIdOrAlias: `#nonexistent${i}:fake.server`,
        projectId: CONFIG.projectId,
      });
    } catch (err) {
      // Expected to fail
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Check if circuit opened
  const afterStatus = await makeRequest('GET', '/api/matrix/status');
  console.log(`Circuit state after failures: ${afterStatus.data.circuitBreaker.state}`);

  if (afterStatus.data.circuitBreaker.state === 'OPEN') {
    metrics.circuitBreakerOpens++;
    console.log('✓ Circuit breaker opened as expected');

    // Wait for recovery
    console.log('Waiting for circuit breaker to recover...');
    let recovered = false;
    for (let attempt = 0; attempt < 12; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

      const status = await makeRequest('GET', '/api/matrix/status');
      console.log(`  Attempt ${attempt + 1}: ${status.data.circuitBreaker.state}`);

      if (status.data.circuitBreaker.state !== 'OPEN') {
        recovered = true;
        console.log('✓ Circuit breaker recovered');
        break;
      }
    }

    if (!recovered) {
      console.log('✗ Circuit breaker did not recover within 2 minutes');
    }
  } else {
    console.log('✗ Circuit breaker did not open (may need more failures or different trigger)');
  }

  return { opened: afterStatus.data.circuitBreaker.state === 'OPEN' };
}

// Test 3: Monitor retry queue
async function monitorRetryQueue(durationSeconds = 60) {
  console.log('\n=== Test 3: Retry Queue Monitoring ===');
  console.log(`Monitoring retry queue for ${durationSeconds} seconds...`);

  const startTime = Date.now();
  const endTime = startTime + (durationSeconds * 1000);

  while (Date.now() < endTime) {
    const status = await makeRequest('GET', '/api/matrix/status');
    const queueSize = status.data.retryQueue.size;
    metrics.retryQueueSizes.push(queueSize);

    if (queueSize > 0) {
      console.log(`  Retry queue size: ${queueSize}`);
    }

    await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds
  }

  const maxQueueSize = Math.max(...metrics.retryQueueSizes);
  const avgQueueSize = metrics.retryQueueSizes.reduce((a, b) => a + b, 0) / metrics.retryQueueSizes.length;

  console.log(`\nRetry queue statistics:`);
  console.log(`  Max size: ${maxQueueSize}`);
  console.log(`  Average size: ${avgQueueSize.toFixed(2)}`);

  return { maxQueueSize, avgQueueSize };
}

// Test 4: Database performance
async function testDatabasePerformance() {
  console.log('\n=== Test 4: Database Performance ===');

  // Query federation data
  console.log('Testing federation data queries...');

  const tests = [
    { name: 'Room mappings', path: '/api/matrix/rooms/info' },
    { name: 'Federated users', path: '/api/matrix/users' },
    { name: 'Matrix status', path: '/api/matrix/status' },
  ];

  for (const test of tests) {
    const times = [];

    for (let i = 0; i < 100; i++) {
      try {
        const result = await makeRequest('GET', test.path);
        times.push(result.responseTime);
      } catch (err) {
        // Ignore errors for this test
      }
    }

    if (times.length > 0) {
      times.sort((a, b) => a - b);
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const p50 = times[Math.floor(times.length * 0.5)];
      const p95 = times[Math.floor(times.length * 0.95)];
      const p99 = times[Math.floor(times.length * 0.99)];

      console.log(`\n${test.name}:`);
      console.log(`  Average: ${avg.toFixed(2)}ms`);
      console.log(`  P50: ${p50.toFixed(2)}ms`);
      console.log(`  P95: ${p95.toFixed(2)}ms`);
      console.log(`  P99: ${p99.toFixed(2)}ms`);
    }
  }
}

// Calculate statistics
function calculateStatistics() {
  console.log('\n=== Overall Statistics ===');

  // Sort response times
  const times = metrics.responseTimes.sort((a, b) => a - b);

  if (times.length === 0) {
    console.log('No data collected');
    return;
  }

  const sum = times.reduce((a, b) => a + b, 0);
  const avg = sum / times.length;
  const min = times[0];
  const max = times[times.length - 1];
  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];

  const successRate = (metrics.successfulRequests / metrics.totalRequests * 100).toFixed(2);
  const errorRate = (metrics.failedRequests / metrics.totalRequests * 100).toFixed(2);

  console.log('\nRequest Statistics:');
  console.log(`  Total requests: ${metrics.totalRequests}`);
  console.log(`  Successful: ${metrics.successfulRequests} (${successRate}%)`);
  console.log(`  Failed: ${metrics.failedRequests} (${errorRate}%)`);

  console.log('\nResponse Times:');
  console.log(`  Min: ${min.toFixed(2)}ms`);
  console.log(`  Max: ${max.toFixed(2)}ms`);
  console.log(`  Average: ${avg.toFixed(2)}ms`);
  console.log(`  Median (P50): ${p50.toFixed(2)}ms`);
  console.log(`  P95: ${p95.toFixed(2)}ms`);
  console.log(`  P99: ${p99.toFixed(2)}ms`);

  if (Object.keys(metrics.errors).length > 0) {
    console.log('\nError Breakdown:');
    for (const [error, count] of Object.entries(metrics.errors)) {
      console.log(`  ${error}: ${count}`);
    }
  }

  console.log('\nCircuit Breaker:');
  console.log(`  Times opened: ${metrics.circuitBreakerOpens}`);

  // Performance verdict
  console.log('\n=== Performance Verdict ===');
  const verdicts = [];

  if (successRate >= 99) {
    verdicts.push('✓ Excellent reliability (>99% success rate)');
  } else if (successRate >= 95) {
    verdicts.push('⚠ Acceptable reliability (>95% success rate)');
  } else {
    verdicts.push('✗ Poor reliability (<95% success rate)');
  }

  if (p95 < 500) {
    verdicts.push('✓ Excellent latency (P95 < 500ms)');
  } else if (p95 < 1000) {
    verdicts.push('⚠ Acceptable latency (P95 < 1000ms)');
  } else {
    verdicts.push('✗ High latency (P95 > 1000ms)');
  }

  if (p99 < 1000) {
    verdicts.push('✓ Good tail latency (P99 < 1000ms)');
  } else if (p99 < 2000) {
    verdicts.push('⚠ Acceptable tail latency (P99 < 2000ms)');
  } else {
    verdicts.push('✗ Poor tail latency (P99 > 2000ms)');
  }

  verdicts.forEach(v => console.log(v));
}

// Main test runner
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║          Matrix Federation Load Testing Suite               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  console.log('\nConfiguration:');
  console.log(`  Target: ${CONFIG.baseUrl}`);
  console.log(`  Duration: ${CONFIG.duration} seconds`);
  console.log(`  Message rate: ${CONFIG.messagesPerSecond} messages/second`);
  console.log(`  Project ID: ${CONFIG.projectId}`);

  try {
    // Run tests sequentially
    await testMessageThroughput();
    await testCircuitBreaker();
    await monitorRetryQueue(60);
    await testDatabasePerformance();

    // Calculate and display statistics
    calculateStatistics();

  } catch (error) {
    console.error('\nLoad test failed:', error.message);
    process.exit(1);
  }

  console.log('\n✓ Load testing completed');
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  // Validate configuration
  if (!CONFIG.jwtToken) {
    console.error('Error: JWT_TOKEN environment variable is required');
    process.exit(1);
  }

  if (!CONFIG.projectId) {
    console.error('Error: TEST_PROJECT_ID environment variable is required');
    process.exit(1);
  }

  main();
}

module.exports = { makeRequest, metrics };
