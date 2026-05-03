/**
 * @file VRFrustumRenderer.js
 * @description Modality-agnostic Asymmetric Camera Coupling
 * Renders a 3D wireframe frustum (cone) in Desktop views to show where
 * VR users are looking without forcing the desktop camera to follow them.
 */

import { yCameras } from "@Collaboration/yjs/yjsSetup.js";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";
import { getUserId } from "@Collaboration/presence/userManagement.js";
import { cursor as log } from "@Utils/logger.js";
import { hexToRgb } from "@Utils/colorHelpers.js";

import vtkConeSource from "@kitware/vtk.js/Filters/Sources/ConeSource";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";

class VRFrustumRenderer {
    constructor() {
        this.instanceStates = new Map();
        
        yCameras.observe(() => {
            this.handleCameraUpdates();
        });
    }

    setupInstance(instanceId, container, sceneObjects, viewConfigId) {
        if (!sceneObjects || !sceneObjects.renderer) return;

        const state = {
            instanceId,
            container,
            sceneObjects,
            viewConfigId,
            actors: new Map() // userId -> { source, mapper, actor }
        };
        this.instanceStates.set(instanceId, state);
        this.handleCameraUpdates();
    }

    handleCameraUpdates() {
        const currentUserId = getUserId();
        const onlineUsers = presenceSystem.getOnlineUsers();

        this.instanceStates.forEach(state => {
            // Get camera for this view config from Yjs
            if (!state.viewConfigId) return;

            const camData = yCameras.get(state.viewConfigId);
            if (!camData || !camData.camera || !camData.userId) return;
            if (camData.userId === currentUserId) return; // Don't draw our own frustum

            // Check if the user is a VR/XR user
            const user = onlineUsers.find(u => u.userId === camData.userId);
            if (!user || (!user.capabilities?.xrCapable && user.deviceType !== 'vr')) {
                // If not VR user, we usually just sync the desktop camera (handled elsewhere)
                return;
            }

            // User is in VR! Let's display their asymmetric frustum
            this.renderUserFrustum(state, user, camData.camera);
        });
    }

    renderUserFrustum(state, user, cameraState) {
        let frustum = state.actors.get(user.userId);

        if (!frustum) {
            log.debug(`Creating VR Frustum for ${user.userName}`);
            const source = vtkConeSource.newInstance({
                height: 0.5,
                radius: 0.25,
                resolution: 4, 
            });

            const mapper = vtkMapper.newInstance();
            mapper.setInputConnection(source.getOutputPort());

            const actor = vtkActor.newInstance();
            actor.setMapper(mapper);
            
            // Render as wireframe frustum
            actor.getProperty().setRepresentationToWireframe();
            actor.getProperty().setLineWidth(2.0);
            actor.getProperty().setOpacity(0.6);
            
            const rgb = hexToRgb(user.userColor || "#60a5fa");
            actor.getProperty().setColor(...rgb);

            state.sceneObjects.renderer.addActor(actor);
            
            frustum = { source, mapper, actor };
            state.actors.set(user.userId, frustum);
        }

        // Update Position & Orientation
        if (cameraState.position && cameraState.focalPoint) {
            frustum.source.setCenter(cameraState.position);
            
            // Point the cone toward the focal point
            const dir = [
                cameraState.focalPoint[0] - cameraState.position[0],
                cameraState.focalPoint[1] - cameraState.position[1],
                cameraState.focalPoint[2] - cameraState.position[2]
            ];
            frustum.source.setDirection(dir);
            
            // Scale dynamically based on distance
            const dist = Math.hypot(dir[0], dir[1], dir[2]);
            frustum.source.setHeight(dist * 0.5);
            frustum.source.setRadius(dist * 0.25);
        }

        this.scheduleRender(state);
    }
    
    scheduleRender(state) {
        if (!state.sceneObjects?.renderWindow) return;
        requestAnimationFrame(() => state.sceneObjects.renderWindow.render());
    }

    destroyInstance(instanceId) {
        const state = this.instanceStates.get(instanceId);
        if (state) {
            state.actors.forEach((frustum) => {
                if (state.sceneObjects?.renderer) {
                    state.sceneObjects.renderer.removeActor(frustum.actor);
                }
            });
            this.instanceStates.delete(instanceId);
        }
    }
}

export const vrFrustumRenderer = new VRFrustumRenderer();
