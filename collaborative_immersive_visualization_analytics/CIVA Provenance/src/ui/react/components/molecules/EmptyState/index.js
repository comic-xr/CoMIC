/**
 * @file index.js
 * @description Public exports for the EmptyState component.
 *
 * @example
 * import { EmptyState } from '@UI/react/components/molecules/EmptyState';
 *
 * // No search results
 * <EmptyState
 *   icon="search"
 *   title="No results found"
 *   description="Try adjusting your search or filter criteria"
 * />
 *
 * // Empty list with action
 * <EmptyState
 *   icon="folder"
 *   title="No projects"
 *   description="Create your first project to get started"
 *   action={{ label: 'Create Project', onClick: handleCreate }}
 * />
 */

export { EmptyState } from "./EmptyState";
export { default } from "./EmptyState";
