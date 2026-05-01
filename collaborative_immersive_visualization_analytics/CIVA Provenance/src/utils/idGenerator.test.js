// src/utils/idGenerator.test.js
import {
  generateId,
  generateDatasetId,
  generateInstanceId,
  getIdTimestamp,
} from "@Utils/idGenerator.js";

console.log("Testing ID Generator...\n");

// Test 1: Basic ID generation
const id1 = generateId();
const id2 = generateId();
console.log("✓ Basic IDs:", id1, id2);
console.log("✓ IDs are unique:", id1 !== id2);

// Test 2: Dataset IDs
const datasetId = generateDatasetId();
console.log("✓ Dataset ID:", datasetId);
console.log('✓ Starts with "dataset_":', datasetId.startsWith("dataset_"));

// Test 3: Instance IDs
const instanceId = generateInstanceId();
console.log("✓ Instance ID:", instanceId);
console.log('✓ Starts with "instance_":', instanceId.startsWith("instance_"));

// Test 4: Extract timestamp
const timestamp = getIdTimestamp(datasetId);
console.log("✓ Timestamp:", timestamp);
console.log("✓ Timestamp is recent:", Date.now() - timestamp < 1000);

console.log("\n✅ All tests passed!");
