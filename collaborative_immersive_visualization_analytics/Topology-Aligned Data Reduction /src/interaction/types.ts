/**
 * Type definitions for interaction module
 */

export type GestureType = 'tap' | 'swipe' | 'pinch' | 'drag' | 'long-press';

export interface InputEvent {
  type: 'mouse' | 'touch' | 'xr' | 'keyboard';
  subType: string; // 'click', 'move', 'up', 'down', etc.
  position?: { x: number; y: number };
  delta?: { x: number; y: number };
  key?: string; // For keyboard events
  timestamp: number;
  pointerCount?: number; // For touch/XR
}

export interface GestureEvent extends InputEvent {
  gesture: GestureType;
  magnitude?: number; // For pinch, swipe
  direction?: { x: number; y: number };
}

export interface RaycastHit {
  object: unknown;
  distance: number;
  point: { x: number; y: number; z: number };
}
