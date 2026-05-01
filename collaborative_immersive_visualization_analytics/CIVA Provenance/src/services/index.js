// src/services/index.js
// =============================================================================
// CIA Web Application Services - Module-Based Organization
// =============================================================================
//
// Services provide centralized business logic that coordinates between managers.
// They are the preferred API for UI components to interact with the system.
//
// ORGANIZATION:
// - View Operations: createAndPlaceView, linkingService
// - Authentication: keycloak, session management
// - Voice Communication: LiveKit integration
// - Collaboration: real-time sync, cursors, annotations
// - Data Management: caching, storage, sync
// - Utilities: API client, logging
//
// USAGE:
// import { viewLifecycleService } from '@Services';
// import { authService } from '@Services';
// import { voiceRoomService } from '@Services/voice';
//
// =============================================================================

// ============================================================================
// VIEW & CANVAS OPERATIONS
// ============================================================================

export { viewLifecycleService } from "./ViewLifecycleService.js";
export { viewLinkingService, LINKING_EVENTS } from "./ViewLinkingService.js";

// ============================================================================
// AUTHENTICATION & SESSION
// ============================================================================

export { authService } from "./authService.js";

// ============================================================================
// VOICE COMMUNICATION
// ============================================================================

export { voiceRoomService } from "./voice/voiceRoomService.js";
export { voiceCommandService } from "./voice/voiceCommandService.js";
export { voiceFeedbackService } from "./voice/voiceFeedbackService.js";
export { recordingCaptureService } from "./recordingCaptureService.js";

// ============================================================================
// DATA MANAGEMENT & CACHING
// ============================================================================

export { apiClient } from "./apiClient.js";
export { provenanceService } from "./provenanceService.js";
export { DivergenceLevel, calculateDivergence, checkForServerReset, checkSyncStatus, clearSyncState, fetchServerStatus, performReconciliation, updateSyncState } from "./syncService.js";
export { serverSync } from "./serverSync.js";
export { initializeStorageProvider, checkServerHealth, getStorageConfig } from "./storage/storageService.js";
export { dataCache } from "./storage/dataCache.js";

// ============================================================================
// THUMBNAIL SERVICES
// ============================================================================

export { ThumbnailCaptureService } from "./ThumbnailCaptureService.js";
export { thumbnailCacheService } from "./thumbnails/ThumbnailCacheService.js";

// ============================================================================
// LIFECYCLE & STATE MANAGEMENT
// ============================================================================

// ============================================================================
// CORE EVENT BUS (for reactivity)
// ============================================================================

export { eventBus, BUS_EVENTS } from "@Core/events/EventBus.js";
