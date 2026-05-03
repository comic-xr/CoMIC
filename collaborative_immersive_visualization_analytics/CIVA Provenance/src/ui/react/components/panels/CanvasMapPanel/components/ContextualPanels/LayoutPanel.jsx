/**
 * @file LayoutPanel.jsx
 * @description Layout mode panel content for Canvas Map V2
 *
 * Shows:
 * - On Canvas: Active VG list with layout previews
 * - Inactive: Closed VGs that can be restored
 * - Focused VG edit controls (when drilling into a VG)
 */

import React, { memo, useState, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Button } from '@UI/react/components/atoms/Button';
import { Badge } from '@UI/react/components/atoms/Badge';
import { ChipGroup } from '@UI/react/components/molecules/ChipGroup';
import { VGListItem, PanelSection } from '../shared';
import { getVGDisplayName } from '../../utils/gridUtils';

/**
 * LayoutPanel - Layout mode content
 */
export const LayoutPanel = memo(function LayoutPanel({
  viewGroups = [],
  filteredVGs = [],
  inactiveVGs = [],
  selectedVGId,
  focusedVG,
  onVGClick,
  onVGDoubleClick,
  onVGRestore,
  onAddVG,
  onChangeLayout,
  onAddView,
  onDuplicate,
  onLink,
  onSaveTemplate,
  canvasRows,
  canvasCols,
  onAdjustRows,
  onAdjustCols,
  onToggleSnap,
  onNameGroup,
  sizeMode = 'standard',
}) {
  const isCompact = sizeMode === 'compact';

  // Filter state for ChipGroup
  const [activeFilter, setActiveFilter] = useState('all');

  const handleFilterToggle = useCallback((filterId) => {
    setActiveFilter(filterId);
  }, []);

  const explicitCount = viewGroups.filter(v => v.isExplicit).length;
  const implicitCount = viewGroups.filter(v => !v.isExplicit).length;

  // Apply filter
  const displayVGs = activeFilter === 'all'
    ? filteredVGs
    : activeFilter === 'explicit'
      ? filteredVGs.filter(v => v.isExplicit)
      : filteredVGs.filter(v => !v.isExplicit);

  // If focused on a VG, show edit controls
  if (focusedVG) {
    return (
      <div className="contextual-panel layout-panel">
        <PanelSection title="Edit ViewGroup" icon="pencil" sizeMode={sizeMode}>
          <div className="contextual-panel__actions">
            <Button variant="ghost" size="sm" icon="grid3x3" onClick={onChangeLayout}>
              {!isCompact && 'Change Layout'}
            </Button>
            <Button variant="ghost" size="sm" icon="plus" onClick={onAddView}>
              {!isCompact && 'Add View'}
            </Button>
            <Button variant="ghost" size="sm" icon="copy" onClick={onDuplicate}>
              {!isCompact && 'Duplicate'}
            </Button>
            <Button variant="ghost" size="sm" icon="link2" onClick={onLink}>
              {!isCompact && 'Link'}
            </Button>
            <Button variant="ghost" size="sm" icon="save" onClick={onSaveTemplate}>
              {!isCompact && 'Save Template'}
            </Button>
          </div>

          {/* Implicit group warning */}
          {!focusedVG.isExplicit && (
            <div className="contextual-panel__warning">
              <div className="contextual-panel__warning-header">
                <Icon name="alertCircle" size={12} />
                <span>Implicit Group</span>
              </div>
              <p>Give this group a name to save or share it.</p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNameGroup?.(focusedVG.id)}
              >
                Name this group
              </Button>
            </div>
          )}
        </PanelSection>
      </div>
    );
  }

  return (
    <div className="contextual-panel layout-panel">
      {/* On Canvas */}
      <PanelSection
        title="On Canvas"
        icon="package"
        actions={
          <>
            <Badge count={viewGroups.length} size="sm" />
            <button className="contextual-panel__icon-btn" onClick={onAddVG} title="Add VG">
              <Icon name="plus" size={14} />
            </button>
          </>
        }
        sizeMode={sizeMode}
      >
        <ChipGroup
          chips={[
            { id: 'all', label: 'All' },
            { id: 'explicit', label: 'Explicit', count: explicitCount },
            { id: 'implicit', label: 'Implicit', count: implicitCount },
          ]}
          activeChips={[activeFilter]}
          onToggle={handleFilterToggle}
          size="sm"
          allowEmpty={false}
        />
        <p className="contextual-panel__hint">Drag VGs to reposition on canvas</p>
        <div className="contextual-panel__list">
          {displayVGs.map(vg => (
            <VGListItem
              key={vg.id}
              vg={vg}
              displayName={getVGDisplayName(vg)}
              isSelected={selectedVGId === vg.id}
              onClick={() => onVGClick(vg.id)}
              onDoubleClick={() => onVGDoubleClick(vg.id)}
            />
          ))}
        </div>
      </PanelSection>

      {/* Inactive VGs */}
      {inactiveVGs.length > 0 && (
        <PanelSection
          title="Inactive"
          icon="eyeOff"
          actions={<Badge count={inactiveVGs.length} size="sm" />}
          sizeMode={sizeMode}
        >
          <p className="contextual-panel__hint">Drag to canvas to restore, or click Restore</p>
          <div className="contextual-panel__list">
            {inactiveVGs.map(vg => (
              <VGListItem
                key={vg.id}
                vg={vg}
                displayName={getVGDisplayName(vg)}
                isSelected={false}
                isInactive
                onClick={() => {}}
                onDoubleClick={() => {}}
                onRestore={onVGRestore}
              />
            ))}
          </div>
        </PanelSection>
      )}

      {/* Quick Layout Templates */}
      <PanelSection title="Quick Layout Templates" icon="layoutGrid" sizeMode={sizeMode}>
        <div className="layout-panel__templates">
          {[
            { id: '1x1', label: '1x1', layoutId: 'single' },
            { id: '1x2', label: '1x2', layoutId: 'side-by-side' },
            { id: '2x1', label: '2x1', layoutId: 'stacked' },
            { id: '2x2', label: '2x2', layoutId: '2x2' },
            { id: 'main-side', label: 'Main+Side', layoutId: '1+2' },
          ].map((template) => (
            <button
              key={template.id}
              type="button"
              className="layout-panel__template-btn"
              onClick={() => onAddVG?.(template.layoutId)}
            >
              <Icon name="layoutGrid" size={12} />
              <span>{template.label}</span>
            </button>
          ))}
        </div>
      </PanelSection>

      {/* Canvas Controls */}
      <PanelSection title="Canvas Size" icon="grid3x3" sizeMode={sizeMode}>
        <div className="layout-panel__steppers">
          <div className="layout-panel__stepper">
            <span className="layout-panel__stepper-label">Cols</span>
            <div className="layout-panel__stepper-controls">
              <button
                type="button"
                className="layout-panel__stepper-btn"
                onClick={() => onAdjustCols?.(-1)}
                disabled={!onAdjustCols || (canvasCols ?? 0) <= 1}
              >
                <Icon name="minus" size={10} />
              </button>
              <span className="layout-panel__stepper-value">{canvasCols ?? '—'}</span>
              <button
                type="button"
                className="layout-panel__stepper-btn"
                onClick={() => onAdjustCols?.(1)}
                disabled={!onAdjustCols}
              >
                <Icon name="plus" size={10} />
              </button>
            </div>
          </div>

          <div className="layout-panel__stepper">
            <span className="layout-panel__stepper-label">Rows</span>
            <div className="layout-panel__stepper-controls">
              <button
                type="button"
                className="layout-panel__stepper-btn"
                onClick={() => onAdjustRows?.(-1)}
                disabled={!onAdjustRows || (canvasRows ?? 0) <= 1}
              >
                <Icon name="minus" size={10} />
              </button>
              <span className="layout-panel__stepper-value">{canvasRows ?? '—'}</span>
              <button
                type="button"
                className="layout-panel__stepper-btn"
                onClick={() => onAdjustRows?.(1)}
                disabled={!onAdjustRows}
              >
                <Icon name="plus" size={10} />
              </button>
            </div>
          </div>
        </div>

        <div className="layout-panel__control-row">
          <Button variant="ghost" size="sm" icon="alignCenter" onClick={() => {}}>
            {!isCompact && 'Align'}
          </Button>
          <Button variant="ghost" size="sm" icon="grid3x3" onClick={onToggleSnap}>
            {!isCompact && 'Snap'}
          </Button>
        </div>
      </PanelSection>
    </div>
  );
});

export default LayoutPanel;
