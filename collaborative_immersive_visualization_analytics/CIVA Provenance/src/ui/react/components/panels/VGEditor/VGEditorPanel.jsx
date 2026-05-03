/**
 * @file VGEditorPanel.jsx
 * @description PanelShell wrapper for VGEditorPanelContent
 */

import React, { memo, useCallback } from 'react';
import { PanelShell, CHROME_LEVELS, usePanelShell } from '@UI/react/components/panels/PanelShell';
import { useVGEditor } from '@UI/react/context/VGEditorContext';
import { VGEditorPanelContent } from './VGEditorPanelContent';

/**
 * VGEditorPanel - Floating panel shell for editing a ViewGroup
 *
 * @param {Object} props
 * @param {Object} props.viewGroup - ViewGroup data to edit
 * @param {boolean} [props.isNewVG=false] - Whether this is a new ViewGroup
 * @param {string} [props.panelId] - Optional panel ID override
 * @param {Function} [props.onClose] - Close handler
 * @param {Function} [props.onSave] - Save handler
 * @param {Function} [props.onDelete] - Delete handler
 */
export const VGEditorPanel = memo(function VGEditorPanel({
  viewGroup,
  isNewVG = false,
  panelId,
  onClose,
  onSave,
  onDelete,
}) {
  const { closePanel } = usePanelShell();
  const editorContext = useVGEditor();
  const editorPanelId = panelId || `vg-editor-${viewGroup.id}`;

  const handleContentClose = useCallback(() => {
    onClose?.();
    closePanel(editorPanelId);
  }, [closePanel, editorPanelId, onClose]);

  const handlePanelFocus = useCallback(() => {
    editorContext?.setActive(editorPanelId);
  }, [editorContext, editorPanelId]);

  return (
    <PanelShell
      panelId={editorPanelId}
      title={isNewVG ? 'New ViewGroup' : `Edit: ${viewGroup.name || 'ViewGroup'}`}
      icon="layoutGrid"
      chrome={CHROME_LEVELS.FULL}
      color={viewGroup.color}
      defaultWidth={480}
      defaultHeight={600}
      minWidth={380}
      minHeight={450}
      onClose={onClose}
      onFocus={handlePanelFocus}
    >
      <VGEditorPanelContent
        initialVG={viewGroup}
        isNewVG={isNewVG}
        panelId={editorPanelId}
        onClose={handleContentClose}
        onSave={onSave}
        onDelete={onDelete}
      />
    </PanelShell>
  );
});

export default VGEditorPanel;
