#!/usr/bin/env npx ts-node
/**
 * Build Script: Manifest Registry Generator
 *
 * This script discovers handler manifests, validates them against the contract,
 * and generates a unified registry.json for both client and server use.
 *
 * USAGE:
 *   npx ts-node scripts/buildManifestRegistry.ts
 *   npm run build:manifests
 *
 * OUTPUT:
 *   - dist/manifests/registry.json - For client bundling
 *   - server/manifests/registry.json - For server runtime
 *   - dist/manifests/registry.generated.ts - TypeScript with literal types
 *
 * @module scripts/buildManifestRegistry
 */

import * as fs from "fs";
import * as path from "path";
import {
  CONTRACT_VERSION,
  validateManifest,
  type HandlerManifest,
  type ManifestRegistry,
  type ValidationResult,
} from "../src/core/instances/types/contracts/index";

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  // Where to look for manifests
  manifestGlob: "src/core/instances/types/*/manifest.ts",
  typesDir: "src/core/instances/types",

  // Output locations
  outputDir: "dist/manifests",
  serverOutputDir: "server/manifests",

  // Output filenames
  registryFile: "registry.json",
  generatedTypesFile: "registry.generated.ts",

  // Validation options
  strictMode: true,
  failOnWarnings: false,
};

// =============================================================================
// MANIFEST DISCOVERY
// =============================================================================

/**
 * Discover manifest files in the types directory
 */
function discoverManifests(): string[] {
  const typesPath = path.resolve(process.cwd(), CONFIG.typesDir);

  if (!fs.existsSync(typesPath)) {
    console.error(`Error: Types directory not found: ${typesPath}`);
    process.exit(1);
  }

  const manifests: string[] = [];
  const entries = fs.readdirSync(typesPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const manifestPath = path.join(typesPath, entry.name, "manifest.ts");
      if (fs.existsSync(manifestPath)) {
        manifests.push(manifestPath);
      }
    }
  }

  return manifests;
}

/**
 * Load and parse a manifest file
 * Since this is TypeScript, we need to use ts-node or compile first
 */
async function loadManifest(
  manifestPath: string
): Promise<HandlerManifest | null> {
  try {
    // Use dynamic import with ts-node
    const module = await import(manifestPath);

    // Look for default export or named export
    const manifest =
      module.default ||
      module.vtkManifest ||
      module.plotlyManifest ||
      module.manifest;

    if (!manifest) {
      console.error(`  No manifest export found in ${manifestPath}`);
      return null;
    }

    return manifest as HandlerManifest;
  } catch (error) {
    console.error(`  Failed to load manifest: ${manifestPath}`);
    console.error(`  Error: ${(error as Error).message}`);
    return null;
  }
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate all manifests and return results
 */
function validateAllManifests(
  manifests: Map<string, HandlerManifest>
): Map<string, ValidationResult> {
  const results = new Map<string, ValidationResult>();

  for (const [type, manifest] of manifests) {
    const result = validateManifest(manifest);
    results.set(type, result);
  }

  return results;
}

/**
 * Print validation results to console
 */
function printValidationResults(
  results: Map<string, ValidationResult>
): boolean {
  let hasErrors = false;

  for (const [type, result] of results) {
    if (result.errors.length > 0 || result.warnings.length > 0) {
      console.log(`\n  ${type}:`);

      for (const error of result.errors) {
        console.error(`    ERROR: ${error.field} - ${error.message}`);
        hasErrors = true;
      }

      for (const warning of result.warnings) {
        console.warn(`    WARNING: ${warning.field} - ${warning.message}`);
      }
    } else {
      console.log(`  ${type}: Valid`);
    }
  }

  return hasErrors;
}

// =============================================================================
// REGISTRY GENERATION
// =============================================================================

/**
 * Build the file type index for quick lookups
 */
function buildFileTypeIndex(
  manifests: Map<string, HandlerManifest>
): ManifestRegistry["fileTypeIndex"] {
  const index: ManifestRegistry["fileTypeIndex"] = {};

  for (const [type, manifest] of manifests) {
    for (const fileType of manifest.fileTypes) {
      const ext = fileType.extension.toLowerCase();

      // Check if another handler already claims this extension
      if (index[ext]) {
        // Use priority to determine winner
        if (fileType.priority > index[ext].priority) {
          index[ext] = {
            handlerType: type,
            priority: fileType.priority,
            displayName: fileType.displayName,
            icon: fileType.icon,
            color: fileType.color,
          };
        }
      } else {
        index[ext] = {
          handlerType: type,
          priority: fileType.priority,
          displayName: fileType.displayName,
          icon: fileType.icon,
          color: fileType.color,
        };
      }
    }
  }

  return index;
}

/**
 * Generate the manifest registry
 */
function generateRegistry(
  manifests: Map<string, HandlerManifest>
): ManifestRegistry {
  const handlers: Record<string, HandlerManifest> = {};

  for (const [type, manifest] of manifests) {
    handlers[type] = manifest;
  }

  return {
    generatedAt: new Date().toISOString(),
    contractVersion: CONTRACT_VERSION,
    buildInfo: {
      nodeVersion: process.version,
      platform: process.platform,
    },
    handlers,
    fileTypeIndex: buildFileTypeIndex(manifests),
  };
}

// =============================================================================
// FILE OUTPUT
// =============================================================================

/**
 * Ensure output directories exist
 */
function ensureOutputDirs(): void {
  const dirs = [CONFIG.outputDir, CONFIG.serverOutputDir];

  for (const dir of dirs) {
    const fullPath = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`  Created directory: ${dir}`);
    }
  }
}

/**
 * Write the registry JSON file
 */
function writeRegistryJson(registry: ManifestRegistry): void {
  const jsonContent = JSON.stringify(registry, null, 2);

  // Write to dist/manifests
  const distPath = path.resolve(
    process.cwd(),
    CONFIG.outputDir,
    CONFIG.registryFile
  );
  fs.writeFileSync(distPath, jsonContent, "utf-8");
  console.log(`  Written: ${CONFIG.outputDir}/${CONFIG.registryFile}`);

  // Write to server/manifests
  const serverPath = path.resolve(
    process.cwd(),
    CONFIG.serverOutputDir,
    CONFIG.registryFile
  );
  fs.writeFileSync(serverPath, jsonContent, "utf-8");
  console.log(`  Written: ${CONFIG.serverOutputDir}/${CONFIG.registryFile}`);
}

/**
 * Generate TypeScript file with literal types
 */
function writeGeneratedTypes(registry: ManifestRegistry): void {
  const handlerTypes = Object.keys(registry.handlers)
    .map((t) => `'${t}'`)
    .join(" | ");

  const fileExtensions = Object.keys(registry.fileTypeIndex)
    .map((e) => `'${e}'`)
    .join(" | ");

  const content = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * Generated by scripts/buildManifestRegistry.ts
 * Generated at: ${registry.generatedAt}
 */

import type { ManifestRegistry, HandlerManifest } from '../src/core/instances/types/contracts/index';

/** All registered handler types */
export type HandlerType = ${handlerTypes || "never"};

/** All supported file extensions */
export type SupportedExtension = ${fileExtensions || "never"};

/** The generated registry data */
export const registry: ManifestRegistry = ${JSON.stringify(
    registry,
    null,
    2
  )} as const;

/** Get manifest for a specific handler type */
export function getManifest(type: HandlerType): HandlerManifest {
  return registry.handlers[type];
}

/** Get handler type for a file extension */
export function getHandlerForExtension(ext: SupportedExtension): HandlerType {
  return registry.fileTypeIndex[ext].handlerType as HandlerType;
}

/** Check if an extension is supported */
export function isExtensionSupported(ext: string): ext is SupportedExtension {
  return ext.toLowerCase() in registry.fileTypeIndex;
}

export default registry;
`;

  const outputPath = path.resolve(
    process.cwd(),
    CONFIG.outputDir,
    CONFIG.generatedTypesFile
  );
  fs.writeFileSync(outputPath, content, "utf-8");
  console.log(`  Written: ${CONFIG.outputDir}/${CONFIG.generatedTypesFile}`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  console.log("=== Manifest Registry Builder ===\n");
  console.log(`Contract Version: ${CONTRACT_VERSION}`);

  // 1. Discover manifests
  console.log("\n[1/5] Discovering manifests...");
  const manifestPaths = discoverManifests();
  console.log(`  Found ${manifestPaths.length} manifest(s)`);

  if (manifestPaths.length === 0) {
    console.warn("  No manifests found. Exiting.");
    process.exit(0);
  }

  // 2. Load manifests
  console.log("\n[2/5] Loading manifests...");
  const manifests = new Map<string, HandlerManifest>();

  for (const manifestPath of manifestPaths) {
    const relativePath = path.relative(process.cwd(), manifestPath);
    console.log(`  Loading: ${relativePath}`);

    const manifest = await loadManifest(manifestPath);
    if (manifest) {
      manifests.set(manifest.type, manifest);
      console.log(`    Type: ${manifest.type} (${manifest.displayName})`);
      console.log(`    File types: ${manifest.fileTypes.length}`);
    }
  }

  if (manifests.size === 0) {
    console.error("  No valid manifests loaded. Exiting.");
    process.exit(1);
  }

  // 3. Validate manifests
  console.log("\n[3/5] Validating manifests...");
  const validationResults = validateAllManifests(manifests);
  const hasErrors = printValidationResults(validationResults);

  if (hasErrors && CONFIG.strictMode) {
    console.error("\n  Validation failed. Fix errors and try again.");
    process.exit(1);
  }

  // 4. Generate registry
  console.log("\n[4/5] Generating registry...");
  const registry = generateRegistry(manifests);
  console.log(`  Handlers: ${Object.keys(registry.handlers).length}`);
  console.log(
    `  File types indexed: ${Object.keys(registry.fileTypeIndex).length}`
  );

  // 5. Write output files
  console.log("\n[5/5] Writing output files...");
  ensureOutputDirs();
  writeRegistryJson(registry);
  writeGeneratedTypes(registry);

  // Summary
  console.log("\n=== Build Complete ===\n");
  console.log("Registered handlers:");
  for (const [type, manifest] of manifests) {
    console.log(
      `  - ${type}: ${manifest.fileTypes.map((f) => f.extension).join(", ")}`
    );
  }
  console.log("\nFile type index:");
  for (const [ext, info] of Object.entries(registry.fileTypeIndex)) {
    console.log(
      `  .${ext} -> ${info.handlerType} (priority: ${info.priority})`
    );
  }
}

// Run
main().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
