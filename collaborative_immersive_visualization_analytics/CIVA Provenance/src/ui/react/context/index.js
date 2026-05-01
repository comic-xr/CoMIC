/**
 * Context exports
 * Location: src/ui/react/context/index.js
 */

export { DevUserProvider, useDevUser } from './DevUserContext.jsx';

// VG Editor context for multi-editor state management
export {
    VGEditorProvider,
    useVGEditor,
    useVGEditorRequired,
    useActiveVGEditor,
    useIsVGBeingEdited,
    useVGEditorPanelId,
} from './VGEditorContext.jsx';

// Canvas Map context for canvas editing state
export {
    CanvasMapProvider,
    useCanvasMap,
    useCanvasMapRequired,
    useCanvasMapActive,
    usePlacedVGIds,
    useIsVGOnCanvas,
} from './CanvasMapContext.jsx';
export {
    AdaptiveProvider,
    useAdaptive,
    useAdaptiveTokens,
    useIsVR,
    getAdaptiveCSSVars,
    ADAPTIVE_TOKENS,
} from './AdaptiveContext.jsx';

// Canvas focus context for tile mode pane-scoped state
export {
    CanvasFocusProvider,
    useCanvasFocus,
    useCanvasFocusRequired,
    useScopedActiveInstance,
    useIsPaneFocused,
    generatePaneId,
} from './CanvasFocusContext.jsx';

// Drag-to-link context for view linking
export { DragLinkProvider, useDragLink } from './DragLinkContext.jsx';

// Link indicators context for canvas visualization
export {
    LinkIndicatorsProvider,
    useLinkIndicators,
    useLinkIndicatorShortcuts,
    LINK_COLORS,
    STATUS_COLORS,
    ROLE_COLORS,
    PROPERTY_ICONS,
} from './LinkIndicatorsContext.jsx';

// VR interaction context for cross-platform input handling
export {
    VRInteractionProvider,
    useVRInteraction,
    useLinkInteraction,
    useReorderInteraction,
    useMoveInteraction,
    useResizeInteraction,
    useVRControllerInput,
    INTERACTION_INTENTS,
    INPUT_MODES,
    VR_CONTROLLER_MAPPING,
} from './VRInteractionContext.jsx';

// VR accessibility settings context
export {
    VRAccessibilityProvider,
    useVRAccessibility,
    useVRAccessibilitySection,
    DEFAULT_VR_ACCESSIBILITY,
} from './VRAccessibilityContext.jsx';
