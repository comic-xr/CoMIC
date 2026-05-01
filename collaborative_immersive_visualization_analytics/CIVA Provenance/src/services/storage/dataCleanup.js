// src/services/dataCleanup.js
// Utility to clean up orphaned datasets and stale data

import { files as log } from "@Utils/logger.js";
import { dataCache } from "@Services/storage/dataCache.js";
import { useDatasetStore } from "@UI/react/store/datasetStore.js";

class DataCleanup {
  /**
   * Find orphaned datasets (metadata exists but no file in cache)
   */
  async findOrphanedDatasets() {
    const datasets = useDatasetStore.getState().getAllDatasets();
    const orphaned = [];

    for (const metadata of datasets) {
      if (!metadata.hash) {
        orphaned.push({
          id: metadata.id,
          name: metadata.name,
          reason: "missing_hash",
        });
        continue;
      }

      const hasFile = await dataCache.hasDataset(metadata.hash);
      if (!hasFile) {
        orphaned.push({
          id: metadata.id,
          name: metadata.name,
          reason: "missing_file",
          hash: metadata.hash,
        });
      }
    }

    return orphaned;
  }

  /**
   * Remove orphaned datasets
   */
  async removeOrphanedDatasets() {
    const orphaned = await this.findOrphanedDatasets();

    log.info(`Removing ${orphaned.length} orphaned datasets...`);

    for (const dataset of orphaned) {
      log.debug(`  - ${dataset.name} (${dataset.reason})`);
      window.CIA.datasetManager.removeDataset(dataset.id);
    }

    return orphaned.length;
  }

  /**
   * Full cleanup routine
   */
  async performFullCleanup() {
    log.info("Starting full cleanup...");

    const orphaned = await this.removeOrphanedDatasets();
    const dangling = this.removeDanglingYjsDatasets();

    log.info(`Cleanup complete: orphaned=${orphaned}, dangling=${dangling}`);

    return { orphaned, dangling };
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats() {
    const orphaned = await this.findOrphanedDatasets();
    const dangling = this.findDanglingYjsDatasets();
    const zustandCount = useDatasetStore.getState().getAllDatasets().length;
    const cacheStats = await dataCache.getStats();

    return {
      orphaned: orphaned.length,
      orphanedList: orphaned,
      dangling: dangling.length,
      danglingList: dangling,
      zustandCount,
      cacheCount: cacheStats.count,
      cacheSize: cacheStats.totalSize,
    };
  }

  /**
   * Print cleanup report
   */
  async printCleanupReport() {
    const stats = await this.getCleanupStats();

    log.info("Data Cleanup Report:");
    log.info(`Zustand Store: ${stats.zustandCount} datasets`);
    log.info(
      `IndexedDB Cache: ${stats.cacheCount} files (${(
        stats.cacheSize /
        1024 /
        1024
      ).toFixed(2)} MB)`
    );

    if (stats.orphaned > 0) {
      log.warn(`Found ${stats.orphaned} orphaned datasets:`);
      stats.orphanedList.forEach((d) => {
        log.debug(`  - ${d.name} (${d.reason})`);
      });
    }

    if (stats.dangling > 0) {
      log.warn(`Found ${stats.dangling} dangling Y.js entries:`);
      stats.danglingList.forEach((d) => {
        log.debug(`  - ${d.name}`);
      });
    }

    if (stats.orphaned === 0 && stats.dangling === 0) {
      log.info("No issues found - all data is clean!");
    } else {
      log.info("Run dataCleanup.performFullCleanup() to fix these issues");
    }

    return stats;
  }
}

export const dataCleanup = new DataCleanup();

// Make available globally for debugging
if (typeof window !== "undefined") {
  window.dataCleanup = dataCleanup;
}
