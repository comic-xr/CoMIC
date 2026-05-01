import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetView, mockSetMode } = vi.hoisted(() => ({
  mockGetView: vi.fn(),
  mockSetMode: vi.fn(),
}));

vi.mock("@Core/data/managers/ViewConfigurationManager.js", () => ({
  viewConfigurationManager: {
    getView: mockGetView,
  },
}));

vi.mock("@VR/vrModeManager.js", () => ({
  vrModeManager: {
    setMode: mockSetMode,
  },
}));

import { vrManager } from "./VRManager.js";

describe("vrManager", () => {
  beforeEach(() => {
    mockGetView.mockReset();
    mockSetMode.mockReset();
    vrManager._mode = "inactive";
    vrManager._isolatedViewId = null;
    vrManager._inputSources.clear();
    vrManager._isolationMode.reset();
  });

  it("enters isolation mode using the shared isolation controller", () => {
    mockGetView.mockReturnValue({ id: "view-42", width: 2, height: 1 });
    vrManager._mode = "grid";

    const state = vrManager.enterIsolationMode("view-42");

    expect(state.isIsolated).toBe(true);
    expect(vrManager.getState().isIsolated).toBe(true);
    expect(vrManager.getIsolatedViewId()).toBe("view-42");
  });

  it("emits normalized button press events for controller triggers", () => {
    const inputSource = { id: "controller-1" };
    vrManager._inputSources.set(inputSource, { handedness: "right" });

    const received = [];
    vrManager.on("buttonPress", (event) => received.push(event));

    vrManager._handleSelectStart({ inputSource, frame: null });

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      hand: "right",
      handedness: "right",
      button: "trigger",
    });
  });
});
