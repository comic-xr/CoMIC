// ----------------------------------------------------------------------------
// PCA Implementation using TensorFlow.js
// ----------------------------------------------------------------------------

import * as tf from "@tensorflow/tfjs";
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
} from "@Utils/logger.js";;

export async function performPCA(pointsMatrix, numComponents = 3) {
  const numPoints = pointsMatrix.length;
  const numDimensions = pointsMatrix[0].length;

  logInfo(`Starting PCA on ${numPoints.toLocaleString()} points`);
  logProgress(`Input: ${numDimensions}D -> ${numComponents}D`);
  logMemoryUsage("before PCA");

  try {
    // Use tf.tidy for automatic memory management
    const result = await tf.tidy(() => {
      logProgress("Creating data tensor...");

      // Convert to tensor
      const dataTensor = tf.tensor2d(pointsMatrix);
      logProgress(`Data tensor shape: [${dataTensor.shape.join(", ")}]`);

      // Center the data
      logProgress("Centering data...");
      const mean = tf.mean(dataTensor, 0);
      const centeredData = tf.sub(dataTensor, mean);

      // For large datasets or when we want 3 specific dimensions, use variance-based selection
      if (numPoints > 5000 || numComponents === 3) {
        return performVarianceBasedPCA(centeredData, numComponents);
      } else {
        // For smaller datasets, use SVD-based PCA for better quality
        return performSVDBasedPCA(centeredData, numComponents);
      }
    });

    logSuccess("PCA completed successfully");
    logMemoryUsage("after PCA");

    return result;
  } catch (error) {
    logError(`PCA failed: ${error.message}`);
    logMemoryUsage("after PCA error");

    // Clean up and try a fallback method
    cleanupTensors();
    throw error;
  }
}

function performVarianceBasedPCA(centeredData, numComponents) {
  logProgress("Using variance-based PCA approach...");

  const [numSamples, numFeatures] = centeredData.shape;

  // Compute covariance matrix
  const transposed = tf.transpose(centeredData);
  const covariance = tf.div(
    tf.matMul(transposed, centeredData),
    tf.scalar(numSamples - 1)
  );

  // Extract variances (diagonal elements)
  const covarianceArray = covariance.arraySync();
  const variances = [];

  for (let i = 0; i < covarianceArray.length; i++) {
    variances.push({
      index: i,
      variance: covarianceArray[i][i],
    });
  }

  // Sort by variance (descending)
  variances.sort((a, b) => b.variance - a.variance);

  // Select top components
  const selectedDims = variances.slice(
    0,
    Math.min(numComponents, variances.length)
  );

  logProgress("Selected dimensions with highest variance:");
  selectedDims.forEach((dim, i) => {
    logProgress(
      `  ${i + 1}. Dimension ${dim.index}: variance = ${dim.variance.toFixed(
        6
      )}`
    );
  });

  // Extract selected dimensions
  const centeredArray = centeredData.arraySync();
  const transformedData = [];

  for (let i = 0; i < centeredArray.length; i++) {
    const transformedPoint = [];
    for (const dim of selectedDims) {
      transformedPoint.push(centeredArray[i][dim.index]);
    }

    // Pad with zeros if needed for 3D visualization
    while (transformedPoint.length < 3) {
      transformedPoint.push(0);
    }

    transformedData.push(transformedPoint);
  }

  // Calculate explained variance ratio
  const totalVariance = variances.reduce((sum, v) => sum + v.variance, 0);
  const explainedVariance = selectedDims.reduce(
    (sum, v) => sum + v.variance,
    0
  );
  const explainedRatio = ((explainedVariance / totalVariance) * 100).toFixed(2);

  logProgress(`Explained variance ratio: ${explainedRatio}%`);

  return transformedData;
}

function performSVDBasedPCA(centeredData, numComponents) {
  logProgress("Using SVD-based PCA approach...");

  try {
    // Perform SVD decomposition
    const svd = tf.linalg.svd(centeredData, false, true);
    const { s, v } = svd;

    // Select principal components (first numComponents columns of V)
    const principalComponents = tf.slice(v, [0, 0], [-1, numComponents]);

    // Transform data
    const transformed = tf.matMul(centeredData, principalComponents);

    // Convert to JavaScript array
    let transformedData = transformed.arraySync();

    // Pad with zeros if needed for 3D visualization
    if (numComponents === 2) {
      transformedData = transformedData.map((point) => [...point, 0]);
    }

    // Calculate explained variance from singular values
    const singularValues = s.arraySync();
    const explainedVariance = singularValues.slice(0, numComponents);
    const totalVariance = singularValues.reduce(
      (sum, val) => sum + val * val,
      0
    );
    const explainedRatio = (
      (explainedVariance.reduce((sum, val) => sum + val * val, 0) /
        totalVariance) *
      100
    ).toFixed(2);

    logProgress(`SVD PCA explained variance ratio: ${explainedRatio}%`);

    return transformedData;
  } catch (svdError) {
    logWarning(
      `SVD failed, falling back to variance-based approach: ${svdError.message}`
    );
    return performVarianceBasedPCA(centeredData, numComponents);
  }
}
