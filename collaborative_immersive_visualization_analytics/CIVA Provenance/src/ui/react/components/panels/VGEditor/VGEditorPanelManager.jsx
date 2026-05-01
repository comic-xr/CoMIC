/**
 * @file VGEditorPanelManager.jsx
 * @description Manages opening/closing VG editor panels via global events.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { useViewGroups } from '@UI/react/hooks/useViewGroups';
import { viewGroupManager } from '@Core/data/managers/ViewGroupManager';
import { VGEditorPanel } from './VGEditorPanel';

export const VG_EDITOR_OPEN_EVENT = 'cia:open-vg-editor';

export const VGEditorPanelManager = memo(function VGEditorPanelManager({ workspaceId }) {
  const [openEditors, setOpenEditors] = useState(new Map());
  const { createViewGroup, updateViewGroup, deleteViewGroup } = useViewGroups(workspaceId);

  const normalizeViewGroup = useCallback((viewGroup) => {
    if (!viewGroup) return null;
    if (Array.isArray(viewGroup.views)) return viewGroup;

    const slots = viewGroup.getViews?.() || viewGroup.slots || [];
    const views = slots
      .filter((slot) => slot && slot.viewId)
      .map((slot) => ({
        id: slot.viewId,
        name: slot.viewName,
        type: slot.viewType,
        datasetId: slot.datasetId || null,
      }));

    return {
      id: viewGroup.id,
      name: viewGroup.name,
      color: viewGroup.color,
      layoutId: viewGroup.layoutId,
      views,
    };
  }, []);

  useEffect(() => {
    const handleOpen = (event) => {
      const detail = event?.detail || {};
      const viewGroup = normalizeViewGroup(detail.viewGroup);
      if (!viewGroup?.id) return;

      setOpenEditors((prev) => {
        const next = new Map(prev);
        next.set(viewGroup.id, {
          viewGroup,
          isNewVG: !!detail.isNewVG,
        });
        return next;
      });
    };

    window.addEventListener(VG_EDITOR_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(VG_EDITOR_OPEN_EVENT, handleOpen);
  }, [normalizeViewGroup]);

  const handleClose = useCallback((vgId) => {
    setOpenEditors((prev) => {
      if (!prev.has(vgId)) return prev;
      const next = new Map(prev);
      next.delete(vgId);
      return next;
    });
  }, []);

  const syncViewsToSlots = useCallback(async (groupId, views = []) => {
    const group = viewGroupManager.getViewGroup(groupId);
    if (!group) return;

    const capacity = group.getLayoutCapacity?.() || group.slots?.length || views.length || 0;
    for (let i = 0; i < capacity; i += 1) {
      const desired = views[i];
      const slot = group.getSlotAt?.(i);
      if (desired?.id) {
        if (!slot || slot.viewId !== desired.id) {
          await viewGroupManager.setViewAtSlot(
            groupId,
            i,
            desired.id,
            desired.name,
            desired.type,
            desired.datasetId || null
          );
        }
      } else if (slot && !slot.isEmpty()) {
        await viewGroupManager.removeViewFromGroup(groupId, slot.viewId);
      }
    }
  }, []);

  const handleSave = useCallback(async (draft) => {
    if (!draft) return;

    const existing = viewGroupManager.getViewGroup(draft.id);
    if (!existing) {
      try {
        const created = await createViewGroup(draft.layoutId || 'single');
        if (!created) return;
        await updateViewGroup(created.id, {
          name: draft.name,
          color: draft.color,
          layoutId: draft.layoutId,
        });
        await syncViewsToSlots(created.id, draft.views || []);
        handleClose(draft.id);
        const normalized = normalizeViewGroup(viewGroupManager.getViewGroup(created.id));
        window.dispatchEvent(new CustomEvent(VG_EDITOR_OPEN_EVENT, {
          detail: { viewGroup: normalized || created, isNewVG: false },
        }));
      } catch (err) {
        console.error('Failed to create ViewGroup:', err);
      }
      return;
    }

    try {
      await updateViewGroup(existing.id, {
        name: draft.name,
        color: draft.color,
        layoutId: draft.layoutId,
      });
      await syncViewsToSlots(existing.id, draft.views || []);
    } catch (err) {
      console.error('Failed to update ViewGroup:', err);
    }
  }, [createViewGroup, updateViewGroup, syncViewsToSlots, handleClose]);

  const handleDelete = useCallback(async (vgId) => {
    if (!vgId) return;
    try {
      await deleteViewGroup(vgId);
      handleClose(vgId);
    } catch (err) {
      console.error('Failed to delete ViewGroup:', err);
    }
  }, [deleteViewGroup, handleClose]);

  return (
    <>
      {Array.from(openEditors.values()).map(({ viewGroup, isNewVG }) => (
        <VGEditorPanel
          key={viewGroup.id}
          viewGroup={viewGroup}
          isNewVG={isNewVG}
          panelId={`vg-editor-${viewGroup.id}`}
          onClose={() => handleClose(viewGroup.id)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      ))}
    </>
  );
});

export default VGEditorPanelManager;
