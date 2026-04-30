/**
 * Feature manager: manages feature datasets and scalar field selection.
 * Single responsibility: track available scalar/feature datasets and which is active.
 */

import type { DatasetDescriptor, ScalarFieldDescriptor } from './dataset-descriptor';

export interface FeatureDatasetInfo {
  datasetId: string;
  descriptor: DatasetDescriptor;
  scalarFields: ScalarFieldDescriptor[];
}

/** Single responsibility: manage feature dataset metadata and active scalar field. */
export class FeatureManager {
  private descriptors = new Map<string, DatasetDescriptor>();
  private activeScalarField: string | null = null;
  private activeDatasetId: string | null = null;

  registerDescriptor(descriptor: DatasetDescriptor): void {
    this.descriptors.set(descriptor.id, descriptor);
  }

  getDescriptor(datasetId: string): DatasetDescriptor | undefined {
    return this.descriptors.get(datasetId);
  }

  getScalarFields(datasetId: string): ScalarFieldDescriptor[] {
    const d = this.descriptors.get(datasetId);
    return d?.scalarFields ?? [];
  }

  setActiveDataset(datasetId: string): void {
    this.activeDatasetId = datasetId;
    const fields = this.getScalarFields(datasetId);
    if (fields.length > 0 && !fields.some((f) => f.name === this.activeScalarField)) {
      this.activeScalarField = fields[0].name;
    }
  }

  getActiveScalarField(): string | null {
    return this.activeScalarField;
  }

  setActiveScalarField(name: string): void {
    this.activeScalarField = name;
  }

  getActiveDatasetId(): string | null {
    return this.activeDatasetId;
  }
}
