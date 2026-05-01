// src/core/instances/types/vtk/utils/VTKPointProcessing.js

import { render as log, logProgress, logSuccess  } from "@Utils/logger.js";

/**
 * VTK Point Processing Utilities
 *
 * These functions bridge between generic algorithms (which work on plain arrays)
 * and VTK's specific data structures (polydata with typed arrays).
 *
 * WHY THESE ARE VTK-SPECIFIC:
 * - They know about VTK's getPoints() API
 * - They know points are stored as interleaved Float32Arrays
 * - They know how to call .modified() to trigger VTK updates
 *
 * Other visualization types would have their own processing:
 * - PlotlyPointProcessing.js (arrays ↔ Plotly traces)
 * - ThreePointProcessing.js (arrays ↔ THREE.BufferGeometry)
 */

/**
 * Extract points from VTK polydata into generic array format
 *
 * Converts: VTK polydata → Array of [x, y, z] arrays
 *
 * This is the "export" function that lets generic algorithms work on VTK data.
 */
export async function extractPointsFromPolyData(polyData) {
  const points = polyData.getPoints();
  if (!points) return null;

  const pointsArray = points.getData(); // Float32Array with interleaved xyz
  const numPoints = points.getNumberOfPoints();

  logProgress(
    `Extracting ${numPoints.toLocaleString()} points from VTK polydata...`
  );

  const pointsMatrix = [];

  // VTK stores points as [x1, y1, z1, x2, y2, z2, ...]
  // Convert to [[x1, y1, z1], [x2, y2, z2], ...]
  for (let i = 0; i < numPoints; i++) {
    const point = [
      pointsArray[i * 3], // x
      pointsArray[i * 3 + 1], // y
      pointsArray[i * 3 + 2], // z
    ];
    pointsMatrix.push(point);
  }

  return pointsMatrix;
}

/**
 * Apply reduced points back to VTK polydata
 *
 * Converts: Array of [x, y, z] arrays → VTK polydata
 *
 * This is the "import" function that puts algorithm results back into VTK.
 */
export function applyReductionToPolyData(polyData, reducedPoints) {
  logProgress("Applying transformed points to VTK polydata...");

  const points = polyData.getPoints();
  const pointsArray = points.getData();
  const numPoints = points.getNumberOfPoints();

  // Check if this is 2D (all Z coordinates are 0)
  const is2D = reducedPoints.every(
    (point) => point.length >= 3 && point[2] === 0
  );

  // Update the VTK point data
  // Convert from [[x1, y1, z1], ...] back to [x1, y1, z1, x2, y2, z2, ...]
  for (let i = 0; i < numPoints; i++) {
    pointsArray[i * 3] = reducedPoints[i][0];
    pointsArray[i * 3 + 1] = reducedPoints[i][1];
    pointsArray[i * 3 + 2] =
      reducedPoints[i].length > 2 ? reducedPoints[i][2] : 0;
  }

  // CRITICAL: Mark as modified so VTK knows to update
  points.setData(pointsArray);
  points.modified();
  polyData.modified();

  // Recalculate bounds
  polyData.getBounds();

  if (is2D) {
    logSuccess("Applied 2D visualization - all points in XY plane (Z=0)");
  } else {
    logSuccess("Applied 3D visualization with transformed points");
  }
}

/**
 * Clone VTK polydata for backup purposes
 *
 * Creates a deep copy of the polydata, especially the point data.
 * This is needed so we can restore original data after reduction.
 */
export function clonePolydata(polydata) {
  if (!polydata) {
    throw new Error("Cannot clone null polydata");
  }

  log.debug("Cloning polydata for backup...");

  // Import VTK factories
  const vtkPolyData =
    require("@kitware/vtk.js/Common/DataModel/PolyData").default;
  const vtkPoints = require("@kitware/vtk.js/Common/Core/Points").default;
  const vtkCellArray = require("@kitware/vtk.js/Common/Core/CellArray").default;

  // Create new polydata
  const cloned = vtkPolyData.newInstance();

  // Clone points - FIXED: Use the factory, not instance method
  const originalPoints = polydata.getPoints();
  if (originalPoints) {
    const newPoints = vtkPoints.newInstance(); // Factory function, not points.newInstance()
    const pointData = originalPoints.getData();
    newPoints.setData(new Float32Array(pointData), 3); // Deep copy the array
    cloned.setPoints(newPoints);
  }

  // Clone polys (cells)
  const originalPolys = polydata.getPolys();
  if (originalPolys) {
    const newPolys = vtkCellArray.newInstance();
    const polyData = originalPolys.getData();
    newPolys.setData(new Uint32Array(polyData)); // Deep copy
    cloned.setPolys(newPolys);
  }

  // Clone verts if they exist
  const originalVerts = polydata.getVerts();
  if (originalVerts && originalVerts.getNumberOfCells() > 0) {
    const newVerts = vtkCellArray.newInstance();
    const vertData = originalVerts.getData();
    newVerts.setData(new Uint32Array(vertData));
    cloned.setVerts(newVerts);
  }

  // Clone lines if they exist
  const originalLines = polydata.getLines();
  if (originalLines && originalLines.getNumberOfCells() > 0) {
    const newLines = vtkCellArray.newInstance();
    const lineData = originalLines.getData();
    newLines.setData(new Uint32Array(lineData));
    cloned.setLines(newLines);
  }

  // Clone PointData (scalars, colors, normals, etc.)
  const originalPointData = polydata.getPointData();
  if (originalPointData) {
    const clonedPointData = cloned.getPointData();
    const numArrays = originalPointData.getNumberOfArrays();

    for (let i = 0; i < numArrays; i++) {
      const originalArray = originalPointData.getArrayByIndex(i);
      if (originalArray) {
        const vtkDataArray = require("@kitware/vtk.js/Common/Core/DataArray").default;
        const newArray = vtkDataArray.newInstance({
          name: originalArray.getName(),
          numberOfComponents: originalArray.getNumberOfComponents(),
          values: originalArray.getData().slice(), // Deep copy the typed array
        });
        clonedPointData.addArray(newArray);
      }
    }

    // Copy active scalars/vectors settings
    const activeScalars = originalPointData.getScalars();
    if (activeScalars) {
      const name = activeScalars.getName();
      clonedPointData.setActiveScalars(name);
    }
  }

  // Clone CellData (cell-level scalars, colors, etc.)
  const originalCellData = polydata.getCellData();
  if (originalCellData) {
    const clonedCellData = cloned.getCellData();
    const numArrays = originalCellData.getNumberOfArrays();

    for (let i = 0; i < numArrays; i++) {
      const originalArray = originalCellData.getArrayByIndex(i);
      if (originalArray) {
        const vtkDataArray = require("@kitware/vtk.js/Common/Core/DataArray").default;
        const newArray = vtkDataArray.newInstance({
          name: originalArray.getName(),
          numberOfComponents: originalArray.getNumberOfComponents(),
          values: originalArray.getData().slice(), // Deep copy the typed array
        });
        clonedCellData.addArray(newArray);
      }
    }

    // Copy active scalars settings
    const activeScalars = originalCellData.getScalars();
    if (activeScalars) {
      const name = activeScalars.getName();
      clonedCellData.setActiveScalars(name);
    }
  }

  log.debug("Polydata cloned successfully (including PointData and CellData)");
  return cloned;
}
