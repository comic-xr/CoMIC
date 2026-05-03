// ----------------------------------------------------------------------------
// VR Avatars - Show User Representations in VR
// ----------------------------------------------------------------------------

import { vr as log } from "@Utils/logger.js";
import vtkSphereSource from "@kitware/vtk.js/Filters/Sources/SphereSource";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";

import {
  getUserId,
  getUserColor,
} from "@Collaboration/presence/userManagement.js";
import {
  yAvatars,
  syncAvatarToYjs,
} from "@Collaboration/yjs/yjsSetup.js";
import { vrModeManager } from "@VR/vrModeManager.js";
import { vrManager } from "@Core/vr/VRManager.js";

const HEAD_RADIUS = 0.09;
const HAND_RADIUS = 0.04;

class VRAvatarSystem {
  constructor() {
    this._contexts = new Map(); // instanceId -> { renderer, renderWindow, remoteAvatars }
    this._localUserId = getUserId();
    this._localUserColor = getUserColor();

    this._avatarObserver = null;
    this._frameHandler = null;
    this._vrExitHandler = null;
    this._modeChangeHandler = null;
    this._lastLocalPublish = 0;
    this._publishThrottleMs = 50;
  }

  initialize(instanceId, sceneObjects = {}) {
    if (!instanceId || !sceneObjects?.renderer) {
      log.warn("VRAvatarSystem.initialize requires an instanceId and renderer");
      return null;
    }

    const context = this._contexts.get(instanceId) || {
      renderer: sceneObjects.renderer,
      renderWindow: sceneObjects.renderWindow || null,
      remoteAvatars: new Map(),
    };

    context.renderer = sceneObjects.renderer;
    context.renderWindow = sceneObjects.renderWindow || null;
    this._contexts.set(instanceId, context);

    this._ensureObservers();
    this._hydrateRemoteAvatars(instanceId);

    if (vrModeManager.isVRMode()) {
      this.createLocalAvatar();
    }

    return context;
  }

  createLocalAvatar() {
    if (!this._localUserId) return;

    syncAvatarToYjs(this._localUserId, {
      mode: "vr",
      userColor: this._localUserColor,
      userName: "You",
      headPose: vrManager.getHeadPose?.()
        ? this._serializeTransform(vrManager.getHeadPose())
        : null,
    });
  }

  removeLocalAvatar() {
    if (!this._localUserId) return;
    yAvatars.delete(this._localUserId);
  }

  updateRemoteAvatar(userId, avatarData) {
    this._contexts.forEach((context, instanceId) => {
      const entry = this._ensureRemoteAvatarEntry(context, userId, avatarData);
      this._applyAvatarPose(entry, avatarData);
      this._requestRender(instanceId);
    });
  }

  removeRemoteAvatar(userId) {
    this._contexts.forEach((context, instanceId) => {
      this._removeRemoteAvatarFromContext(context, userId);
      this._requestRender(instanceId);
    });
  }

  cleanup(instanceId) {
    const context = this._contexts.get(instanceId);
    if (!context) return;

    Array.from(context.remoteAvatars.keys()).forEach((userId) => {
      this._removeRemoteAvatarFromContext(context, userId);
    });
    this._contexts.delete(instanceId);

    if (this._contexts.size === 0) {
      this._teardownObservers();
      this.removeLocalAvatar();
    }
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
    return result
      ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255,
        }
      : { r: 1, g: 0.42, b: 0.42 };
  }

  _ensureObservers() {
    if (!this._avatarObserver) {
      this._avatarObserver = (event) => {
        event.changes.keys.forEach((change, userId) => {
          if (userId === this._localUserId) return;

          if (change.action === "delete") {
            this.removeRemoteAvatar(userId);
            return;
          }

          const avatarData = yAvatars.get(userId);
          if (avatarData) {
            this.updateRemoteAvatar(userId, avatarData);
          }
        });
      };
      yAvatars.observe(this._avatarObserver);
    }

    if (!this._frameHandler) {
      this._frameHandler = ({ handPoses }) => {
        this._publishLocalAvatar(handPoses);
      };
      vrManager.on("frame", this._frameHandler);
    }

    if (!this._vrExitHandler) {
      this._vrExitHandler = () => this.removeLocalAvatar();
      vrManager.on("vrExited", this._vrExitHandler);
    }

    if (!this._modeChangeHandler) {
      this._modeChangeHandler = (mode) => {
        if (mode === "vr") {
          this.createLocalAvatar();
        } else {
          this.removeLocalAvatar();
        }
      };
      vrModeManager.onModeChange(this._modeChangeHandler);
    }
  }

  _teardownObservers() {
    if (this._avatarObserver) {
      yAvatars.unobserve(this._avatarObserver);
      this._avatarObserver = null;
    }
    if (this._frameHandler) {
      vrManager.off("frame", this._frameHandler);
      this._frameHandler = null;
    }
    if (this._vrExitHandler) {
      vrManager.off("vrExited", this._vrExitHandler);
      this._vrExitHandler = null;
    }
  }

  _hydrateRemoteAvatars(instanceId) {
    const context = this._contexts.get(instanceId);
    if (!context) return;

    yAvatars.forEach((avatarData, userId) => {
      if (userId === this._localUserId) return;
      const entry = this._ensureRemoteAvatarEntry(context, userId, avatarData);
      this._applyAvatarPose(entry, avatarData);
    });
  }

  _publishLocalAvatar(handPoses = {}) {
    if (!this._localUserId || !vrModeManager.isVRMode()) return;

    const now = Date.now();
    if (now - this._lastLocalPublish < this._publishThrottleMs) {
      return;
    }
    this._lastLocalPublish = now;

    syncAvatarToYjs(this._localUserId, {
      mode: "vr",
      userColor: this._localUserColor,
      userName: "You",
      headPose: vrManager.getHeadPose?.()
        ? this._serializeTransform(vrManager.getHeadPose())
        : null,
      leftHandPose: handPoses?.left
        ? this._serializeJointPose(handPoses.left)
        : null,
      rightHandPose: handPoses?.right
        ? this._serializeJointPose(handPoses.right)
        : null,
    });
  }

  _ensureRemoteAvatarEntry(context, userId, avatarData = {}) {
    if (context.remoteAvatars.has(userId)) {
      return context.remoteAvatars.get(userId);
    }

    const rgb = this.hexToRgb(avatarData.userColor || "#4f46e5");
    const entry = {
      head: this._createSphereActor(HEAD_RADIUS, [rgb.r, rgb.g, rgb.b], 0.92),
      leftHand: this._createSphereActor(HAND_RADIUS, [rgb.r, rgb.g, rgb.b], 0.6),
      rightHand: this._createSphereActor(HAND_RADIUS, [rgb.r, rgb.g, rgb.b], 0.6),
    };

    context.renderer.addActor(entry.head);
    context.renderer.addActor(entry.leftHand);
    context.renderer.addActor(entry.rightHand);
    context.remoteAvatars.set(userId, entry);

    return entry;
  }

  _removeRemoteAvatarFromContext(context, userId) {
    const entry = context.remoteAvatars.get(userId);
    if (!entry) return;

    context.renderer.removeActor(entry.head);
    context.renderer.removeActor(entry.leftHand);
    context.renderer.removeActor(entry.rightHand);
    context.remoteAvatars.delete(userId);
  }

  _applyAvatarPose(entry, avatarData = {}) {
    const headPosition =
      avatarData.headPose?.position || avatarData.position || null;
    const leftHandPosition =
      avatarData.leftHandPose?.position || avatarData.handPoses?.left?.position || null;
    const rightHandPosition =
      avatarData.rightHandPose?.position || avatarData.handPoses?.right?.position || null;

    this._setActorPose(entry.head, headPosition);
    this._setActorPose(entry.leftHand, leftHandPosition);
    this._setActorPose(entry.rightHand, rightHandPosition);
  }

  _setActorPose(actor, position) {
    if (!actor) return;

    if (!position) {
      actor.setVisibility(false);
      return;
    }

    actor.setVisibility(true);
    actor.setPosition(position.x || 0, position.y || 0, position.z || 0);
  }

  _createSphereActor(radius, color, opacity) {
    const source = vtkSphereSource.newInstance({
      radius,
      thetaResolution: 20,
      phiResolution: 20,
    });
    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(source.getOutputPort());

    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);
    actor.getProperty().setColor(...color);
    actor.getProperty().setOpacity(opacity);
    actor.setPickable(false);
    actor.setVisibility(false);

    return actor;
  }

  _serializeTransform(transform) {
    if (!transform) return null;

    return {
      position: transform.position
        ? {
            x: transform.position.x,
            y: transform.position.y,
            z: transform.position.z,
          }
        : null,
      orientation: transform.orientation
        ? {
            x: transform.orientation.x,
            y: transform.orientation.y,
            z: transform.orientation.z,
            w: transform.orientation.w,
          }
        : null,
    };
  }

  _serializeJointPose(joints) {
    const wrist =
      joints?.wrist ||
      joints?.["wrist"] ||
      joints?.["index-finger-tip"] ||
      joints?.["thumb-tip"] ||
      null;

    if (!wrist?.position) {
      return null;
    }

    return {
      position: {
        x: wrist.position.x,
        y: wrist.position.y,
        z: wrist.position.z,
      },
      orientation: wrist.orientation
        ? {
            x: wrist.orientation.x,
            y: wrist.orientation.y,
            z: wrist.orientation.z,
            w: wrist.orientation.w,
          }
        : null,
    };
  }

  _requestRender(instanceId) {
    const context = this._contexts.get(instanceId);
    context?.renderWindow?.render?.();
  }
}

export const vrAvatarSystem = new VRAvatarSystem();
