import { describe, expect, it } from 'vitest';
import { clamp, hexToRgb, rgbToHex } from './colorHelpers.js';

describe('colorHelpers', () => {
  it('converts hex to normalized rgb', () => {
    expect(hexToRgb('#60a5fa')).toEqual([96 / 255, 165 / 255, 250 / 255]);
  });

  it('falls back to default color when hex is invalid', () => {
    expect(hexToRgb('#xyz')).toEqual([96 / 255, 165 / 255, 250 / 255]);
  });

  it('converts normalized rgb to hex', () => {
    expect(rgbToHex([96 / 255, 165 / 255, 250 / 255])).toBe('#60a5fa');
  });

  it('clamps rgb channels before converting to hex', () => {
    expect(rgbToHex([2, -1, 0.5])).toBe('#ff0080');
  });

  it('clamps values in range', () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
  });
});
