/**
 * VR Wrist Menu
 *
 * 8-segment radial menu attached to left wrist for VR interaction.
 *
 * @module VRWristMenu
 */

// Main component
export { VRWristMenu } from './VRWristMenu';
export { default } from './VRWristMenu';

// Context and provider
export {
    VRWristMenuProvider,
    useVRWristMenu,
    WRIST_MENU_SEGMENTS,
    ACTIVATION_CONFIG,
} from './VRWristMenuContext';

// Hooks
export { useWristPosition, useIsLookingAtWrist } from './hooks/useWristPosition';
export { useGazeActivation, useDoubleTapDetection, useDismissDetection } from './hooks/useGazeActivation';

// Components
export { RadialSegment } from './components/RadialSegment';
export { RadialCenter } from './components/RadialCenter';
export { GazeIndicator } from './components/GazeIndicator';
