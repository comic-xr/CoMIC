/**
 * String utilities (formatting, parsing)
 */

/**
 * Format a number with specified decimal places
 */
export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

/**
 * Convert camelCase to kebab-case
 */
export function toKebabCase(str: string): string {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Convert snake_case to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Capitalize first letter of string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate string to max length with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  return str.length > maxLength ? str.slice(0, maxLength - 3) + '...' : str;
}
