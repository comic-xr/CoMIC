// ----------------------------------------------------------------------------
// t-SNE Implementation (Pure JavaScript)
// ----------------------------------------------------------------------------
import { performPCA } from "@Algorithms/dimensionality/pca.js";
import { interpolateResults } from "@Algorithms/processing/interpolation.js";
import { ALGORITHM_LIMITS } from "@Core/config/constants.js";
import {
  logInfo,
  logProgress,
  logSuccess,
  logError,
  logWarning,
} from "@Utils/logger.js";

// Helper functions for debugging t-SNE
function getDataRange(data) {
  if (!data || data.length === 0) return "empty";

  let min = Infinity,
    max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data[i].length; j++) {
      if (data[i][j] < min) min = data[i][j];
      if (data[i][j] > max) max = data[i][j];
    }
  }
  return `[${min.toFixed(4)}, ${max.toFixed(4)}]`;
}

function getDistanceRange(distances) {
  if (!distances || distances.length === 0) return "empty";

  let min = Infinity,
    max = -Infinity;
  for (let i = 0; i < distances.length; i++) {
    for (let j = 0; j < distances[i].length; j++) {
      if (i !== j) {
        if (distances[i][j] < min) min = distances[i][j];
        if (distances[i][j] > max) max = distances[i][j];
      }
    }
  }
  return `[${min.toFixed(4)}, ${max.toFixed(4)}]`;
}

export async function performTSNE(
  pointsMatrix,
  numComponents = 2,
  options = {}
) {
  const {
    perplexity = 10.0,
    maxIterations = 300,
    learningRate = 100.0,
  } = options;

  const numPoints = pointsMatrix.length;

  logInfo(`Starting t-SNE on ${numPoints.toLocaleString()} points`);
  logProgress(
    `Parameters: perplexity=${perplexity}, iterations=${maxIterations}`
  );

  // For very large datasets, subsample
  let processedMatrix = pointsMatrix;
  let needsInterpolation = false;

  if (numPoints > ALGORITHM_LIMITS.MAX_TSNE_POINTS) {
    logWarning(`Large dataset: ${numPoints.toLocaleString()} points`);
    logProgress(
      `Subsampling to ${ALGORITHM_LIMITS.MAX_TSNE_POINTS} points for t-SNE computation`
    );

    const step = Math.floor(numPoints / ALGORITHM_LIMITS.MAX_TSNE_POINTS);
    processedMatrix = [];
    for (let i = 0; i < numPoints; i += step) {
      if (processedMatrix.length < ALGORITHM_LIMITS.MAX_TSNE_POINTS) {
        processedMatrix.push(pointsMatrix[i]);
      }
    }
    needsInterpolation = true;
    logProgress(`Sampled ${processedMatrix.length} points for analysis`);
  }

  try {
    const result = await runTSNE(processedMatrix, numComponents, {
      perplexity: Math.min(perplexity, Math.floor(processedMatrix.length / 6)),
      maxIterations,
      learningRate,
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

    logSuccess("t-SNE completed successfully");
    return result;
  } catch (error) {
    logError(`t-SNE failed: ${error.message}`);
    logWarning("Falling back to PCA...");
    return await performPCA(pointsMatrix, numComponents);
  }
}

async function runTSNE(points, numComponents, options) {
  const { perplexity, maxIterations, learningRate } = options;
  const n = points.length;
  const numDims = points[0].length;

  logProgress(`Running t-SNE on ${n} points with ${numDims} dimensions...`);
  logProgress(`Target output: ${numComponents}D`);

  try {
    // Initialize embedding randomly with larger initial values
    let Y = Array.from({ length: n }, () =>
      Array.from({ length: numComponents }, () => (Math.random() - 0.5) * 2.0)
    );

    logProgress(`Initial embedding range: ${getDataRange(Y)}`);

    // Compute pairwise distances
    logProgress("Computing pairwise distances...");
    const distances = computePairwiseDistances(points);
    logProgress(
      `Distance matrix computed, range: ${getDistanceRange(distances)}`
    );

    // Compute P matrix (affinities in high-dimensional space)
    logProgress("Computing probability matrix...");
    const P = await computePMatrix(distances, perplexity);
    logProgress(`P matrix computed, checking for valid probabilities...`);

    // Validate P matrix
    let pSum = 0;
    let validPs = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (P[i][j] > 0 && !isNaN(P[i][j])) {
          pSum += P[i][j];
          validPs++;
        }
      }
    }
    logProgress(
      `P matrix validation: ${validPs} valid entries, sum = ${pSum.toFixed(6)}`
    );

    if (validPs === 0) {
      throw new Error("P matrix contains no valid probabilities");
    }

    // Optimize embedding using gradient descent
    logProgress("Optimizing embedding...");
    Y = await optimizeEmbedding(Y, P, learningRate, maxIterations);

    logProgress(`Final embedding range: ${getDataRange(Y)}`);

    // Validate final embedding
    for (let i = 0; i < Y.length; i++) {
      for (let j = 0; j < Y[i].length; j++) {
        if (isNaN(Y[i][j]) || !isFinite(Y[i][j])) {
          logError(
            `NaN or infinite value detected at position [${i}][${j}]: ${Y[i][j]}`
          );
          throw new Error("t-SNE produced invalid results");
        }
      }
    }

    // Ensure 3D output for visualization
    if (numComponents === 2) {
      for (let i = 0; i < n; i++) {
        Y[i].push(0);
      }
      logProgress("Padded 2D result to 3D with Z=0");
    }

    logSuccess(
      `t-SNE completed successfully with ${Y.length} points in ${Y[0].length}D`
    );
    return Y;
  } catch (error) {
    logError(`t-SNE failed during execution: ${error.message}`);
    throw error;
  }
}

function computePairwiseDistances(points) {
  const n = points.length;
  const numDims = points[0].length;
  const distances = new Array(n);

  for (let i = 0; i < n; i++) {
    distances[i] = new Array(n);
    for (let j = 0; j < n; j++) {
      if (i === j) {
        distances[i][j] = 0;
      } else {
        let dist = 0;
        for (let d = 0; d < numDims; d++) {
          const diff = points[i][d] - points[j][d];
          dist += diff * diff;
        }
        distances[i][j] = Math.sqrt(dist);
      }
    }
  }

  return distances;
}

async function computePMatrix(distances, perplexity) {
  const n = distances.length;
  const P = new Array(n);
  const targetEntropy = Math.log2(perplexity);

  logProgress(`Computing P matrix with target perplexity: ${perplexity}`);

  // Compute P matrix with binary search for optimal sigma
  for (let i = 0; i < n; i++) {
    P[i] = new Array(n);

    // Binary search for optimal sigma (bandwidth)
    let sigma = 1.0;
    let sigmaMin = 1e-20;
    let sigmaMax = 1e20;
    let bestProbs = null;

    // Try to find good initial sigma value
    const sortedDistances = distances[i]
      .filter((d, j) => j !== i)
      .sort((a, b) => a - b);
    const medianDist = sortedDistances[Math.floor(sortedDistances.length / 2)];
    sigma = Math.max(medianDist / 2, 1e-10);

    for (let iter = 0; iter < 50; iter++) {
      let sum = 0;
      const probs = new Array(n);

      // Compute probabilities with current sigma
      for (let j = 0; j < n; j++) {
        if (i === j) {
          probs[j] = 0;
        } else {
          const exp_val = Math.exp(
            (-distances[i][j] * distances[i][j]) / (2 * sigma * sigma)
          );
          probs[j] = exp_val;
          sum += exp_val;
        }
      }

      // Normalize probabilities
      if (sum > 1e-50) {
        for (let j = 0; j < n; j++) {
          if (i !== j) {
            probs[j] /= sum;
          }
        }
      } else {
        // If sum is too small, use uniform probabilities
        const uniform_prob = 1.0 / (n - 1);
        for (let j = 0; j < n; j++) {
          probs[j] = i === j ? 0 : uniform_prob;
        }
      }

      // Compute entropy
      let entropy = 0;
      for (let j = 0; j < n; j++) {
        if (probs[j] > 1e-50) {
          entropy -= probs[j] * Math.log2(probs[j]);
        }
      }

      const entropyDiff = entropy - targetEntropy;

      // Check convergence
      if (Math.abs(entropyDiff) < 1e-5 || iter === 49) {
        for (let j = 0; j < n; j++) {
          P[i][j] = Math.max(probs[j], 1e-50); // Prevent zeros
        }
        bestProbs = probs;
        break;
      }

      // Adjust sigma - if entropy is too high, increase sigma; if too low, decrease sigma
      if (entropyDiff > 0) {
        sigmaMin = sigma;
        if (sigmaMax === 1e20) {
          sigma = sigma * 2;
        } else {
          sigma = (sigma + sigmaMax) / 2;
        }
      } else {
        sigmaMax = sigma;
        sigma = (sigma + sigmaMin) / 2;
      }

      // Prevent sigma from getting too small or too large
      sigma = Math.max(Math.min(sigma, 1e10), 1e-10);
    }

    // Progress update
    if (i % 25 === 0) {
      const progress = ((i / n) * 100).toFixed(1);
      logProgress(`  P matrix computation: ${progress}%`);

      // Yield control periodically
      if (i % 50 === 0 && i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    }
  }

  // Symmetrize P matrix and normalize
  let totalSum = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      P[i][j] = (P[i][j] + P[j][i]) / 2;
      if (i !== j) {
        totalSum += P[i][j];
      }
    }
  }

  // Normalize by total sum and ensure minimum values
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        P[i][j] = 0;
      } else {
        P[i][j] = Math.max(P[i][j] / totalSum, 1e-12);
      }
    }
  }

  logProgress(
    `P matrix completed, total sum after normalization: ${totalSum.toFixed(6)}`
  );

  return P;
}

async function optimizeEmbedding(Y, P, learningRate, maxIterations) {
  const n = Y.length;
  const numComponents = Y[0].length;
  let momentum = Array.from({ length: n }, () => Array(numComponents).fill(0));

  logProgress(
    `Starting embedding optimization: ${n} points, ${numComponents}D, ${maxIterations} iterations`
  );

  for (let iter = 0; iter < maxIterations; iter++) {
    // Compute Q matrix (affinities in low-dimensional space)
    let sumQ = 0;
    const Q = new Array(n);

    for (let i = 0; i < n; i++) {
      Q[i] = new Array(n);
      for (let j = 0; j < n; j++) {
        if (i === j) {
          Q[i][j] = 0;
        } else {
          let dist = 0;
          for (let d = 0; d < numComponents; d++) {
            const diff = Y[i][d] - Y[j][d];
            dist += diff * diff;
          }
          Q[i][j] = 1 / (1 + dist);
          sumQ += Q[i][j];
        }
      }
    }

    // Normalize Q matrix
    if (sumQ > 1e-50) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          Q[i][j] /= sumQ;
          Q[i][j] = Math.max(Q[i][j], 1e-12);
        }
      }
    } else {
      logWarning(`Very small sumQ at iteration ${iter}: ${sumQ}`);
    }

    // Compute gradient
    const gradient = Array.from({ length: n }, () =>
      Array(numComponents).fill(0)
    );

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const pij = P[i][j];
          const qij = Q[i][j];
          const factor = 4 * (pij - qij) * qij * sumQ;

          for (let d = 0; d < numComponents; d++) {
            gradient[i][d] += factor * (Y[i][d] - Y[j][d]);
          }
        }
      }
    }

    // Update embedding with momentum
    const momentumFactor = iter < 20 ? 0.5 : 0.8;
    const currentLR = iter < 100 ? learningRate * 4 : learningRate;

    // Check for problematic gradients
    let maxGrad = 0;
    for (let i = 0; i < n; i++) {
      for (let d = 0; d < numComponents; d++) {
        maxGrad = Math.max(maxGrad, Math.abs(gradient[i][d]));
      }
    }

    // Clip gradients if they're too large
    const gradClip = 5.0;
    if (maxGrad > gradClip) {
      const clipFactor = gradClip / maxGrad;
      for (let i = 0; i < n; i++) {
        for (let d = 0; d < numComponents; d++) {
          gradient[i][d] *= clipFactor;
        }
      }
      if (iter % 50 === 0) {
        logProgress(
          `  Clipped gradients at iteration ${iter}, max grad was ${maxGrad.toFixed(
            4
          )}`
        );
      }
    }

    // Apply momentum and gradients
    for (let i = 0; i < n; i++) {
      for (let d = 0; d < numComponents; d++) {
        if (isFinite(gradient[i][d])) {
          momentum[i][d] =
            momentumFactor * momentum[i][d] - currentLR * gradient[i][d];
          Y[i][d] += momentum[i][d];

          // Check for NaN or infinite values
          if (!isFinite(Y[i][d])) {
            logError(
              `NaN/Inf detected at iteration ${iter}, point ${i}, dimension ${d}`
            );
            Y[i][d] = (Math.random() - 0.5) * 0.1; // Reset to small random value
          }
        }
      }
    }

    // Center embedding
    for (let d = 0; d < numComponents; d++) {
      const mean = Y.reduce((sum, point) => sum + point[d], 0) / n;
      for (let i = 0; i < n; i++) {
        Y[i][d] -= mean;
      }
    }

    // Progress update with diagnostic info
    if (iter % 25 === 0) {
      const progress = ((iter / maxIterations) * 100).toFixed(1);
      const yRange = getDataRange(Y);
      logProgress(
        `  t-SNE optimization: ${progress}% (iter ${iter}), Y range: ${yRange}, max grad: ${maxGrad.toFixed(
          4
        )}`
      );

      // Yield control periodically
      if (iter % 50 === 0 && iter > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    }
  }

  logProgress(
    `Optimization completed. Final embedding range: ${getDataRange(Y)}`
  );
  return Y;
}
