/**
 * Type definitions for utils module
 */

export type Vector3 = { x: number; y: number; z: number };

export type Quaternion = { x: number; y: number; z: number; w: number };

export type Matrix4 = number[][]; // 4x4 matrix

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl?: number; // Time to live in milliseconds
}

export type Predicate<T> = (item: T) => boolean;

export type Selector<T, R> = (item: T) => R;

export type Comparator<T> = (a: T, b: T) => number;
