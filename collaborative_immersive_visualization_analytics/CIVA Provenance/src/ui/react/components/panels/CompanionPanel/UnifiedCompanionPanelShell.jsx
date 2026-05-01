/**
 * @file UnifiedCompanionPanelShell.jsx
 * @description PanelShell wrapper for the UnifiedCompanionPanel
 */

import React, { memo, useMemo, useState, useEffect } from 'react';
import { PanelShell, CHROME_LEVELS } from '@UI/react/components/panels/PanelShell';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
import { useDatasets } from '@UI/react/hooks/useDatasets';
import { useViewGroups } from '@UI/react/hooks/useViewGroups';
import { getVGDisplayName } from '@UI/react/components/panels/CanvasMapPanel/utils/gridUtils';
import {
  BUILTIN_TEMPLATES,
  loadCustomTemplates,
  TEMPLATES_UPDATED_EVENT,
} from '@Core/viewgroups/templates';
import { UnifiedCompanionPanel, useCompanionMode } from './UnifiedCompanionPanel';

export const COMPANION_PANEL_ID = 'companion';

export const UnifiedCompanionPanelShell = memo(function UnifiedCompanionPanelShell({
  workspaceId,
}) {
  const { tokens } = useAdaptive();
  const mode = useCompanionMode();
  const datasets = useDatasets();
  const { visibleViewGroups } = useViewGroups(workspaceId);
  const [customTemplates, setCustomTemplates] = useState(() => loadCustomTemplates());

  useEffect(() => {
    const handleTemplatesUpdate = () => {
      setCustomTemplates(loadCustomTemplates());
    };

    window.addEventListener(TEMPLATES_UPDATED_EVENT, handleTemplatesUpdate);
    window.addEventListener('storage', handleTemplatesUpdate);
    return () => {
      window.removeEventListener(TEMPLATES_UPDATED_EVENT, handleTemplatesUpdate);
      window.removeEventListener('storage', handleTemplatesUpdate);
    };
  }, []);

  const viewGroups = useMemo(() => {
    return (visibleViewGroups || []).map((vg) => ({
      id: vg.id,
      name: vg.name || getVGDisplayName(vg),
      color: vg.color || '#a855f7',
      layoutId: vg.layout?.type || 'single',
      views: vg.views || [],
      scope: vg.scope || 'project',
      createdBy: vg.createdBy,
      lastUsed: vg.lastUsed,
    }));
  }, [visibleViewGroups]);

  const views = useMemo(() => {
    return viewGroups.flatMap((vg) =>
      (vg.views || []).map((view) => ({
        ...view,
        vgId: vg.id,
        vgName: vg.name,
        vgColor: vg.color,
      }))
    );
  }, [viewGroups]);

  const datasetsWithViews = useMemo(() => {
    const byDatasetId = new Map();
    views.forEach((view) => {
      if (!view.datasetId) return;
      const bucket = byDatasetId.get(view.datasetId) || [];
      bucket.push(view);
      byDatasetId.set(view.datasetId, bucket);
    });

    return (datasets || []).map((dataset) => ({
      id: dataset.id,
      name: dataset.name,
      type: (dataset.fileType || 'default').toLowerCase(),
      size: dataset.size,
      views: byDatasetId.get(dataset.id) || [],
      viewCount: byDatasetId.get(dataset.id)?.length || 0,
    }));
  }, [datasets, views]);

  const templates = useMemo(() => {
    const combined = [...BUILTIN_TEMPLATES, ...customTemplates];
    const seen = new Set();
    return combined.filter((template) => {
      if (seen.has(template.id)) return false;
      seen.add(template.id);
      return true;
    });
  }, [customTemplates]);

  const panelTitle =
    mode === 'canvas-map' ? 'Add VGs' : mode === 'vg-editor' ? 'Add Views' : 'Browse';
  const panelColor =
    mode === 'canvas-map'
      ? tokens?.colors?.accent?.teal || '#14b8a6'
      : tokens?.colors?.accent?.cyan || '#22d3ee';

  return (
    <PanelShell
      panelId={COMPANION_PANEL_ID}
      title={panelTitle}
      icon="package"
      chrome={CHROME_LEVELS.COMPACT}
      color={panelColor}
      defaultWidth={280}
      defaultHeight={520}
      minWidth={240}
      minHeight={400}
    >
      {({ sizeMode }) => (
        <UnifiedCompanionPanel
          isOpen
          views={views}
          datasets={datasetsWithViews}
          viewGroups={viewGroups}
          templates={templates}
          sizeMode={sizeMode}
          side="right"
        />
      )}
    </PanelShell>
  );
});

export default UnifiedCompanionPanelShell;
