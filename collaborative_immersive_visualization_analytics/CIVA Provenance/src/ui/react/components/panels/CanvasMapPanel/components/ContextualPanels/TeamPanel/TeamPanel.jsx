/**
 * @file TeamPanel.jsx
 * @description Team/Collaborate mode panel for Canvas Map V2
 *
 * Contains:
 * - MeSubTab: User's viewports, cursor settings, and status
 * - TeamSubTab: Team collaborators list with cursor controls
 */

import React, { memo } from 'react';
import { MeSubTab } from './MeSubTab';
import { TeamSubTab } from './TeamSubTab';
import { COLLABORATE_SUB_TABS } from '../../../utils/constants';

/**
 * TeamPanel - Team/Collaborate mode content
 */
export const TeamPanel = memo(function TeamPanel({
  collaborateSubTab,
  viewports = [],
  selectedViewportId,
  collaborators = [],
  searchQuery,
  setSearchQuery,

  // My status
  isBroadcasting,
  followingUser,

  // Cursor settings
  showCursors = true,
  myCursorVisible = true,
  myCursorColor = '#22d3ee',

  // Viewport handlers
  onViewportClick,
  onAddViewport,
  onDeleteViewport,
  onSetPrimaryViewport,

  // Broadcast handlers
  onStartBroadcast,
  onStopBroadcast,
  onStopFollowing,

  // Cursor handlers
  onToggleShowCursors,
  onToggleMyCursorVisible,
  onChangeMyCursorColor,
  onToggleCollaboratorCursor,

  // Team handlers
  onFollow,
  onLocate,
  onJoinVoice,
  onInvite,

  sizeMode = 'standard',
}) {
  if (collaborateSubTab === COLLABORATE_SUB_TABS.ME) {
    return (
      <MeSubTab
        viewports={viewports}
        selectedViewportId={selectedViewportId}
        isBroadcasting={isBroadcasting}
        followingUser={followingUser}
        myCursorVisible={myCursorVisible}
        myCursorColor={myCursorColor}
        onViewportClick={onViewportClick}
        onAddViewport={onAddViewport}
        onDeleteViewport={onDeleteViewport}
        onSetPrimaryViewport={onSetPrimaryViewport}
        onStartBroadcast={onStartBroadcast}
        onStopBroadcast={onStopBroadcast}
        onStopFollowing={onStopFollowing}
        onToggleCursorVisible={onToggleMyCursorVisible}
        onChangeCursorColor={onChangeMyCursorColor}
        sizeMode={sizeMode}
      />
    );
  }

  return (
    <TeamSubTab
      collaborators={collaborators}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      showCursors={showCursors}
      onToggleShowCursors={onToggleShowCursors}
      onFollow={onFollow}
      onLocate={onLocate}
      onToggleCollaboratorCursor={onToggleCollaboratorCursor}
      onJoinVoice={onJoinVoice}
      onInvite={onInvite}
      sizeMode={sizeMode}
    />
  );
});

export default TeamPanel;
