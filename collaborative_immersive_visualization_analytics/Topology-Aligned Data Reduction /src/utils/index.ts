/**
 * Utils Module
 *
 * Responsible for:
 * - Pure utility functions
 * - Mathematical operations
 * - String manipulation
 * - Array/object operations
 * - Formatting helpers
 * - Type guards and validation
 * - Vector and matrix math
 * - Common algorithms
 *
 * Categories:
 * - math: Vector/matrix operations, calculations
 * - string: String formatting, parsing
 * - array: Array manipulation, filtering
 * - object: Object operations, deep merge
 * - type-guards: Runtime type checking
 * - constants: Shared constants
 *
 * API Contract:
 * - Pure functions (no side effects)
 * - Well-documented parameters and return types
 * - Comprehensive test coverage
 * - No external dependencies (except Three.js for math)
 *
 * CONSTRAINTS:
 * - Zero side effects
 * - Immutable operations
 * - Reusable across all modules
 * - No state access
 *
 * DO NOT:
 * - Import from other feature modules
 * - Access global state
 * - Perform I/O operations
 * - Contain business logic
 */

// Export public API
export * from './math';
export * from './string';
export * from './array';
export * from './constants';
export type * from './types';
