/**
 * @file TransformSection.jsx
 * @description Full transform controls - Position, Rotation, Scale
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { AxisSlider } from '../shared/AxisSlider';
import { TRANSFORM_LIMITS } from '../../constants';

/**
 * TransformSection - Position, Rotation, Scale controls
 */
export const TransformSection = memo(function TransformSection({
  position,
  rotation,
  scale,
  uniformScale,
  onPositionChange,
  onRotationChange,
  onScaleChange,
  onUniformScaleToggle,
  onReset,
  disabled = false,
}) {
  return (
    <div className="transform-section">
      {/* POSITION */}
      <div className="transform-section__subsection">
        <div className="transform-section__label">POSITION</div>
        {['x', 'y', 'z'].map(axis => (
          <AxisSlider
            key={`pos-${axis}`}
            axis={axis.toUpperCase()}
            value={position[axis]}
            onChange={(val) => onPositionChange(axis, val)}
            min={TRANSFORM_LIMITS.position.min}
            max={TRANSFORM_LIMITS.position.max}
            step={TRANSFORM_LIMITS.position.step}
            unit={` ${TRANSFORM_LIMITS.position.unit}`}
            disabled={disabled}
          />
        ))}
      </div>

      {/* ROTATION */}
      <div className="transform-section__subsection">
        <div className="transform-section__label">ROTATION</div>
        {['x', 'y', 'z'].map(axis => (
          <AxisSlider
            key={`rot-${axis}`}
            axis={axis.toUpperCase()}
            value={rotation[axis]}
            onChange={(val) => onRotationChange(axis, val)}
            min={TRANSFORM_LIMITS.rotation.min}
            max={TRANSFORM_LIMITS.rotation.max}
            step={TRANSFORM_LIMITS.rotation.step}
            unit={TRANSFORM_LIMITS.rotation.unit}
            disabled={disabled}
          />
        ))}
      </div>

      {/* SCALE */}
      <div className="transform-section__subsection">
        <div className="transform-section__label-row">
          <span className="transform-section__label">SCALE</span>
          <button
            className={`transform-section__uniform-toggle ${uniformScale ? 'transform-section__uniform-toggle--active' : ''}`}
            onClick={onUniformScaleToggle}
            disabled={disabled}
          >
            <Icon name={uniformScale ? 'link' : 'unlink'} size={10} />
            <span>{uniformScale ? 'Uniform' : 'Free'}</span>
          </button>
        </div>
        {uniformScale ? (
          <AxisSlider
            axis="Uniform"
            value={scale.x}
            onChange={(val) => onScaleChange('x', val)}
            min={TRANSFORM_LIMITS.scale.min}
            max={TRANSFORM_LIMITS.scale.max}
            step={TRANSFORM_LIMITS.scale.step}
            unit={TRANSFORM_LIMITS.scale.unit}
            disabled={disabled}
          />
        ) : (
          ['x', 'y', 'z'].map(axis => (
            <AxisSlider
              key={`scale-${axis}`}
              axis={axis.toUpperCase()}
              value={scale[axis]}
              onChange={(val) => onScaleChange(axis, val)}
              min={TRANSFORM_LIMITS.scale.min}
              max={TRANSFORM_LIMITS.scale.max}
              step={TRANSFORM_LIMITS.scale.step}
              unit={TRANSFORM_LIMITS.scale.unit}
              disabled={disabled}
            />
          ))
        )}
      </div>

      {/* Reset Button */}
      <button
        className="transform-section__reset"
        onClick={onReset}
        disabled={disabled}
      >
        <Icon name="refreshCcw" size={12} />
        <span>Reset Transform</span>
      </button>
    </div>
  );
});

export default TransformSection;
