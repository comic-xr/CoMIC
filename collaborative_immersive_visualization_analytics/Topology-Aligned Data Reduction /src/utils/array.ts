/**
 * Array utilities
 */

/**
 * Group array items by a key function
 */
export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce(
    (acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    },
    {} as Record<K, T[]>
  );
}

/**
 * Remove duplicates from array
 */
export function deduplicate<T>(array: T[], keyFn?: (item: T) => string): T[] {
  const seen = new Set<string>();
  return array.filter((item) => {
    const key = keyFn ? keyFn(item) : JSON.stringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Split array into chunks
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Flatten nested arrays by one level
 */
export function flatten<T>(array: (T | T[])[]): T[] {
  return array.reduce<T[]>((acc, item) => {
    if (Array.isArray(item)) {
      return acc.concat(item);
    }
    return acc.concat([item]);
  }, []);
}
