import React, { useRef, useEffect, useState } from 'react';
import { RendererManager, SceneManager } from '@/core/renderer';
import {
  getVtiUrlForLod,
  getVolumeStatsFromVtkImageData,
  loadDescriptor,
  loadVolumeWithProgress,
  loadVtiFromFile,
  type VTKImageData,
} from '@/data';
import {
  descriptorFromVtkImageData,
  type DatasetDescriptor,
} from '@/data/dataset-descriptor';
import { appConfig, isReductionApiEnabled } from '@/config';
import { store } from '@/state';
import type { LodLevel, ReductionPhase, VolumeStats } from '@/state';
import { MetricsCollector, type PerformanceSnapshot, sessionEventExportObject } from '@/metrics';
import { supportsImmersiveVR, XRSessionManager, XRInputManager } from '@/core/webxr';

type VolumeStatus = 'idle' | 'loading' | 'loaded' | 'error';

/** Backend health from GET /api/health: whether TTK and VTK are available. */
interface BackendHealth {
  ok: boolean;
  vtk: boolean;
  ttk: boolean;
}

function getDefaultVtiUrl(): string {
  const base = appConfig.dataset.basePath.replace(/\/$/, '');
  const id = appConfig.dataset.defaultDatasetId;
  return `${base}/${id}.vti`;
}

interface SceneManagerWithBounds {
  getLastWorldBounds(): readonly [number, number, number, number, number, number] | null;
  getVolumeCenter(): [number, number, number] | null;
}

function roiCenterToWorld(
  scene: SceneManagerWithBounds,
  norm: readonly [number, number, number] | null
): [number, number, number] | null {
  if (norm == null) return scene.getVolumeCenter();
  const b = scene.getLastWorldBounds();
  if (b == null) return scene.getVolumeCenter();
  const lerp = (lo: number, hi: number, t: number): number =>
    lo + (hi - lo) * Math.max(0, Math.min(1, t));
  return [lerp(b[0], b[1], norm[0]), lerp(b[2], b[3], norm[1]), lerp(b[4], b[5], norm[2])];
}

function roiCenterEquals(
  a: readonly [number, number, number] | null,
  b: readonly [number, number, number] | null
): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

export const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererManagerRef = useRef<RendererManager | null>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const lastLodLevelRef = useRef<LodLevel | null>(null);
  const lastDisplayIntensityRef = useRef<number | null>(null);
  const lastFeatureSliceRef = useRef<boolean | null>(null);
  const lastFeatureDimRef = useRef<boolean | null>(null);
  const lastFeatureIsoEnabledRef = useRef<boolean | null>(null);
  const lastFeatureIsoValueRef = useRef<number | null>(null);
  const lastFeatureThresholdEnabledRef = useRef<boolean | null>(null);
  const lastFeatureThresholdMinRef = useRef<number | null>(null);
  const lastFeatureThresholdMaxRef = useRef<number | null>(null);
  const lastRoiWireframeRef = useRef<boolean | null>(null);
  const lastRoiRefinementRef = useRef<boolean | null>(null);
  const lastRoiRadiusRef = useRef<number | null>(null);
  const lastRoiCenterRef = useRef<readonly [number, number, number] | null>(null);
  const currentVolumeDataRef = useRef<VTKImageData | null>(null);
  const roiRefineSeqRef = useRef(0);
  const loadSeqRef = useRef(0);
  const [volumeStatus, setVolumeStatus] = useState<VolumeStatus>('idle');
  const [volumeLoadProgress, setVolumeLoadProgress] = useState<{
    progress: number;
    message?: string;
  } | null>(null);
  const [displayIntensityMin, setDisplayIntensityMin] = useState(
    () => store.getState().reduction.displayIntensityMin
  );
  const [lodLevel, setLodLevel] = useState<LodLevel>(() => store.getState().reduction.lodLevel);
  const [volumeStats, setVolumeStats] = useState<VolumeStats | null>(
    () => store.getState().volumeStats
  );
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);
  /** False until the first health request finishes (success or failure). */
  const [backendHealthReady, setBackendHealthReady] = useState(false);
  const [xrSupported, setXrSupported] = useState<boolean>(false);
  const [xrActive, setXrActive] = useState<boolean>(false);
  const xrSessionManagerRef = useRef<XRSessionManager | null>(null);
  const xrInputManagerRef = useRef<XRInputManager | null>(null);
  const metricsCollectorRef = useRef<MetricsCollector | null>(null);

  const [reductionPhase, setReductionPhase] = useState<ReductionPhase>(
    () => store.getState().reduction.reductionPhase
  );
  const [autoLodByDistance, setAutoLodByDistance] = useState(
    () => store.getState().reduction.autoLodByDistance
  );
  const [featureSliceEnabled, setFeatureSliceEnabled] = useState(
    () => store.getState().reduction.featureSliceEnabled
  );
  const [featureDimVolume, setFeatureDimVolume] = useState(
    () => store.getState().reduction.featureDimVolume
  );
  const [featureIsosurfaceEnabled, setFeatureIsosurfaceEnabled] = useState(
    () => store.getState().reduction.featureIsosurfaceEnabled
  );
  const [featureIsosurfaceValue, setFeatureIsosurfaceValue] = useState(
    () => store.getState().reduction.featureIsosurfaceValue
  );
  const [featureThresholdEnabled, setFeatureThresholdEnabled] = useState(
    () => store.getState().reduction.featureThresholdEnabled
  );
  const [featureThresholdMin, setFeatureThresholdMin] = useState(
    () => store.getState().reduction.featureThresholdMin
  );
  const [featureThresholdMax, setFeatureThresholdMax] = useState(
    () => store.getState().reduction.featureThresholdMax
  );
  const [roiWireframeEnabled, setRoiWireframeEnabled] = useState(
    () => store.getState().reduction.roiWireframeEnabled
  );
  const [roiRefinementEnabled, setRoiRefinementEnabled] = useState(
    () => store.getState().reduction.roiRefinementEnabled
  );
  const [roiRadiusWorld, setRoiRadiusWorldState] = useState(
    () => store.getState().reduction.roiRadiusWorld
  );
  const [roiCenterNorm, setRoiCenterNormState] = useState<readonly [number, number, number] | null>(
    () => store.getState().reduction.roiCenterNorm
  );
  const [perfSnapshot, setPerfSnapshot] = useState<PerformanceSnapshot | null>(null);
  const [datasetDescriptor, setDatasetDescriptor] = useState<DatasetDescriptor | null>(null);
  const [activeScalarField, setActiveScalarFieldName] = useState(
    () => store.getState().scalar.activeScalarField
  );
  const [scalarPrevious, setScalarPrevious] = useState<string | null>(
    () => store.getState().scalar.previousScalarField
  );
  const [datasetLabel, setDatasetLabel] = useState<string>(
    () => appConfig.dataset.defaultDatasetId
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [availableDatasets, setAvailableDatasets] = useState<string[]>([]);
  const datasetIdRef = useRef<string>(appConfig.dataset.defaultDatasetId);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/datasets/index.json')
      .then((r) => (r.ok ? r.json() : { datasets: [] }))
      .then((j: { datasets?: string[] }) => {
        if (cancelled) return;
        setAvailableDatasets(j.datasets ?? []);
      })
      .catch(() => {
        if (!cancelled) setAvailableDatasets([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // When using reduction API, fetch backend health to show whether TTK is in use
  useEffect(() => {
    if (!isReductionApiEnabled()) {
      setBackendHealth(null);
      store.setReductionBackendEnabled(false);
      setBackendHealthReady(true);
      return;
    }
    const base = appConfig.dataset.reductionApiUrl.replace(/\/$/, '');
    const path = `${base}/api/health`;
    const ac = new AbortController();
    const tid = window.setTimeout(() => ac.abort(), 8000);
    fetch(path, { signal: ac.signal })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((data: BackendHealth) => {
        setBackendHealth(data);
        store.setReductionBackendEnabled(data.ok === true);
      })
      .catch(() => {
        setBackendHealth(null);
        store.setReductionBackendEnabled(false);
      })
      .finally(() => {
        window.clearTimeout(tid);
        setBackendHealthReady(true);
      });
    return () => {
      window.clearTimeout(tid);
      ac.abort();
    };
  }, []);

  // Keep React state in sync with store (slider, LOD buttons, volume stats)
  useEffect(() => {
    return store.subscribe(() => {
      const s = store.getState();
      setDisplayIntensityMin(s.reduction.displayIntensityMin);
      setLodLevel(s.reduction.lodLevel);
      setVolumeStats(s.volumeStats);
      setReductionPhase(s.reduction.reductionPhase);
      setAutoLodByDistance(s.reduction.autoLodByDistance);
      setFeatureSliceEnabled(s.reduction.featureSliceEnabled);
      setFeatureDimVolume(s.reduction.featureDimVolume);
      setFeatureIsosurfaceEnabled(s.reduction.featureIsosurfaceEnabled);
      setFeatureIsosurfaceValue(s.reduction.featureIsosurfaceValue);
      setFeatureThresholdEnabled(s.reduction.featureThresholdEnabled);
      setFeatureThresholdMin(s.reduction.featureThresholdMin);
      setFeatureThresholdMax(s.reduction.featureThresholdMax);
      setRoiWireframeEnabled(s.reduction.roiWireframeEnabled);
      setRoiRefinementEnabled(s.reduction.roiRefinementEnabled);
      setRoiRadiusWorldState(s.reduction.roiRadiusWorld);
      setRoiCenterNormState(s.reduction.roiCenterNorm);
      setActiveScalarFieldName(s.scalar.activeScalarField);
      setScalarPrevious(s.scalar.previousScalarField);
    });
  }, []);

  useEffect(() => {
    const id = appConfig.dataset.defaultDatasetId;
    void loadDescriptor(id).then((d) => {
      if (d != null) setDatasetDescriptor(d);
    });
  }, []);

  useEffect(() => {
    if (volumeStatus !== 'loaded') return;
    if (datasetDescriptor != null) return;
    const data = currentVolumeDataRef.current;
    if (data == null) return;
    setDatasetDescriptor(descriptorFromVtkImageData(datasetLabel, data));
  }, [volumeStatus, datasetDescriptor, datasetLabel]);

  useEffect(() => {
    const t = window.setInterval(() => {
      const snap = metricsCollectorRef.current?.getPerformanceSnapshot() ?? null;
      setPerfSnapshot(snap);
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (volumeStatus !== 'loaded') return;
    let raf = 0;
    let lastTick = 0;
    let lastSuggest: LodLevel | null = null;
    const step = (t: number): void => {
      raf = requestAnimationFrame(step);
      if (!store.getState().reduction.autoLodByDistance) return;
      if (t - lastTick < 400) return;
      lastTick = t;
      const rm = rendererManagerRef.current;
      const sm = sceneManagerRef.current;
      if (rm == null || sm == null) return;
      const center = sm.getVolumeCenter();
      if (center == null) return;
      const cam = rm.getRenderer().getActiveCamera().getPosition();
      const dx = cam[0] - center[0];
      const dy = cam[1] - center[1];
      const dz = cam[2] - center[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const { mediumThresholdM, lowThresholdM, maxDistanceM } = appConfig.lod;
      let suggest: LodLevel = 'full';
      if (dist > maxDistanceM) suggest = 'low';
      else if (dist > lowThresholdM) suggest = 'medium';
      else if (dist > mediumThresholdM) suggest = 'high';
      if (suggest !== lastSuggest) {
        lastSuggest = suggest;
        store.setLodLevel(suggest);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [volumeStatus]);

  // WebXR feature detection — graceful fallback to desktop when unsupported
  useEffect(() => {
    if (!appConfig.xr.enabled) {
      setXrSupported(false);
      return;
    }
    let cancelled = false;
    supportsImmersiveVR()
      .then((supported) => {
        if (!cancelled) setXrSupported(supported);
      })
      .catch(() => {
        if (!cancelled) setXrSupported(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container == null) return;

    const metricsCollector = new MetricsCollector();
    metricsCollectorRef.current = metricsCollector;

    const rendererManager = new RendererManager({
      container,
      background: [0.1, 0.1, 0.15],
      listenWindowResize: true,
    });
    const sceneManager = new SceneManager();

    rendererManagerRef.current = rendererManager;
    sceneManagerRef.current = sceneManager;

    let unsubscribeStore: (() => void) | undefined;

    const xrSessionManager = new XRSessionManager({
      controllerRays: true,
    });
    const xrInputManager = new XRInputManager();
    xrSessionManagerRef.current = xrSessionManager;
    xrInputManagerRef.current = xrInputManager;

    rendererManager.init(() => {
      void (async () => {
        if (isReductionApiEnabled()) {
          const apiBase = appConfig.dataset.reductionApiUrl.replace(/\/$/, '');
          let backendOk = false;
          try {
            const ac = new AbortController();
            const tid = window.setTimeout(() => ac.abort(), 5000);
            const res = await fetch(`${apiBase}/api/health`, { signal: ac.signal });
            window.clearTimeout(tid);
            backendOk = res.ok;
          } catch {
            backendOk = false;
          }
          store.setReductionBackendEnabled(backendOk);
        } else {
          store.setReductionBackendEnabled(false);
        }

        sceneManager.setRenderer(rendererManager.getRenderer());
        rendererManager.startRenderLoop();
        rendererManager.setFrameDeltaHook((dt) => {
          metricsCollector.recordFrameDelta(dt, appConfig.rendering.targetFPS);
        });

        const glWindow = rendererManager.getOpenGLRenderWindow();
        if (glWindow != null) {
          xrSessionManager.setRenderWindow(glWindow);
        }

        const getDatasetId = (): string => datasetIdRef.current;

        const applyVolume = (vtkData: VTKImageData, resetCamera = true, loadTimeMs?: number) => {
          currentVolumeDataRef.current = vtkData;
          const displaySlider = store.getState().reduction.displayIntensityMin;
          sceneManager.setVolumeData(vtkData, 'grayscale', displaySlider);
          if (resetCamera) sceneManager.resetCamera();
          const r = store.getState().reduction;
          sceneManager.setSlicePlaneEnabled(r.featureSliceEnabled);
          sceneManager.setContextualVolumeDim(r.featureDimVolume);
          sceneManager.setIsosurfaceEnabled(r.featureIsosurfaceEnabled, r.featureIsosurfaceValue);
          sceneManager.setThresholdRegion(
            r.featureThresholdEnabled,
            r.featureThresholdMin,
            r.featureThresholdMax
          );
          sceneManager.setRoiWireframe(
            r.roiWireframeEnabled,
            r.roiRadiusWorld,
            roiCenterToWorld(sceneManager, r.roiCenterNorm)
          );
          rendererManager.render();
          const stats = getVolumeStatsFromVtkImageData(vtkData);
          store.setVolumeStats({
            ...stats,
            loadTimeMs: loadTimeMs ?? 0,
          });
          metricsCollector.recordReductionLatency('volume_load', loadTimeMs ?? 0);
        };

        lastDisplayIntensityRef.current = store.getState().reduction.displayIntensityMin;
        lastFeatureSliceRef.current = store.getState().reduction.featureSliceEnabled;
        lastFeatureDimRef.current = store.getState().reduction.featureDimVolume;
        lastFeatureIsoEnabledRef.current = store.getState().reduction.featureIsosurfaceEnabled;
        lastFeatureIsoValueRef.current = store.getState().reduction.featureIsosurfaceValue;
        lastFeatureThresholdEnabledRef.current = store.getState().reduction.featureThresholdEnabled;
        lastFeatureThresholdMinRef.current = store.getState().reduction.featureThresholdMin;
        lastFeatureThresholdMaxRef.current = store.getState().reduction.featureThresholdMax;
        lastRoiWireframeRef.current = store.getState().reduction.roiWireframeEnabled;
        lastRoiRefinementRef.current = store.getState().reduction.roiRefinementEnabled;
        lastRoiRadiusRef.current = store.getState().reduction.roiRadiusWorld;
        lastRoiCenterRef.current = store.getState().reduction.roiCenterNorm;

        // Client display intensity + feature operators; LOD changes reload volume (API / static).
        const syncSceneFeatures = (): void => {
          const r = store.getState().reduction;
          sceneManager.setSlicePlaneEnabled(r.featureSliceEnabled);
          sceneManager.setContextualVolumeDim(r.featureDimVolume);
          sceneManager.setIsosurfaceEnabled(r.featureIsosurfaceEnabled, r.featureIsosurfaceValue);
          sceneManager.setThresholdRegion(
            r.featureThresholdEnabled,
            r.featureThresholdMin,
            r.featureThresholdMax
          );
          sceneManager.setRoiWireframe(
            r.roiWireframeEnabled,
            r.roiRadiusWorld,
            roiCenterToWorld(sceneManager, r.roiCenterNorm)
          );
          const applyRefinement = (source: VTKImageData): void => {
            if (!r.roiWireframeEnabled || !r.roiRefinementEnabled) {
              sceneManager.setRoiRefinementVolumeData(null, r.roiRadiusWorld);
              return;
            }
            sceneManager.setRoiRefinementVolumeData(
              source,
              r.roiRadiusWorld,
              roiCenterToWorld(sceneManager, r.roiCenterNorm)
            );
          };
          if (!r.roiWireframeEnabled || !r.roiRefinementEnabled) {
            sceneManager.setRoiRefinementVolumeData(null, r.roiRadiusWorld);
          } else if (r.lodLevel === 'full' && currentVolumeDataRef.current != null) {
            applyRefinement(currentVolumeDataRef.current);
          } else {
            const seq = ++roiRefineSeqRef.current;
            const persistenceSlider = r.topologyThreshold;
            const sliderMin = appConfig.topology.thresholdMin;
            const sliderMax = appConfig.topology.thresholdMax;
            const denom = sliderMax - sliderMin || 1;
            const persistenceThresholdNormalized = Math.max(
              0,
              Math.min(1, (persistenceSlider - sliderMin) / denom)
            );
            void loadVolumeWithProgress(
              getDatasetId(),
              'high',
              undefined,
              undefined,
              persistenceThresholdNormalized
            )
              .then((roiData) => {
                if (seq !== roiRefineSeqRef.current) return;
                const rs = store.getState().reduction;
                if (!rs.roiWireframeEnabled || !rs.roiRefinementEnabled) return;
                sceneManager.setRoiRefinementVolumeData(
                  roiData,
                  rs.roiRadiusWorld,
                  roiCenterToWorld(sceneManager, rs.roiCenterNorm)
                );
              })
              .catch(() => {
                if (seq !== roiRefineSeqRef.current) return;
                if (currentVolumeDataRef.current != null) {
                  sceneManager.setRoiRefinementVolumeData(
                    currentVolumeDataRef.current,
                    r.roiRadiusWorld,
                    roiCenterToWorld(sceneManager, r.roiCenterNorm)
                  );
                }
              });
          }
          rendererManager.render();
        };

        unsubscribeStore = store.subscribe(() => {
          const { reduction } = store.getState();
          const {
            displayIntensityMin: displaySlider,
            lodLevel: currentLodLevel,
            featureSliceEnabled: currentSlice,
            featureDimVolume: currentDim,
            featureIsosurfaceEnabled: currentIsoEnabled,
            featureIsosurfaceValue: currentIsoValue,
            featureThresholdEnabled: currentThrEnabled,
            featureThresholdMin: currentThrMin,
            featureThresholdMax: currentThrMax,
            roiWireframeEnabled: currentRoiWireframe,
            roiRefinementEnabled: currentRoiRefinement,
            roiRadiusWorld: currentRoiRadius,
            roiCenterNorm: currentRoiCenter,
          } = reduction;

          const prevLodLevel = lastLodLevelRef.current;
          const prevDisplay = lastDisplayIntensityRef.current;
          const prevSlice = lastFeatureSliceRef.current;
          const prevDim = lastFeatureDimRef.current;
          const prevIsoEnabled = lastFeatureIsoEnabledRef.current;
          const prevIsoValue = lastFeatureIsoValueRef.current;
          const prevThrEnabled = lastFeatureThresholdEnabledRef.current;
          const prevThrMin = lastFeatureThresholdMinRef.current;
          const prevThrMax = lastFeatureThresholdMaxRef.current;
          const prevRoiWireframe = lastRoiWireframeRef.current;
          const prevRoiRefinement = lastRoiRefinementRef.current;
          const prevRoiRadius = lastRoiRadiusRef.current;
          const prevRoiCenter = lastRoiCenterRef.current;

          const lodChanged = prevLodLevel !== currentLodLevel;
          const displayChanged = prevDisplay !== displaySlider;
          const sliceChanged = prevSlice !== currentSlice;
          const dimChanged = prevDim !== currentDim;
          const isoChanged = prevIsoEnabled !== currentIsoEnabled || prevIsoValue !== currentIsoValue;
          const thresholdChanged =
            prevThrEnabled !== currentThrEnabled ||
            prevThrMin !== currentThrMin ||
            prevThrMax !== currentThrMax;
          const roiChanged =
            prevRoiWireframe !== currentRoiWireframe ||
            prevRoiRefinement !== currentRoiRefinement ||
            prevRoiRadius !== currentRoiRadius ||
            !roiCenterEquals(prevRoiCenter, currentRoiCenter);

          if (displayChanged) {
            lastDisplayIntensityRef.current = displaySlider;
            metricsCollector.beginActionLatency('display_intensity_to_stable');
            sceneManager.setDisplayIntensityFromSlider(displaySlider);
          }
          if (sliceChanged) {
            lastFeatureSliceRef.current = currentSlice;
            metricsCollector.beginActionLatency('feature_slice_to_stable');
          }
          if (dimChanged) {
            lastFeatureDimRef.current = currentDim;
            metricsCollector.beginActionLatency('feature_dim_to_stable');
          }
          if (isoChanged) {
            lastFeatureIsoEnabledRef.current = currentIsoEnabled;
            lastFeatureIsoValueRef.current = currentIsoValue;
            metricsCollector.beginActionLatency('feature_isosurface_to_stable');
          }
          if (thresholdChanged) {
            lastFeatureThresholdEnabledRef.current = currentThrEnabled;
            lastFeatureThresholdMinRef.current = currentThrMin;
            lastFeatureThresholdMaxRef.current = currentThrMax;
            metricsCollector.beginActionLatency('feature_threshold_to_stable');
          }
          if (roiChanged) {
            lastRoiWireframeRef.current = currentRoiWireframe;
            lastRoiRefinementRef.current = currentRoiRefinement;
            lastRoiRadiusRef.current = currentRoiRadius;
            lastRoiCenterRef.current = currentRoiCenter;
            metricsCollector.beginActionLatency('roi_refinement_to_stable');
          }

          const shouldReload = lodChanged;

          if (shouldReload) {
            metricsCollector.beginActionLatency('lod_switch_to_stable');
            lastLodLevelRef.current = currentLodLevel;
            store.setVolumeStats(null);

            const persistenceSlider = store.getState().reduction.topologyThreshold;
            const sliderMin = appConfig.topology.thresholdMin;
            const sliderMax = appConfig.topology.thresholdMax;
            const denom = sliderMax - sliderMin || 1;
            const persistenceThresholdNormalized = Math.max(
              0,
              Math.min(1, (persistenceSlider - sliderMin) / denom)
            );

            const t0 = performance.now();
            const seq = ++loadSeqRef.current;
            setVolumeLoadProgress({ progress: 0, message: 'Loading…' });
            loadVolumeWithProgress(
              getDatasetId(),
              currentLodLevel,
              (p) =>
                setVolumeLoadProgress({
                  progress: p.progress,
                  message: p.message ?? (p.phase === 'fetch' ? 'Fetching…' : 'Preparing…'),
                }),
              undefined,
              persistenceThresholdNormalized
            )
              .then((vtkData) => {
                if (loadSeqRef.current !== seq) return;
                const loadTimeMs = performance.now() - t0;
                setVolumeLoadProgress(null);
                applyVolume(vtkData, false, loadTimeMs);
              })
              .catch(() => {
                setVolumeLoadProgress(null);
                lastLodLevelRef.current = prevLodLevel;
                store.setVolumeStats(null);
              });
          }

          syncSceneFeatures();
        });

        // Initial load: use current lodLevel from store
        const initialLodLevel = store.getState().reduction.lodLevel;
        const initialThreshold = store.getState().reduction.topologyThreshold;
        lastLodLevelRef.current = initialLodLevel;
        setVolumeStatus('loading');
        setVolumeLoadProgress({ progress: 0, message: 'Loading volume…' });
        store.setVolumeStats(null);

        const sliderMin = appConfig.topology.thresholdMin;
        const sliderMax = appConfig.topology.thresholdMax;
        const denom = sliderMax - sliderMin || 1;
        const persistenceThresholdNormalized = Math.max(
          0,
          Math.min(1, (initialThreshold - sliderMin) / denom)
        );
        const t0 = performance.now();
        metricsCollector.beginActionLatency('initial_load_to_stable');
        const seq = ++loadSeqRef.current;
        loadVolumeWithProgress(
          getDatasetId(),
          initialLodLevel,
          (p) =>
            setVolumeLoadProgress({
              progress: p.progress,
              message: p.message ?? (p.phase === 'fetch' ? 'Fetching…' : 'Preparing…'),
            }),
          undefined,
          persistenceThresholdNormalized
        )
          .then((vtkData) => {
            if (loadSeqRef.current !== seq) return;
            const loadTimeMs = performance.now() - t0;
            setVolumeLoadProgress(null);
            applyVolume(vtkData, true, loadTimeMs);
            setVolumeStatus('loaded');
          })
          .catch(() => {
            setVolumeLoadProgress(null);
            setVolumeStatus('error');
            lastLodLevelRef.current = null;
            store.setVolumeStats(null);
          });
      })();
    });

    return () => {
      unsubscribeStore?.();
      xrSessionManager.endSession().catch(() => {});
      xrSessionManagerRef.current = null;
      xrInputManagerRef.current = null;
      rendererManager.setFrameDeltaHook(null);
      rendererManager.stopRenderLoop();
      sceneManager.dispose();
      rendererManager.dispose();
      rendererManagerRef.current = null;
      sceneManagerRef.current = null;
      metricsCollectorRef.current = null;
    };
  }, []);

  const handleEnterVR = async () => {
    const mgr = xrSessionManagerRef.current;
    if (mgr == null) return;
    const result = await mgr.startSession();
    if (result.started) {
      setXrActive(true);
      const checkSession = () => {
        const session = mgr.getSession();
        if (session != null) {
          xrInputManagerRef.current?.setSession(session);
          session.addEventListener('end', () => {
            setXrActive(false);
            xrInputManagerRef.current?.setSession(null);
          });
          return;
        }
        requestAnimationFrame(checkSession);
      };
      requestAnimationFrame(checkSession);
    }
  };

  const handleExitVR = async () => {
    const mgr = xrSessionManagerRef.current;
    if (mgr == null) return;
    await mgr.endSession();
    setXrActive(false);
    xrInputManagerRef.current?.setSession(null);
  };

  const handlePickFile = (): void => {
    fileInputRef.current?.click();
  };

  const handleSelectDataset = (id: string): void => {
    if (!id || id === datasetIdRef.current) return;
    datasetIdRef.current = id;
    setDatasetLabel(id);
    setUploadError(null);
    setDatasetDescriptor(null);
    void loadDescriptor(id).then((d) => {
      if (d != null) setDatasetDescriptor(d);
    });
    // Trigger the existing reload path: bump LOD ref to force a refetch
    // through loadVolumeWithProgress (uses TTK backend if available).
    lastLodLevelRef.current = null;
    const cur = store.getState().reduction.lodLevel;
    store.setLodLevel(cur === 'full' ? 'high' : 'full');
    store.setLodLevel(cur);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file == null) return;
    const sm = sceneManagerRef.current;
    const rm = rendererManagerRef.current;
    if (sm == null || rm == null) return;
    setUploadError(null);
    setVolumeStatus('loading');
    setVolumeLoadProgress({ progress: 0.1, message: `Reading ${file.name}…` });
    const t0 = performance.now();
    try {
      const vtkData = await loadVtiFromFile(file);
      currentVolumeDataRef.current = vtkData;
      const displaySlider = store.getState().reduction.displayIntensityMin;
      sm.setVolumeData(vtkData, 'grayscale', displaySlider);
      sm.resetCamera();
      const r = store.getState().reduction;
      sm.setSlicePlaneEnabled(r.featureSliceEnabled);
      sm.setContextualVolumeDim(r.featureDimVolume);
      sm.setIsosurfaceEnabled(r.featureIsosurfaceEnabled, r.featureIsosurfaceValue);
      sm.setThresholdRegion(
        r.featureThresholdEnabled,
        r.featureThresholdMin,
        r.featureThresholdMax
      );
      sm.setRoiWireframe(
        r.roiWireframeEnabled,
        r.roiRadiusWorld,
        roiCenterToWorld(sm, r.roiCenterNorm)
      );
      rm.render();
      const stats = getVolumeStatsFromVtkImageData(vtkData);
      const loadTimeMs = performance.now() - t0;
      store.setVolumeStats({ ...stats, loadTimeMs });
      const id = file.name.replace(/\.vti$/i, '') || 'uploaded';
      const derived = descriptorFromVtkImageData(id, vtkData);
      setDatasetDescriptor(derived);
      setDatasetLabel(id);
      const scalarName = derived.scalarFields[0]?.name;
      if (scalarName && scalarName !== store.getState().scalar.activeScalarField) {
        store.setActiveScalarField(scalarName);
      }
      setVolumeLoadProgress(null);
      setVolumeStatus('loaded');
    } catch (err) {
      setVolumeLoadProgress(null);
      setVolumeStatus('error');
      setUploadError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleExportSession = (): void => {
    const mc = metricsCollectorRef.current;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: Date.now(),
            session: sessionEventExportObject(),
            metrics: mc?.exportReport() ?? null,
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `civa-session-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusMessage =
    volumeStatus === 'loading'
      ? volumeLoadProgress != null
        ? `${volumeLoadProgress.message ?? 'Loading volume…'} ${Math.round(volumeLoadProgress.progress * 100)}%`
        : 'Loading volume…'
      : volumeStatus === 'loaded'
        ? 'Left-drag: rotate · Shift+drag: pan · Scroll: zoom'
        : volumeStatus === 'error'
          ? `Volume load failed (LOD “${lodLevel}”). Expected static file ${getVtiUrlForLod(appConfig.dataset.basePath, appConfig.dataset.defaultDatasetId, lodLevel)} or ${getDefaultVtiUrl()} when the API is down. Use npm run dev from the repo root; ensure Docker/backend matches VITE_REDUCTION_PROXY_TARGET in .env.`
          : 'CIVA Reduction';
  const recentLatencies = [...(metricsCollectorRef.current?.getLatencies() ?? [])].slice(-4).reverse();

  const dashboardPanelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 24,
    right: 24,
    bottom: 24,
    width: 300,
    maxWidth: 'calc(100vw - 48px)',
    zIndex: 1,
    pointerEvents: 'auto',
    background: 'linear-gradient(160deg, rgba(18, 22, 32, 0.94) 0%, rgba(28, 32, 48, 0.92) 100%)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: 16,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05) inset',
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    overflowY: 'auto',
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 10,
  };

  const buttonBaseStyle: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: 13,
    fontFamily: 'inherit',
    cursor: 'pointer',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    color: '#e8eaed',
    background: 'rgba(255, 255, 255, 0.06)',
    transition: 'background 0.15s ease, border-color 0.15s ease',
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100vw',
          height: '100vh',
          minWidth: 1,
          minHeight: 1,
        }}
        data-testid="vtk-container"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".vti"
        onChange={(e) => void handleFileChange(e)}
        style={{ display: 'none' }}
      />
      {/* Right-side dashboard: status, LOD, features */}
      <aside style={dashboardPanelStyle} data-testid="dashboard">
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: '#fff',
              letterSpacing: '-0.02em',
            }}
          >
            CIVA Reduction
          </h2>
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
            }}
          >
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
              DATASET
            </div>
            {availableDatasets.length > 0 ? (
              <select
                value={availableDatasets.includes(datasetLabel) ? datasetLabel : ''}
                onChange={(e) => handleSelectDataset(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(0,0,0,0.35)',
                  color: '#e8eaed',
                  fontSize: 13,
                  marginBottom: 8,
                  fontFamily: 'ui-monospace, monospace',
                }}
                data-testid="dataset-select"
              >
                {!availableDatasets.includes(datasetLabel) && (
                  <option value="" disabled>
                    {datasetLabel} (uploaded)
                  </option>
                )}
                {availableDatasets.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            ) : (
              <div
                style={{
                  fontSize: 13,
                  fontFamily: 'ui-monospace, monospace',
                  color: '#e8eaed',
                  marginBottom: 8,
                  wordBreak: 'break-all',
                }}
              >
                {datasetLabel}
              </div>
            )}
            <button
              type="button"
              onClick={handlePickFile}
              style={{ ...buttonBaseStyle, width: '100%' }}
              data-testid="upload-vti"
            >
              Load .vti file
            </button>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: 11,
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.4,
              }}
            >
              Drop new .vti files into <code>data/datasets/</code> — they auto-appear in the dropdown
              and use TTK reduction. The button below loads any file from disk (static, no reduction).
            </p>
            {uploadError != null && (
              <p style={{ margin: '8px 0 0', fontSize: 11, color: 'rgba(239, 68, 68, 0.95)' }}>
                {uploadError}
              </p>
            )}
          </div>
          <p
            style={{
              margin: '12px 0 0',
              fontSize: 12,
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.4,
            }}
          >
            {statusMessage}
          </p>
          {/* Reduction uses TTK only (no VTK shrink fallback); health.ok means VTK+TTK ready */}
          {isReductionApiEnabled() ? (
            <p
              style={{
                margin: '8px 0 0',
                fontSize: 12,
                color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.4,
              }}
              data-testid="reduction-backend"
            >
              Reduction:{' '}
              {!backendHealthReady ? (
                <span>checking backend…</span>
              ) : backendHealth == null ? (
                <span style={{ color: 'rgba(251, 191, 36, 0.95)' }}>
                  Backend unreachable — start the API (e.g. docker compose) or check
                  VITE_REDUCTION_PROXY_TARGET / port.
                </span>
              ) : backendHealth.ttk && backendHealth.ok ? (
                <strong style={{ color: 'rgba(99, 102, 241, 0.95)' }}>
                  Topology ToolKit (TTK)
                </strong>
              ) : backendHealth.vtk ? (
                <span style={{ color: 'rgba(251, 191, 36, 0.95)' }}>
                  TTK required — install topologytoolkit (conda/Docker) for /api/reduce.
                </span>
              ) : (
                <span>backend error</span>
              )}
            </p>
          ) : (
            <p
              style={{
                margin: '8px 0 0',
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.4,
              }}
              data-testid="reduction-backend"
            >
              Reduction: static files
            </p>
          )}

          {appConfig.xr.enabled && (
            <div style={{ marginTop: 12 }}>
              <div style={sectionLabelStyle}>WebXR</div>
              {xrSupported ? (
                xrActive ? (
                  <button
                    type="button"
                    onClick={handleExitVR}
                    style={{
                      ...buttonBaseStyle,
                      background: 'rgba(239, 68, 68, 0.2)',
                      borderColor: 'rgba(239, 68, 68, 0.4)',
                    }}
                    data-testid="exit-vr"
                  >
                    Exit VR
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnterVR}
                    style={buttonBaseStyle}
                    data-testid="enter-vr"
                  >
                    Enter VR
                  </button>
                )
              ) : (
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  VR not available
                </p>
              )}
            </div>
          )}
        </div>

        {volumeStatus === 'loaded' && (
          <>
            <div style={{ flex: '0 0 auto' }}>
              <div style={sectionLabelStyle}>Volume specs</div>
              {volumeStats != null ? (
                <div
                  style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.85)',
                    lineHeight: 1.6,
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Resolution</span>{' '}
                    {volumeStats.dimensions[0]} × {volumeStats.dimensions[1]} ×{' '}
                    {volumeStats.dimensions[2]}
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Spacing</span>{' '}
                    {volumeStats.spacing[0].toFixed(2)} × {volumeStats.spacing[1].toFixed(2)} ×{' '}
                    {volumeStats.spacing[2].toFixed(2)}
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Voxels</span>{' '}
                    {volumeStats.voxelCount >= 1e6
                      ? `${(volumeStats.voxelCount / 1e6).toFixed(1)}M`
                      : volumeStats.voxelCount >= 1e3
                        ? `${(volumeStats.voxelCount / 1e3).toFixed(1)}K`
                        : volumeStats.voxelCount.toLocaleString()}
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Load time</span>{' '}
                    {volumeStats.loadTimeMs >= 1000
                      ? `${(volumeStats.loadTimeMs / 1000).toFixed(2)} s`
                      : `${Math.round(volumeStats.loadTimeMs)} ms`}
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  Loading volume for LOD…
                </p>
              )}
            </div>

            <div style={{ flex: '0 0 auto' }}>
              <div style={sectionLabelStyle}>Level of detail</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(['full', 'high', 'medium', 'low'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => store.setLodLevel(level)}
                    style={{
                      ...buttonBaseStyle,
                      background:
                        lodLevel === level
                          ? 'rgba(99, 102, 241, 0.35)'
                          : 'rgba(255, 255, 255, 0.06)',
                      borderColor:
                        lodLevel === level
                          ? 'rgba(99, 102, 241, 0.5)'
                          : 'rgba(255, 255, 255, 0.12)',
                    }}
                    data-testid={`lod-${level}`}
                  >
                    {level === 'full' ? 'Full' : level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: '0 0 auto' }}>
              <div style={sectionLabelStyle}>Reduction state</div>
              <p
                style={{
                  margin: '0 0 10px',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                Phase: <strong style={{ color: '#e8eaed' }}>{reductionPhase}</strong>
              </p>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 13,
                  color: '#e8eaed',
                }}
              >
                <input
                  type="checkbox"
                  checked={autoLodByDistance}
                  onChange={(e) => store.setAutoLodByDistance(e.target.checked)}
                />
                Auto LOD by distance
              </label>
            </div>

            <div style={{ flex: '0 0 auto' }}>
              <div style={sectionLabelStyle}>Scalar field</div>
              {datasetDescriptor != null && datasetDescriptor.scalarFields.length > 1 ? (
                <select
                  value={activeScalarField}
                  onChange={(e) => store.setActiveScalarField(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(0,0,0,0.35)',
                    color: '#e8eaed',
                    fontSize: 13,
                  }}
                >
                  {datasetDescriptor.scalarFields.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div
                  style={{
                    fontSize: 12,
                    fontFamily: 'ui-monospace, monospace',
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  {activeScalarField}
                </div>
              )}
              {scalarPrevious != null && (
                <button
                  type="button"
                  onClick={() => store.rollbackScalarField()}
                  style={{ ...buttonBaseStyle, marginTop: 8, fontSize: 12, padding: '6px 10px' }}
                >
                  Rollback scalar
                </button>
              )}
            </div>

            <div style={{ flex: '0 0 auto' }}>
              <div style={sectionLabelStyle}>Features &amp; ROI</div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 13,
                  color: '#e8eaed',
                  marginBottom: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={featureSliceEnabled}
                  onChange={(e) => store.setFeatureSliceEnabled(e.target.checked)}
                />
                Slice plane (clipping)
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 13,
                  color: '#e8eaed',
                  marginBottom: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={featureDimVolume}
                  onChange={(e) => store.setFeatureDimVolume(e.target.checked)}
                />
                Dim volume (context)
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 13,
                  color: '#e8eaed',
                  marginBottom: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={featureIsosurfaceEnabled}
                  onChange={(e) => store.setFeatureIsosurfaceEnabled(e.target.checked)}
                />
                Isosurface
              </label>
              {featureIsosurfaceEnabled && (
                <>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 6 }}>
                    Isovalue: <strong>{featureIsosurfaceValue}</strong>
                  </div>
                  <input
                    type="range"
                    min={appConfig.rendering.scalarRangeMin}
                    max={appConfig.rendering.scalarRangeMax}
                    step={1}
                    value={featureIsosurfaceValue}
                    onInput={(e) =>
                      store.setFeatureIsosurfaceValue(Number((e.target as HTMLInputElement).value))
                    }
                    onChange={(e) => store.setFeatureIsosurfaceValue(Number(e.target.value))}
                    style={{ width: '100%', marginBottom: 8, accentColor: 'rgb(249, 115, 22)' }}
                  />
                </>
              )}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 13,
                  color: '#e8eaed',
                  marginBottom: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={featureThresholdEnabled}
                  onChange={(e) => store.setFeatureThresholdEnabled(e.target.checked)}
                />
                Threshold region
              </label>
              {featureThresholdEnabled && (
                <>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 6 }}>
                    Threshold min/max: <strong>{featureThresholdMin}</strong> /{' '}
                    <strong>{featureThresholdMax}</strong>
                  </div>
                  <input
                    type="range"
                    min={appConfig.rendering.scalarRangeMin}
                    max={appConfig.rendering.scalarRangeMax}
                    step={1}
                    value={featureThresholdMin}
                    onInput={(e) =>
                      store.setFeatureThresholdRange(
                        Number((e.target as HTMLInputElement).value),
                        featureThresholdMax
                      )
                    }
                    onChange={(e) =>
                      store.setFeatureThresholdRange(Number(e.target.value), featureThresholdMax)
                    }
                    style={{ width: '100%', marginBottom: 6, accentColor: 'rgb(14, 165, 233)' }}
                  />
                  <input
                    type="range"
                    min={appConfig.rendering.scalarRangeMin}
                    max={appConfig.rendering.scalarRangeMax}
                    step={1}
                    value={featureThresholdMax}
                    onInput={(e) =>
                      store.setFeatureThresholdRange(
                        featureThresholdMin,
                        Number((e.target as HTMLInputElement).value)
                      )
                    }
                    onChange={(e) =>
                      store.setFeatureThresholdRange(featureThresholdMin, Number(e.target.value))
                    }
                    style={{ width: '100%', marginBottom: 8, accentColor: 'rgb(14, 165, 233)' }}
                  />
                </>
              )}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 13,
                  color: '#e8eaed',
                  marginBottom: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={roiWireframeEnabled}
                  onChange={(e) => store.setRoiWireframe(e.target.checked)}
                />
                ROI wireframe
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 13,
                  color: '#e8eaed',
                  marginBottom: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={roiRefinementEnabled}
                  onChange={(e) => store.setRoiRefinementEnabled(e.target.checked)}
                />
                ROI local refinement
              </label>
              {roiWireframeEnabled && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 12,
                    borderRadius: 10,
                    background: 'rgba(56, 189, 248, 0.06)',
                    border: '1px solid rgba(56, 189, 248, 0.22)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  {(['x', 'y', 'z'] as const).map((axis, idx) => {
                    const value = roiCenterNorm?.[idx] ?? 0.5;
                    const pct = Math.round(value * 100);
                    return (
                      <div key={axis}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.85)',
                            marginBottom: 4,
                          }}
                        >
                          <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {axis}
                          </span>
                          <span style={{ fontFamily: 'ui-monospace, monospace' }}>{pct}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1000}
                          step={1}
                          value={Math.round(value * 1000)}
                          onInput={(e) => {
                            const v = Number((e.target as HTMLInputElement).value) / 1000;
                            const cur = store.getState().reduction.roiCenterNorm ?? [0.5, 0.5, 0.5];
                            const next: [number, number, number] = [cur[0], cur[1], cur[2]];
                            next[idx] = v;
                            store.setRoiCenterNorm(next);
                          }}
                          onChange={(e) => {
                            const v = Number(e.target.value) / 1000;
                            const cur = store.getState().reduction.roiCenterNorm ?? [0.5, 0.5, 0.5];
                            const next: [number, number, number] = [cur[0], cur[1], cur[2]];
                            next[idx] = v;
                            store.setRoiCenterNorm(next);
                          }}
                          style={{ width: '100%', accentColor: 'rgb(56, 189, 248)' }}
                        />
                      </div>
                    );
                  })}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.85)',
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Radius
                      </span>
                      <span style={{ fontFamily: 'ui-monospace, monospace' }}>{roiRadiusWorld}</span>
                    </div>
                    <input
                      type="range"
                      min={appConfig.roi.minSizeM}
                      max={Math.min(appConfig.roi.maxSizeM, 256)}
                      step={1}
                      value={roiRadiusWorld}
                      onInput={(e) =>
                        store.setRoiRadiusWorld(Number((e.target as HTMLInputElement).value))
                      }
                      onChange={(e) => store.setRoiRadiusWorld(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'rgb(34, 197, 94)' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => store.setRoiCenterNorm(null)}
                    style={{ ...buttonBaseStyle, fontSize: 11, padding: '6px 10px' }}
                  >
                    Recenter ROI
                  </button>
                </div>
              )}
            </div>

            <div style={{ flex: '0 0 auto' }}>
              <div style={sectionLabelStyle}>Measurements</div>
              {perfSnapshot == null ? (
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  Collecting frames…
                </p>
              ) : (
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: 'ui-monospace, monospace',
                    color: 'rgba(255,255,255,0.88)',
                    lineHeight: 1.55,
                  }}
                >
                  <div>
                    FPS μ / min / max: {perfSnapshot.fpsMean.toFixed(1)} /{' '}
                    {perfSnapshot.fpsMin.toFixed(1)} / {perfSnapshot.fpsMax.toFixed(1)}
                  </div>
                  <div>
                    Frame ms μ / p95: {perfSnapshot.frameTimeMsMean.toFixed(2)} /{' '}
                    {perfSnapshot.frameTimeMsP95.toFixed(2)}
                  </div>
                  <div>n = {perfSnapshot.sampleCount}</div>
                  {recentLatencies.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {recentLatencies.map((x, i) => (
                        <div key={`${x.at}-${x.kind}-${i}`}>
                          {x.kind}: {x.ms.toFixed(1)} ms
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ flex: '0 0 auto' }}>
              <div style={sectionLabelStyle}>Session</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button type="button" onClick={handleExportSession} style={buttonBaseStyle}>
                  Export session JSON
                </button>
                <button
                  type="button"
                  onClick={() => store.resetExplorationState()}
                  style={{
                    ...buttonBaseStyle,
                    background: 'rgba(251, 191, 36, 0.12)',
                    borderColor: 'rgba(251, 191, 36, 0.35)',
                  }}
                >
                  Reset exploration
                </button>
              </div>
            </div>

            <div style={{ flex: '0 0 auto' }}>
              <div style={sectionLabelStyle}>Display intensity</div>
              <p
                style={{
                  margin: '0 0 8px',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.6)',
                  lineHeight: 1.4,
                }}
              >
                Opacity floor — 0 shows everything, higher hides soft tissue / noise.
              </p>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 8 }}>
                Floor: <strong>{displayIntensityMin}</strong>
              </div>
              <input
                type="range"
                min={appConfig.rendering.scalarRangeMin}
                max={appConfig.rendering.scalarRangeMax}
                step={1}
                value={displayIntensityMin}
                onInput={(e) =>
                  store.setDisplayIntensityMin(Number((e.target as HTMLInputElement).value))
                }
                onChange={(e) => store.setDisplayIntensityMin(Number(e.target.value))}
                style={{
                  width: '100%',
                  cursor: 'pointer',
                  accentColor: 'rgb(52, 211, 153)',
                  height: 8,
                }}
                data-testid="display-intensity-slider"
              />
            </div>
          </>
        )}
      </aside>
    </div>
  );
};
