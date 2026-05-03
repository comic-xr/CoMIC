import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import { VRIsolationMode } from "./VRIsolationMode.js";

describe("VRIsolationMode", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("isolates a view and projects desktop cursors into the scaled plane", () => {
    const isolationMode = new VRIsolationMode();

    const state = isolationMode.isolateView(
      { id: "view-1", width: 2, height: 1.2 },
      { scale: 2, transitionMs: 10 }
    );

    expect(state.isIsolated).toBe(true);
    expect(state.viewId).toBe("view-1");
    expect(state.bounds.width).toBe(4);
    expect(state.bounds.height).toBe(2.4);

    const projected = isolationMode.projectDesktopCursor("user-2", { x: 0.75, y: 0.25 });
    expect(projected.userId).toBe("user-2");
    expect(projected.x).toBeCloseTo(1, 5);
    expect(projected.y).toBeCloseTo(1.8, 5);
    expect(projected.viewId).toBe("view-1");

    vi.advanceTimersByTime(10);
    expect(isolationMode.getState().isTransitioning).toBe(false);
  });

  it("computes controller intersections only when the ray hits the isolated view plane", () => {
    const isolationMode = new VRIsolationMode();
    isolationMode.isolateView(
      { id: "view-2", width: 2, height: 2 },
      { scale: 1, transitionMs: 1 }
    );

    const hit = isolationMode.getControllerIntersection({
      origin: { x: 0, y: 1.2, z: 0 },
      direction: { x: 0, y: 0, z: -1 },
    });

    expect(hit).not.toBeNull();
    expect(hit.z).toBeCloseTo(-1.5, 5);
    expect(hit.u).toBeCloseTo(0.5, 5);
    expect(hit.v).toBeCloseTo(0.5, 5);

    const miss = isolationMode.getControllerIntersection({
      origin: { x: 5, y: 5, z: 0 },
      direction: { x: 0, y: 0, z: -1 },
    });

    expect(miss).toBeNull();
  });
});
