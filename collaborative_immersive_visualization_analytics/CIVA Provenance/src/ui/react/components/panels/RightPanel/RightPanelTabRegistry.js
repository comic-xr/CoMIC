/**
 * @file RightPanelTabRegistry.js
 * @description Registers all right panel tab content components.
 *
 * This file MUST be imported early in the app initialization to ensure
 * all tab components are registered before they're needed.
 *
 * Import this file in your app entry point or in RightPanelProvider:
 * @example
 * // In App.jsx or CIAWebApp.jsx:
 * import '@UI/react/components/panels/RightPanel/RightPanelTabRegistry';
 *
 * @see RightPanelContext.jsx for the registration API
 */

import { registerRightPanelTab } from "./RightPanelContext";

// Import all tab content components
import { PeoplePanelContent } from "./tabs/PeopleTab";
import { VoicePanelContent } from "./tabs/VoiceTab";
import { RoomsPanelContent } from "./tabs/RoomsTab";
import { ChatPanelContent } from "./tabs/ChatTab";
import { ActivityPanelContent } from "./tabs/ActivityTab";
import { NotesPanelContent } from "./tabs/NotesTab";
import { RecordingsPanelContent } from "./tabs/RecordingsTab";
import { SettingsPanelContent } from "./tabs/SettingsTab";
import { AnalysisPanelContent } from "./tabs/AnalysisTab";

// =============================================================================
// REGISTER ALL TAB COMPONENTS
// =============================================================================

// PRESENCE & LOCATION
registerRightPanelTab("people", PeoplePanelContent);
registerRightPanelTab("voice", VoicePanelContent);
registerRightPanelTab("rooms", RoomsPanelContent);

// COMMUNICATION
registerRightPanelTab("chat", ChatPanelContent);
registerRightPanelTab("activity", ActivityPanelContent);

// DOCUMENTATION
registerRightPanelTab("notes", NotesPanelContent);
registerRightPanelTab("recording", RecordingsPanelContent);

// SETTINGS
registerRightPanelTab("settings", SettingsPanelContent);

// ANALYSIS & PROVENANCE
registerRightPanelTab("analysis", AnalysisPanelContent);

// Log registration status in development
if (process.env.NODE_ENV === "development") {
  console.log("[RightPanel] All 9 tab components registered");
}
