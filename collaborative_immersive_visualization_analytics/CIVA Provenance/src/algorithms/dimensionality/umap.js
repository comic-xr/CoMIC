// ----------------------------------------------------------------------------
// TensorFlow.js UMAP Implementation
// ----------------------------------------------------------------------------

// Currently broken - will hang when used in app due to tf.tidy() memory management issues.
// Leaving code here for future fixes and improvements.

import * as tf from "@tensorflow/tfjs";

import { performPCA } from "@Algorithms/dimensionality/pca.js";
import { ALGORITHM_LIMITS } from "@Core/config/constants.js";
import {
  logMemoryUsage,
  cleanupTensors,
} from "@Services/tensorflow/tensorflowSetup.js";
import {
  logInfo,
  logProgress,
  logSuccess,
  logError,
  logWarning,
} from "@Utils/logger.js";

export async function performUMAP(
  pointsMatrix,
  numComponents = 2,
  options = {}
) {
  const { nNeighbors = 8, minDist = 0.1, nEpochs = 200 } = options;

  const numPoints = pointsMatrix.length;

  logInfo(
    `Starting TensorFlow.js UMAP on ${numPoints.toLocaleString()} points`
  );
  logProgress(
    `Parameters: neighbors=${nNeighbors}, min_dist=${minDist}, epochs=${nEpochs}`
  );
  logMemoryUsage("before UMAP");

  // For very large datasets, subsample
  let processedMatrix = pointsMatrix;
  let needsInterpolation = false;

  if (numPoints > ALGORITHM_LIMITS.MAX_UMAP_POINTS) {
    logWarning(`Large dataset: ${numPoints.toLocaleString()} points`);
    logProgress(
      `Subsampling to ${ALGORITHM_LIMITS.MAX_UMAP_POINTS} points for UMAP computation`
    );

    const step = Math.floor(numPoints / ALGORITHM_LIMITS.MAX_UMAP_POINTS);
    processedMatrix = [];
    for (let i = 0; i < numPoints; i += step) {
      if (processedMatrix.length < ALGORITHM_LIMITS.MAX_UMAP_POINTS) {
        processedMatrix.push(pointsMatrix[i]);
      }
    }
    needsInterpolation = true;
    logProgress(`Sampled ${processedMatrix.length} points for analysis`);
  }

  try {
    const result = await runTensorFlowUMAP(processedMatrix, numComponents, {
      nNeighbors: Math.min(nNeighbors, Math.floor(processedMatrix.length / 4)),
      minDist,
      nEpochs,
    });

    if (needsInterpolation) {
      logProgress(
        `Interpolating results to all ${numPoints.toLocaleString()} points`
      );
      return interpolateResults(
        pointsMatrix,
        processedMatrix,
        result,
        numComponents
      );
    }

    logSuccess("TensorFlow.js UMAP completed successfully");
    logMemoryUsage("after UMAP");
    return result;
  } catch (error) {
    logError(`TensorFlow.js UMAP failed: ${error.message}`);
    logWarning("Falling back to PCA...");
    cleanupTensors();
    return await performPCA(pointsMatrix, numComponents);
  }
}

async function runTensorFlowUMAP(points, numComponents, options) {
  const { nNeighbors, minDist, nEpochs } = options;
  const n = points.length;

  logProgress(`Running TensorFlow.js UMAP on ${n} points...`);

  return await tf.tidy(() => {
    try {
      // Convert input to tensor
      const X = tf.tensor2d(points);
      logProgress(`Input tensor shape: [${X.shape.join(", ")}]`);

      // Build k-nearest neighbor graph using TensorFlow.js
      logProgress("Building k-NN graph with TensorFlow.js...");
      const knnGraph = buildTensorKNNGraph(X, nNeighbors);

      // Build fuzzy topological representation
      logProgress("Building fuzzy graph...");
      const fuzzyEdges = buildTensorFuzzyGraph(knnGraph, n);

      // Initialize embedding with larger spread for UMAP
      const embedding = tf.variable(
        tf.randomNormal([n, numComponents], 0, 10.0)
      );
      logProgress(
        `Initial embedding tensor shape: [${embedding.shape.join(", ")}]`
      );

      // Optimize embedding using TensorFlow.js
      logProgress("Optimizing embedding with TensorFlow.js...");
      const finalEmbedding = optimizeTensorUMAPEmbedding(
        embedding,
        fuzzyEdges,
        minDist,
        nEpochs
      );

      // Convert back to JavaScript array
      const resultArray = finalEmbedding.arraySync();

      // Ensure 3D output for visualization
      if (numComponents === 2) {
        for (let i = 0; i < resultArray.length; i++) {
          resultArray[i].push(0);
        }
        logProgress("Padded 2D result to 3D with Z=0");
      }

      logSuccess(
        `TensorFlow.js UMAP completed with ${resultArray.length} points in ${resultArray[0].length}D`
      );
      return resultArray;
    } catch (error) {
      logError(`TensorFlow.js UMAP failed during execution: ${error.message}`);
      throw error;
    }
  });
}

function buildTensorKNNGraph(X, k) {
  return tf.tidy(() => {
    const n = X.shape[0];
    logProgress(`Building k-NN graph for ${n} points with k=${k}...`);

    // Compute pairwise distances using TensorFlow.js
    const XSquaredNorms = tf.sum(tf.square(X), 1, true);
    const XSquaredNormsT = tf.transpose(XSquaredNorms);
    const XTX = tf.matMul(X, X, false, true);

    const distances = tf.sqrt(
      tf.maximum(
        tf.add(tf.add(XSquaredNorms, XSquaredNormsT), tf.mul(XTX, -2)),
        1e-10
      )
    );

    // Convert to JavaScript for k-nearest neighbor selection (complex indexing)
    const distancesArray = distances.arraySync();
    const knnGraph = new Array(n);

    for (let i = 0; i < n; i++) {
      const neighbors = [];
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          neighbors.push({ index: j, distance: distancesArray[i][j] });
        }
      }

      // Sort by distance and take k nearest
      neighbors.sort((a, b) => a.distance - b.distance);
      knnGraph[i] = neighbors.slice(0, k);

      if (i % 50 === 0) {
        logProgress(`  k-NN graph: ${((i / n) * 100).toFixed(1)}%`);
      }
    }

    logProgress(`k-NN graph completed`);
    return knnGraph;
  });
}

function buildTensorFuzzyGraph(knnGraph, n) {
  logProgress("Building fuzzy graph representation...");

  const fuzzyEdges = [];

  // Compute fuzzy set memberships
  for (let i = 0; i < n; i++) {
    const neighbors = knnGraph[i];
    if (neighbors.length === 0) continue;

    // Use median distance as scale parameter
    const distances = neighbors.map((neighbor) => neighbor.distance);
    distances.sort((a, b) => a - b);
    const sigma = Math.max(distances[Math.floor(distances.length / 2)], 1e-10);

    // Compute memberships using exponential kernel
    for (const neighbor of neighbors) {
      const membership = Math.exp(-neighbor.distance / sigma);
      if (membership > 0.01) {
        fuzzyEdges.push({
          from: i,
          to: neighbor.index,
          weight: membership,
        });
      }
    }
  }

  // Symmetrize the graph using fuzzy set union
  const edgeMap = new Map();
  for (const edge of fuzzyEdges) {
    const key1 = `${edge.from}-${edge.to}`;
    const key2 = `${edge.to}-${edge.from}`;

    if (!edgeMap.has(key1)) edgeMap.set(key1, 0);
    if (!edgeMap.has(key2)) edgeMap.set(key2, 0);

    edgeMap.set(key1, edgeMap.get(key1) + edge.weight);
    edgeMap.set(key2, edgeMap.get(key2) + edge.weight);
  }

  const symmetrizedEdges = [];
  const processedPairs = new Set();

  for (const [key, weight] of edgeMap) {
    const [from, to] = key.split("-").map(Number);
    const pairKey = from < to ? `${from}-${to}` : `${to}-${from}`;

    if (!processedPairs.has(pairKey)) {
      processedPairs.add(pairKey);
      const reverseKey = `${to}-${from}`;
      const reverseWeight = edgeMap.get(reverseKey) || 0;

      // Fuzzy set union: a + b - a*b
      const combinedWeight = weight + reverseWeight - weight * reverseWeight;

      if (combinedWeight > 0.01) {
        symmetrizedEdges.push({
          from: Math.min(from, to),
          to: Math.max(from, to),
          weight: combinedWeight,
        });
      }
    }
  }

  logProgress(`Fuzzy graph completed with ${symmetrizedEdges.length} edges`);
  return symmetrizedEdges;
}

function optimizeTensorUMAPEmbedding(embedding, fuzzyEdges, minDist, nEpochs) {
  return tf.tidy(() => {
    const n = embedding.shape[0];
    const numComponents = embedding.shape[1];
    const learningRate = 1.0;

    // UMAP curve parameters
    const a = tf.scalar(1.0 / minDist);
    const b = tf.scalar(1.0);

    logProgress(
      `Starting TensorFlow.js UMAP optimization: ${n} points, ${numComponents}D, ${nEpochs} epochs`
    );

    for (let epoch = 0; epoch < nEpochs; epoch++) {
      const alpha = tf.scalar(learningRate * (1 - epoch / nEpochs));

      // Process attractive forces from fuzzy graph edges
      for (const edge of fuzzyEdges) {
        const { from, to, weight } = edge;

        // Get point positions
        const pointFrom = tf.slice(embedding, [from, 0], [1, numComponents]);
        const pointTo = tf.slice(embedding, [to, 0], [1, numComponents]);

        // Compute distance
        const diff = tf.sub(pointFrom, pointTo);
        const distSq = tf.sum(tf.square(diff));
        const dist = tf.sqrt(tf.add(distSq, tf.scalar(1e-10)));

        // Attractive force using UMAP's curve
        const attractiveForce = tf.mul(
          tf.mul(tf.scalar(weight), alpha),
          tf.div(tf.scalar(1), tf.add(tf.scalar(1), tf.mul(a, distSq)))
        );

        // Compute gradients
        const gradDirection = tf.div(diff, dist);
        const grad = tf.mul(attractiveForce, gradDirection);

        // Update positions
        const updateFrom = tf.neg(grad);
        const updateTo = grad;

        // Apply updates
        const newPointFrom = tf.add(pointFrom, updateFrom);
        const newPointTo = tf.add(pointTo, updateTo);

        // Update embedding tensor
        embedding = tf.scatterND([[from]], newPointFrom, embedding.shape);
        embedding = tf.scatterND([[to]], newPointTo, embedding.shape);
      }

      // Sample some repulsive forces to maintain global structure
      const nRepulsive = Math.min(fuzzyEdges.length, 100);
      for (let rep = 0; rep < nRepulsive; rep++) {
        const i = Math.floor(Math.random() * n);
        const j = Math.floor(Math.random() * n);
        if (i === j) continue;

        const pointI = tf.slice(embedding, [i, 0], [1, numComponents]);
        const pointJ = tf.slice(embedding, [j, 0], [1, numComponents]);

        const diff = tf.sub(pointI, pointJ);
        const distSq = tf.sum(tf.square(diff));
        const dist = tf.sqrt(tf.add(distSq, tf.scalar(1e-10)));

        // Check if points are too close for repulsion
        const tooClose = tf.less(distSq, tf.scalar(4 * minDist * minDist));

        if (tooClose.dataSync()[0]) {
          // Repulsive force
          const repulsiveForce = tf.mul(
            tf.mul(alpha, b),
            tf.div(tf.scalar(1), tf.add(tf.scalar(1), tf.mul(a, distSq)))
          );

          const gradDirection = tf.div(diff, dist);
          const grad = tf.mul(repulsiveForce, gradDirection);

          // Apply repulsive updates
          const newPointI = tf.add(pointI, grad);
          const newPointJ = tf.sub(pointJ, grad);

          embedding = tf.scatterND([[i]], newPointI, embedding.shape);
          embedding = tf.scatterND([[j]], newPointJ, embedding.shape);
        }
      }

      // Progress update
      if (epoch % 25 === 0) {
        const progress = ((epoch / nEpochs) * 100).toFixed(1);
        logProgress(
          `  TensorFlow.js UMAP optimization: ${progress}% (epoch ${epoch})`
        );
      }
    }

    logProgress("TensorFlow.js UMAP optimization completed");
    return embedding;
  });
}
