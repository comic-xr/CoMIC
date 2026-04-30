/**
 * Scene Manager
 * Creates and manages the 3D scene: volume (VolumeMapper + Volume) with OTF/CTF.
 * Volume OTF/CTF: optional display cutaway (opacity floor) mapped from UI slider into data scalar range.
 */

import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkVolumeProperty from '@kitware/vtk.js/Rendering/Core/VolumeProperty';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPlane from '@kitware/vtk.js/Common/DataModel/Plane';
import vtkSphereSource from '@kitware/vtk.js/Filters/Sources/SphereSource';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkImageCropFilter from '@kitware/vtk.js/Filters/General/ImageCropFilter';
import vtkImageMarchingCubes from '@kitware/vtk.js/Filters/General/ImageMarchingCubes';
import { OpacityMode } from '@kitware/vtk.js/Rendering/Core/VolumeProperty/Constants';
import { Representation } from '@kitware/vtk.js/Rendering/Core/Property/Constants';
import { appConfig } from '@/config';
import { validateVolumeData } from './rendering-validation';

/** Preset for volume color/opacity. */
export type VolumePreset = 'grayscale' | 'bone';

/** VTK ImageData (from loadVti). Typed as unknown to avoid data module dependency. */
type VTKImageDataLike = unknown;

/** Minimal vtkImageData surface for spacing + scalar range (avoids tight coupling to vtk typings). */
interface VTKImageDataForVolume {
  getDimensions(): number[];
  getOrigin(): number[];
  getSpacing(): number[];
  getPointData(): { getScalars(): { getRange(): [number, number] } | null } | null;
}

type vtkRendererType = ReturnType<
  typeof import('@kitware/vtk.js/Rendering/Core/Renderer').default.newInstance
>;

export class SceneManager {
  private volume: ReturnType<typeof vtkVolume.newInstance> | null = null;
  private volumeMapper: ReturnType<typeof vtkVolumeMapper.newInstance> | null = null;
  private renderer: vtkRendererType | null = null;
  /** Last scalar range used for transfer functions (display intensity mapping + updates). */
  private lastDataScalarRange: [number, number] | null = null;
  private lastWorldBounds: [number, number, number, number, number, number] | null = null;
  private slicePlane: ReturnType<typeof vtkPlane.newInstance> | null = null;
  private roiActor: ReturnType<typeof vtkActor.newInstance> | null = null;
  private roiMapper: ReturnType<typeof vtkMapper.newInstance> | null = null;
  private roiSource: ReturnType<typeof vtkSphereSource.newInstance> | null = null;
  private isosurfaceActor: ReturnType<typeof vtkActor.newInstance> | null = null;
  private isosurfaceMapper: ReturnType<typeof vtkMapper.newInstance> | null = null;
  private roiRefineVolume: ReturnType<typeof vtkVolume.newInstance> | null = null;
  private roiRefineMapper: ReturnType<typeof vtkVolumeMapper.newInstance> | null = null;
  private lastImageData: VTKImageDataLike | null = null;
  private currentDisplayIntensitySlider = appConfig.rendering.scalarRangeMin;
  private featureThresholdEnabled = false;
  private featureThresholdMin = appConfig.rendering.scalarRangeMin;
  private featureThresholdMax = appConfig.rendering.scalarRangeMax;
  private baseOpacityUnitDist = 1e-6;
  private contextualDimActive = false;

  /** Map UI slider (rendering.scalarRangeMin..Max) into loaded volume scalar coordinates. */
  private static mapDisplaySliderToDataScalar(slider: number, dMin: number, dMax: number): number {
    const rMin = appConfig.rendering.scalarRangeMin;
    const rMax = appConfig.rendering.scalarRangeMax;
    const denom = rMax - rMin || 1;
    const u = (Math.max(rMin, Math.min(rMax, slider)) - rMin) / denom;
    return dMin + u * (dMax - dMin);
  }

  /**
   * Set the renderer to which volumes will be added. Call before setVolumeData.
   */
  setRenderer(renderer: vtkRendererType): void {
    this.renderer = renderer;
  }

  /** World-space bounds of the last loaded volume, or null. */
  getLastWorldBounds(): [number, number, number, number, number, number] | null {
    return this.lastWorldBounds;
  }

  /** Volume center from last bounds. */
  getVolumeCenter(): [number, number, number] | null {
    const b = this.lastWorldBounds;
    if (b == null) return null;
    return [(b[0] + b[1]) / 2, (b[2] + b[3]) / 2, (b[4] + b[5]) / 2];
  }

  /**
   * Build a bone-like preset (Hounsfield-style): air transparent, soft tissue dim, bone bright.
   * CTF: grayscale ramp (dark to white) for CT density.
   */
  private static buildBoneTransferFunctions(): {
    otf: ReturnType<typeof vtkPiecewiseFunction.newInstance>;
    ctf: ReturnType<typeof vtkColorTransferFunction.newInstance>;
  } {
    const otf = vtkPiecewiseFunction.newInstance();
    otf.addPoint(-3024, 0);
    otf.addPoint(-16, 0);
    otf.addPoint(641, 0.72);
    otf.addPoint(3071, 0.89);

    const ctf = vtkColorTransferFunction.newInstance();
    ctf.addRGBPoint(-3024, 0, 0, 0);
    ctf.addRGBPoint(-16, 0.2, 0.2, 0.2);
    ctf.addRGBPoint(641, 0.88, 0.83, 0.76);
    ctf.addRGBPoint(3071, 1, 1, 1);
    return { otf, ctf };
  }

  /**
   * Grayscale OTF/CTF with x mapped from a [0,255] template into [dMin,dMax].
   * Keeps VTK.js opacity / color lookup aligned with the dataset's scalar range (GPU path uses data min/max).
   */
  private static buildGrayscaleTransferFunctionsForDataRange(
    dMin: number,
    dMax: number
  ): {
    otf: ReturnType<typeof vtkPiecewiseFunction.newInstance>;
    ctf: ReturnType<typeof vtkColorTransferFunction.newInstance>;
  } {
    const span = dMax - dMin || 1;
    const x = (t: number) => dMin + (t / 255) * span;

    const otf = vtkPiecewiseFunction.newInstance();
    // Stronger low-end opacity so composite rays accumulate (avoids “empty” volume on some GPUs / browsers).
    otf.addPoint(x(0), 0.14);
    otf.addPoint(x(48), 0.55);
    otf.addPoint(x(128), 0.78);
    otf.addPoint(x(255), 1);

    const ctf = vtkColorTransferFunction.newInstance();
    ctf.addRGBPoint(x(0), 0.05, 0.05, 0.06);
    ctf.addRGBPoint(x(128), 0.55, 0.55, 0.56);
    ctf.addRGBPoint(x(255), 1, 1, 1);

    return { otf, ctf };
  }

  /**
   * Opacity TF with values below `threshold` (in data units) invisible; ramp above for bone-style contrast.
   */
  private static buildThresholdedOTFForDataRange(
    threshold: number,
    dMin: number,
    dMax: number
  ): ReturnType<typeof vtkPiecewiseFunction.newInstance> {
    const otf = vtkPiecewiseFunction.newInstance();
    const minVal = dMin;
    const maxVal = dMax;
    const t = Math.max(minVal, Math.min(maxVal, threshold));
    if (t >= maxVal) {
      otf.addPoint(minVal, 0);
      otf.addPoint(maxVal, 0);
      return otf;
    }
    otf.addPoint(minVal, 0);
    otf.addPoint(t, 0);
    const span = maxVal - t;
    otf.addPoint(t + span * 0.2, 0.4);
    otf.addPoint(maxVal, 0.9);
    return otf;
  }

  /**
   * Set volume image data and add a volume to the scene with the given preset.
   * Validates bounds, orientation, and buffers (no NaNs) before rendering.
   * Uses a grayscale-style opacity ramp scaled to the dataset's scalar range.
   * `displayIntensitySlider`: client-side opacity floor in configured scalar space (see rendering.scalarRangeMin/Max).
   * When mapped into data range it exceeds dMin, uses a cutaway OTF (bone isolation); at the slider minimum, full grayscale OTF.
   * imageData must be a VTK ImageData instance (e.g. from loadVti()).
   */
  setVolumeData(
    imageData: VTKImageDataLike,
    preset: VolumePreset = 'grayscale',
    displayIntensitySlider: number = appConfig.rendering.scalarRangeMin
  ): void {
    if (this.renderer == null) {
      throw new Error('SceneManager: setRenderer() must be called before setVolumeData().');
    }

    const validation = validateVolumeData(imageData);
    if (!validation.valid) {
      throw new Error(`Volume validation failed: ${validation.errors.join('; ')}`);
    }

    this.lastWorldBounds = validation.bounds ?? null;
    this.removeVolume();
    this.lastImageData = imageData;
    this.currentDisplayIntensitySlider = displayIntensitySlider;

    const img = imageData as VTKImageDataForVolume;
    const scalars = img.getPointData()?.getScalars?.();
    const rawRange = scalars?.getRange?.() ?? [0, 255];
    const dMin = rawRange[0];
    let dMax = rawRange[1];
    if (dMax <= dMin) {
      dMax = dMin + 1;
    }
    this.lastDataScalarRange = [dMin, dMax];

    const mapper = vtkVolumeMapper.newInstance();
    mapper.setInputData(imageData as Parameters<typeof mapper.setInputData>[0]);
    mapper.setBlendModeToComposite();
    mapper.setAutoAdjustSampleDistances(false);
    mapper.setMaximumSamplesPerRay(4096);
    const spacing = img.getSpacing?.() ?? [1, 1, 1];
    const minSpacing = Math.min(spacing[0], spacing[1], spacing[2]);
    const step = Math.max(minSpacing * 0.35, 1e-6);
    mapper.setSampleDistance(step);

    const volumeProperty = vtkVolumeProperty.newInstance();
    volumeProperty.setIndependentComponents(false);
    volumeProperty.setOpacityMode(0, OpacityMode.PROPORTIONAL);
    this.baseOpacityUnitDist = Math.max(minSpacing * 0.65, 1e-6);
    this.contextualDimActive = false;
    volumeProperty.setScalarOpacityUnitDistance(0, this.baseOpacityUnitDist);

    let otf: ReturnType<typeof vtkPiecewiseFunction.newInstance>;
    let ctf: ReturnType<typeof vtkColorTransferFunction.newInstance>;

    if (preset === 'bone') {
      const bone = SceneManager.buildBoneTransferFunctions();
      otf = bone.otf;
      ctf = bone.ctf;
    } else {
      const g = SceneManager.buildGrayscaleTransferFunctionsForDataRange(dMin, dMax);
      otf = this.buildCurrentOTFForDataRange(dMin, dMax);
      ctf = g.ctf;
    }

    volumeProperty.setScalarOpacity(0, otf);
    volumeProperty.setRGBTransferFunction(0, ctf);

    const volume = vtkVolume.newInstance();
    volume.setMapper(mapper);
    volume.setProperty(volumeProperty);
    volume.setVisibility(true);

    this.renderer.addVolume(volume);
    this.volumeMapper = mapper;
    this.volume = volume;
  }

  /** Single slicing half-space on the volume mapper (feature toggle). */
  setSlicePlaneEnabled(enabled: boolean): void {
    if (this.volumeMapper == null || this.lastWorldBounds == null) return;
    if (!enabled) {
      this.volumeMapper.removeAllClippingPlanes();
      this.slicePlane = null;
      return;
    }
    const b = this.lastWorldBounds;
    const cx = (b[0] + b[1]) / 2;
    const cy = (b[2] + b[3]) / 2;
    const cz = (b[4] + b[5]) / 2;
    if (this.slicePlane == null) {
      this.slicePlane = vtkPlane.newInstance();
    }
    this.slicePlane.setOrigin(cx, cy, cz);
    this.slicePlane.setNormal(1, 0, 0);
    this.volumeMapper.removeAllClippingPlanes();
    this.volumeMapper.addClippingPlane(this.slicePlane);
  }

  /** Dim full volume compositing for “feature focus” context (Phase 5). */
  setContextualVolumeDim(dim: boolean): void {
    if (this.volume == null) return;
    const prop = this.volume.getProperty();
    if (prop == null) return;
    if (dim === this.contextualDimActive) return;
    this.contextualDimActive = dim;
    const mult = dim ? 2.25 : 1;
    prop.setScalarOpacityUnitDistance(0, Math.max(this.baseOpacityUnitDist * mult, 1e-6));
  }

  /** Feature: show a thresholded scalar region as primary visible band. */
  setThresholdRegion(enabled: boolean, minSlider: number, maxSlider: number): void {
    this.featureThresholdEnabled = enabled;
    this.featureThresholdMin = Math.min(minSlider, maxSlider);
    this.featureThresholdMax = Math.max(minSlider, maxSlider);
    this.updateMainVolumeOpacity();
  }

  /** Feature: extract and overlay an isosurface using ImageMarchingCubes. */
  setIsosurfaceEnabled(enabled: boolean, isoValueSlider: number): void {
    if (this.renderer == null) return;
    if (!enabled || this.lastImageData == null) {
      this.removeIsosurface();
      return;
    }
    const data = this.lastImageData as VTKImageDataForVolume;
    const range = data.getPointData()?.getScalars()?.getRange?.() ?? [0, 255];
    const isoValue = SceneManager.mapDisplaySliderToDataScalar(isoValueSlider, range[0], range[1]);
    this.removeIsosurface();
    const mc = vtkImageMarchingCubes.newInstance({
      contourValue: isoValue,
      computeNormals: true,
      mergePoints: true,
    });
    mc.setInputData(this.lastImageData as Parameters<typeof mc.setInputData>[0]);
    mc.update();
    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(mc.getOutputPort() as Parameters<typeof mapper.setInputConnection>[0]);
    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);
    const prop = actor.getProperty();
    prop.setRepresentation(Representation.SURFACE);
    prop.setColor(0.95, 0.62, 0.22);
    prop.setOpacity(0.82);
    this.renderer.addActor(actor);
    this.isosurfaceActor = actor;
    this.isosurfaceMapper = mapper;
  }

  /**
   * ROI refinement overlay: crop a higher-LOD source volume in IJK around ROI center
   * and render it as a second volume over contextual base volume.
   */
  setRoiRefinementVolumeData(
    imageData: VTKImageDataLike | null,
    radiusWorld: number,
    centerWorld?: readonly [number, number, number] | null
  ): void {
    if (this.renderer == null || imageData == null || this.lastWorldBounds == null) {
      this.removeRoiRefinement();
      return;
    }
    const c = centerWorld ?? this.getVolumeCenter();
    if (c == null) {
      this.removeRoiRefinement();
      return;
    }
    const img = imageData as VTKImageDataForVolume;
    const dims = img.getDimensions();
    const origin = img.getOrigin();
    const spacing = img.getSpacing();
    const toI = (x: number) => Math.max(0, Math.min(dims[0] - 1, Math.round((x - origin[0]) / spacing[0])));
    const toJ = (y: number) => Math.max(0, Math.min(dims[1] - 1, Math.round((y - origin[1]) / spacing[1])));
    const toK = (z: number) => Math.max(0, Math.min(dims[2] - 1, Math.round((z - origin[2]) / spacing[2])));
    const i0 = toI(c[0] - radiusWorld);
    const i1 = toI(c[0] + radiusWorld);
    const j0 = toJ(c[1] - radiusWorld);
    const j1 = toJ(c[1] + radiusWorld);
    const k0 = toK(c[2] - radiusWorld);
    const k1 = toK(c[2] + radiusWorld);

    const crop = vtkImageCropFilter.newInstance();
    crop.setInputData(imageData as Parameters<typeof crop.setInputData>[0]);
    crop.setCroppingPlanes([Math.min(i0, i1), Math.max(i0, i1), Math.min(j0, j1), Math.max(j0, j1), Math.min(k0, k1), Math.max(k0, k1)]);
    crop.update();
    const out = crop.getOutputData();
    crop.delete?.();
    if (out == null) {
      this.removeRoiRefinement();
      return;
    }

    const range = (out as VTKImageDataForVolume).getPointData()?.getScalars()?.getRange?.() ?? [0, 255];
    const dMin = range[0];
    const dMax = range[1] > range[0] ? range[1] : range[0] + 1;
    const mapper = vtkVolumeMapper.newInstance();
    mapper.setInputData(out as Parameters<typeof mapper.setInputData>[0]);
    mapper.setBlendModeToComposite();
    mapper.setAutoAdjustSampleDistances(false);
    mapper.setMaximumSamplesPerRay(4096);
    const prop = vtkVolumeProperty.newInstance();
    prop.setIndependentComponents(false);
    prop.setOpacityMode(0, OpacityMode.PROPORTIONAL);
    const unitDist = Math.max(Math.min(spacing[0], spacing[1], spacing[2]) * 0.45, 1e-6);
    prop.setScalarOpacityUnitDistance(0, unitDist);
    prop.setScalarOpacity(0, SceneManager.buildThresholdedOTFForDataRange(dMin + (dMax - dMin) * 0.05, dMin, dMax));
    prop.setRGBTransferFunction(0, SceneManager.buildGrayscaleTransferFunctionsForDataRange(dMin, dMax).ctf);
    const vol = vtkVolume.newInstance();
    vol.setMapper(mapper);
    vol.setProperty(prop);
    this.removeRoiRefinement();
    this.renderer.addVolume(vol);
    this.roiRefineVolume = vol;
    this.roiRefineMapper = mapper;
  }

  /** ROI preview as wireframe sphere (world units). */
  setRoiWireframe(
    enabled: boolean,
    radiusWorld: number,
    centerWorld?: readonly [number, number, number] | null
  ): void {
    if (this.renderer == null || this.lastWorldBounds == null) return;
    const c = centerWorld ?? this.getVolumeCenter();
    if (c == null) return;

    if (!enabled) {
      if (this.roiActor != null) {
        this.renderer.removeActor(this.roiActor);
        this.roiActor.delete?.();
        this.roiMapper?.delete?.();
        this.roiSource?.delete?.();
        this.roiActor = null;
        this.roiMapper = null;
        this.roiSource = null;
      }
      return;
    }

    const radius = Math.max(radiusWorld, 1e-3);
    if (this.roiActor != null && this.roiSource != null) {
      this.roiSource.setCenter(c[0], c[1], c[2]);
      this.roiSource.setRadius(radius);
      return;
    }

    const sphere = vtkSphereSource.newInstance({
      center: [c[0], c[1], c[2]],
      radius,
      thetaResolution: 48,
      phiResolution: 48,
    });
    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(sphere.getOutputPort());
    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);
    const p = actor.getProperty();
    p.setRepresentation(Representation.WIREFRAME);
    p.setColor(0.36, 0.85, 0.98);
    p.setEdgeVisibility(true);
    p.setLineWidth(1.5);
    p.setOpacity(0.85);
    this.renderer.addActor(actor);
    this.roiActor = actor;
    this.roiMapper = mapper;
    this.roiSource = sphere;
  }

  /**
   * Update opacity from the display-intensity slider without reloading data.
   * Slider uses rendering.scalarRangeMin/Max; values map into the last volume scalar range.
   */
  setDisplayIntensityFromSlider(displayIntensitySlider: number): void {
    this.currentDisplayIntensitySlider = displayIntensitySlider;
    this.updateMainVolumeOpacity();
  }

  /** Remove the current volume from the scene. */
  removeVolume(): void {
    this.removeIsosurface();
    this.removeRoiRefinement();
    if (this.renderer != null && this.roiActor != null) {
      this.renderer.removeActor(this.roiActor);
      this.roiActor.delete?.();
      this.roiMapper?.delete?.();
      this.roiSource?.delete?.();
      this.roiActor = null;
      this.roiMapper = null;
      this.roiSource = null;
    }
    if (this.renderer != null && this.volume != null) {
      this.renderer.removeVolume(this.volume);
      this.volume.delete?.();
      this.volumeMapper?.delete?.();
      this.volume = null;
      this.volumeMapper = null;
    }
    this.slicePlane = null;
  }

  /** Reset the camera to show the full volume (call after setVolumeData). */
  resetCamera(): void {
    if (this.renderer != null) {
      this.renderer.resetCamera();
    }
  }

  /** Release references. Call when tearing down. */
  dispose(): void {
    this.removeVolume();
    this.lastImageData = null;
    this.lastDataScalarRange = null;
    this.lastWorldBounds = null;
    this.renderer = null;
  }

  private buildCurrentOTFForDataRange(
    dMin: number,
    dMax: number
  ): ReturnType<typeof vtkPiecewiseFunction.newInstance> {
    if (this.featureThresholdEnabled) {
      const tMin = SceneManager.mapDisplaySliderToDataScalar(this.featureThresholdMin, dMin, dMax);
      const tMax = SceneManager.mapDisplaySliderToDataScalar(this.featureThresholdMax, dMin, dMax);
      const low = Math.max(dMin, Math.min(tMin, tMax));
      const high = Math.min(dMax, Math.max(tMin, tMax));
      const otf = vtkPiecewiseFunction.newInstance();
      otf.addPoint(dMin, 0);
      otf.addPoint(low, 0);
      otf.addPoint(low + (high - low) * 0.2, 0.45);
      otf.addPoint(high, 0.9);
      otf.addPoint(dMax, 0);
      return otf;
    }
    // Unified ramp: slider acts as a noise floor. Slider=min => floor at dMin, full
    // structure visible (sharp edge at dMin keeps PROPORTIONAL opacity mode active so
    // the volume doesn't disappear into the gradient term). Slider=max => floor at
    // dMax, only brightest voxels survive.
    const span = Math.max(dMax - dMin, 1);
    const rawT = SceneManager.mapDisplaySliderToDataScalar(
      this.currentDisplayIntensitySlider,
      dMin,
      dMax
    );
    const t = Math.max(dMin, Math.min(dMax - span * 1e-3, rawT));
    const aboveSpan = Math.max(dMax - t, span * 1e-3);
    const otf = vtkPiecewiseFunction.newInstance();
    otf.addPoint(dMin, 0);
    otf.addPoint(t, 0);
    otf.addPoint(t + aboveSpan * 0.05, 0.3);
    otf.addPoint(t + aboveSpan * 0.4, 0.7);
    otf.addPoint(dMax, 0.95);
    return otf;
  }

  private updateMainVolumeOpacity(): void {
    if (this.volume == null) return;
    const property = this.volume.getProperty();
    if (property == null || this.lastDataScalarRange == null) return;
    const [dMin, dMax] = this.lastDataScalarRange;
    property.setScalarOpacity(0, this.buildCurrentOTFForDataRange(dMin, dMax));
  }

  private removeIsosurface(): void {
    if (this.renderer != null && this.isosurfaceActor != null) {
      this.renderer.removeActor(this.isosurfaceActor);
      this.isosurfaceActor.delete?.();
      this.isosurfaceMapper?.delete?.();
    }
    this.isosurfaceActor = null;
    this.isosurfaceMapper = null;
  }

  private removeRoiRefinement(): void {
    if (this.renderer != null && this.roiRefineVolume != null) {
      this.renderer.removeVolume(this.roiRefineVolume);
      this.roiRefineVolume.delete?.();
      this.roiRefineMapper?.delete?.();
    }
    this.roiRefineVolume = null;
    this.roiRefineMapper = null;
  }
}
