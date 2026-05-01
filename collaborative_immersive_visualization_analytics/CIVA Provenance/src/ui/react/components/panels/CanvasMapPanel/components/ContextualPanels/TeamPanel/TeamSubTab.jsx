/**
 * @file TeamSubTab.jsx
 * @description "Team" sub-tab for TeamPanel - shows collaborators with cursor controls
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Badge } from '@UI/react/components/atoms/Badge';
import { Toggle } from '@UI/react/components/atoms/Toggle';
import { Button } from '@UI/react/components/atoms/Button';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { ChipGroup } from '@UI/react/components/molecules/ChipGroup';
import { CollaboratorItem, PanelSection } from '../../shared';

/**
 * TeamSubTab - Team collaborators list with cursor visibility controls
 */
export const TeamSubTab = memo(function TeamSubTab({
  collaborators = [],
  searchQuery,
  setSearchQuery,
  showCursors = true,
  onToggleShowCursors,
  onFollow,
  onLocate,
  onToggleCollaboratorCursor,
  onJoinVoice,
  onInvite,
  sizeMode = 'standard',
}) {
  // Filter state
  const [activeFilter, setActiveFilter] = useState('online');

  const handleFilterToggle = useCallback((filterId) => {
    setActiveFilter(filterId);
  }, []);

  // Derived collaborator lists
  const onlineCollaborators = useMemo(() =>
    collaborators.filter(c => c.isOnline),
    [collaborators]
  );

  const offlineCollaborators = useMemo(() =>
    collaborators.filter(c => !c.isOnline),
    [collaborators]
  );

  const broadcastingCollaborators = useMemo(() =>
    onlineCollaborators.filter(c => c.isBroadcasting),
    [onlineCollaborators]
  );

  const onlineNotBroadcasting = useMemo(() =>
    onlineCollaborators.filter(c => !c.isBroadcasting),
    [onlineCollaborators]
  );

  // Filter by search query
  const filteredCollaborators = useMemo(() => {
    let list = collaborators;

    // Apply status filter
    if (activeFilter === 'online') {
      list = onlineCollaborators;
    } else if (activeFilter === 'live') {
      list = broadcastingCollaborators;
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(query));
    }

    return list;
  }, [collaborators, onlineCollaborators, broadcastingCollaborators, activeFilter, searchQuery]);

  return (
    <div className="team-subtab">
      {/* Master Cursor Toggle */}
      <div className="team-subtab__master-toggle">
        <span className="team-subtab__master-label">
          <Icon name="mousePointer" size={14} />
          Show Cursors
        </span>
        <Toggle
          checked={showCursors}
          onChange={onToggleShowCursors}
          size="sm"
        />
      </div>

      <div className="team-subtab__controls">
        <Button variant="ghost" size="sm" icon="mic" onClick={onJoinVoice}>
          Join Voice
        </Button>
        <Button variant="ghost" size="sm" icon="users" onClick={onInvite}>
          Invite
        </Button>
      </div>

      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search team members..."
        size="sm"
      />

      <ChipGroup
        chips={[
          { id: 'online', label: 'Online', count: onlineCollaborators.length },
          { id: 'all', label: 'All', count: collaborators.length },
          { id: 'live', label: 'Live', count: broadcastingCollaborators.length },
        ]}
        activeChips={[activeFilter]}
        onToggle={handleFilterToggle}
        size="sm"
        allowEmpty={false}
      />

      {/* Broadcasting */}
      {activeFilter !== 'online' && broadcastingCollaborators.length > 0 && (
        <PanelSection
          title="Broadcasting"
          icon="radio"
          actions={<Badge count={broadcastingCollaborators.length} size="sm" color="danger" />}
          sizeMode={sizeMode}
        >
          <div className="contextual-panel__list">
            {broadcastingCollaborators
              .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(collab => (
                <CollaboratorItem
                  key={collab.id}
                  collaborator={collab}
                  onFollow={onFollow}
                  onLocate={onLocate}
                  showCursorToggle={true}
                  cursorVisible={collab.showCursor ?? true}
                  onToggleCursor={onToggleCollaboratorCursor}
                />
              ))}
          </div>
        </PanelSection>
      )}

      {/* Online (not broadcasting) */}
      {(activeFilter === 'online' || activeFilter === 'all') && onlineNotBroadcasting.length > 0 && (
        <PanelSection
          title="Online"
          icon="users"
          actions={<Badge count={onlineNotBroadcasting.length} size="sm" color="success" />}
          sizeMode={sizeMode}
        >
          <div className="contextual-panel__list">
            {(activeFilter === 'online' ? filteredCollaborators.filter(c => !c.isBroadcasting) : onlineNotBroadcasting)
              .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(collab => (
                <CollaboratorItem
                  key={collab.id}
                  collaborator={collab}
                  onFollow={onFollow}
                  onLocate={onLocate}
                  showCursorToggle={true}
                  cursorVisible={collab.showCursor ?? true}
                  onToggleCursor={onToggleCollaboratorCursor}
                />
              ))}
          </div>
        </PanelSection>
      )}

      {/* Live section for filtered view */}
      {activeFilter === 'online' && broadcastingCollaborators.length > 0 && (
        <PanelSection
          title="Broadcasting"
          icon="radio"
          actions={<Badge count={broadcastingCollaborators.length} size="sm" color="danger" />}
          sizeMode={sizeMode}
        >
          <div className="contextual-panel__list">
            {broadcastingCollaborators
              .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(collab => (
                <CollaboratorItem
                  key={collab.id}
                  collaborator={collab}
                  onFollow={onFollow}
                  onLocate={onLocate}
                  showCursorToggle={true}
                  cursorVisible={collab.showCursor ?? true}
                  onToggleCursor={onToggleCollaboratorCursor}
                />
              ))}
          </div>
        </PanelSection>
      )}

      {/* Offline */}
      {activeFilter === 'all' && offlineCollaborators.length > 0 && (
        <PanelSection
          title="Offline"
          icon="userMinus"
          actions={<Badge count={offlineCollaborators.length} size="sm" />}
          sizeMode={sizeMode}
        >
          <div className="contextual-panel__list">
            {offlineCollaborators
              .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(collab => (
                <CollaboratorItem
                  key={collab.id}
                  collaborator={collab}
                  showLocation={false}
                  showCursorToggle={false}
                />
              ))}
          </div>
        </PanelSection>
      )}
    </div>
  );
});

export default TeamSubTab;
