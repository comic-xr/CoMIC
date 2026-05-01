// src/core/data/providers/StorageProvider.js
/**
 * Abstract interface for data storage
 * Implementations: LocalStorageProvider, ServerStorageProvider
 */
export class StorageProvider {
  // Dataset operations
  async storeDataset(file, metadata) {
    throw new Error("Not implemented");
  }
  async loadDataset(datasetId) {
    throw new Error("Not implemented");
  }
  async getDatasetMetadata(datasetId) {
    throw new Error("Not implemented");
  }
  async deleteDataset(datasetId) {
    throw new Error("Not implemented");
  }
  async listDatasets(sessionId) {
    throw new Error("Not implemented");
  }

  // ViewConfiguration operations
  async saveViewConfiguration(config) {
    throw new Error("Not implemented");
  }
  async loadViewConfiguration(viewId) {
    throw new Error("Not implemented");
  }
  async listViewConfigurations(sessionId) {
    throw new Error("Not implemented");
  }

  // Analysis operations
  async requestAnalysis(datasetId, algorithm, params) {
    throw new Error("Not implemented");
  }
  async getAnalysisResult(analysisId) {
    throw new Error("Not implemented");
  }
  async getAnalysisStatus(analysisId) {
    throw new Error("Not implemented");
  }

  // Annotation operations
  async saveAnnotations(datasetId, annotations) {
    throw new Error("Not implemented");
  }
  async loadAnnotations(datasetId) {
    throw new Error("Not implemented");
  }
}
