/**
 * @file AdaptiveTooltip.jsx
 * @description VR-compatible tooltip with raycast support and adaptive positioning
 *
 * Features:
 * - Works in desktop (hover) and VR (raycast/pointer) modes
 * - Adaptive positioning based on available viewport space
 * - Frosted glass styling with arrow
 * - Accessible with proper ARIA attributes
 */

import React, { useState, useCallback, useEffect, useRef, useId, memo } from 'react';
import { createPortal } from 'react-dom';
import { tokens } from '@UI/react/styles/tokens';

/**
 * AdaptiveTooltip - VR-compatible tooltip with adaptive positioning
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Trigger element (must accept ref)
 * @param {React.ReactNode} props.content - Tooltip content
 * @param {'top' | 'bottom' | 'left' | 'right'} [props.placement='top'] - Preferred placement
 * @param {number} [props.delay=300] - Show delay in ms
 * @param {boolean} [props.disabled=false] - Disable tooltip
 * @param {string} [props.className] - Additional class for tooltip
 */
export const AdaptiveTooltip = memo(function AdaptiveTooltip({
  children,
  content,
  placement = 'top',
  delay = 300,
  disabled = false,
  className = '',
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [actualPlacement, setActualPlacement] = useState(placement);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);
  const tooltipId = useId();

  const clearShowTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const padding = 8;
    const arrowSize = 6;

    // Calculate available space in each direction
    const spaceTop = triggerRect.top;
    const spaceBottom = window.innerHeight - triggerRect.bottom;
    const spaceLeft = triggerRect.left;
    const spaceRight = window.innerWidth - triggerRect.right;

    // Determine best placement based on available space
    let bestPlacement = placement;
    const tooltipHeight = tooltipRect.height + arrowSize + padding;
    const tooltipWidth = tooltipRect.width + arrowSize + padding;

    if (placement === 'top' && spaceTop < tooltipHeight && spaceBottom > tooltipHeight) {
      bestPlacement = 'bottom';
    } else if (placement === 'bottom' && spaceBottom < tooltipHeight && spaceTop > tooltipHeight) {
      bestPlacement = 'top';
    } else if (placement === 'left' && spaceLeft < tooltipWidth && spaceRight > tooltipWidth) {
      bestPlacement = 'right';
    } else if (placement === 'right' && spaceRight < tooltipWidth && spaceLeft > tooltipWidth) {
      bestPlacement = 'left';
    }

    setActualPlacement(bestPlacement);

    // Calculate position based on placement
    let x, y;
    const centerX = triggerRect.left + triggerRect.width / 2;
    const centerY = triggerRect.top + triggerRect.height / 2;

    switch (bestPlacement) {
      case 'top':
        x = centerX - tooltipRect.width / 2;
        y = triggerRect.top - tooltipRect.height - arrowSize - 4;
        break;
      case 'bottom':
        x = centerX - tooltipRect.width / 2;
        y = triggerRect.bottom + arrowSize + 4;
        break;
      case 'left':
        x = triggerRect.left - tooltipRect.width - arrowSize - 4;
        y = centerY - tooltipRect.height / 2;
        break;
      case 'right':
        x = triggerRect.right + arrowSize + 4;
        y = centerY - tooltipRect.height / 2;
        break;
      default:
        x = centerX - tooltipRect.width / 2;
        y = triggerRect.top - tooltipRect.height - arrowSize - 4;
    }

    // Clamp to viewport
    x = Math.max(8, Math.min(x, window.innerWidth - tooltipRect.width - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - tooltipRect.height - 8));

    setPosition({ x, y });
  }, [placement]);

  const show = useCallback(() => {
    if (disabled) return;
    clearShowTimeout();
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [delay, disabled, clearShowTimeout]);

  const hide = useCallback(() => {
    clearShowTimeout();
    setIsVisible(false);
  }, [clearShowTimeout]);

  useEffect(() => {
    if (isVisible) {
      // Small delay to allow tooltip to render before measuring
      requestAnimationFrame(calculatePosition);
    }
  }, [isVisible, calculatePosition]);

  useEffect(() => {
    return () => {
      clearShowTimeout();
    };
  }, [clearShowTimeout]);

  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        hide();
      }
    };

    const handlePointerDown = (event) => {
      const target = event.target;
      if (triggerRef.current && triggerRef.current.contains(target)) return;
      hide();
    };

    const handleWindowBlur = () => hide();
    const handleVisibility = () => {
      if (document.hidden) hide();
    };

    const handleMouseOut = (event) => {
      if (!event.relatedTarget) {
        hide();
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('resize', handleWindowBlur);
    window.addEventListener('scroll', handleWindowBlur, true);
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('resize', handleWindowBlur);
      window.removeEventListener('scroll', handleWindowBlur, true);
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [isVisible, hide]);

  if (disabled || !content) return children;

  // Arrow styles based on placement
  const getArrowStyle = () => {
    const base = {
      position: 'absolute',
      width: 0,
      height: 0,
    };

    switch (actualPlacement) {
      case 'top':
        return {
          ...base,
          bottom: -6,
          left: '50%',
          transform: 'translateX(-50%)',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: `6px solid ${tokens.colors.glass.panel}`,
        };
      case 'bottom':
        return {
          ...base,
          top: -6,
          left: '50%',
          transform: 'translateX(-50%)',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom: `6px solid ${tokens.colors.glass.panel}`,
        };
      case 'left':
        return {
          ...base,
          right: -6,
          top: '50%',
          transform: 'translateY(-50%)',
          borderTop: '6px solid transparent',
          borderBottom: '6px solid transparent',
          borderLeft: `6px solid ${tokens.colors.glass.panel}`,
        };
      case 'right':
        return {
          ...base,
          left: -6,
          top: '50%',
          transform: 'translateY(-50%)',
          borderTop: '6px solid transparent',
          borderBottom: '6px solid transparent',
          borderRight: `6px solid ${tokens.colors.glass.panel}`,
        };
      default:
        return base;
    }
  };

  const getAnimationTransform = () => {
    switch (actualPlacement) {
      case 'top': return 'translateY(4px)';
      case 'bottom': return 'translateY(-4px)';
      case 'left': return 'translateX(4px)';
      case 'right': return 'translateX(-4px)';
      default: return 'translateY(4px)';
    }
  };

  // Clone the trigger element and attach handlers
  const trigger = React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: (e) => {
      show();
      children.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e) => {
      hide();
      children.props.onMouseLeave?.(e);
    },
    // VR raycast support
    onPointerEnter: (e) => {
      show();
      children.props.onPointerEnter?.(e);
    },
    onPointerLeave: (e) => {
      hide();
      children.props.onPointerLeave?.(e);
    },
    onFocus: (e) => {
      show();
      children.props.onFocus?.(e);
    },
    onBlur: (e) => {
      hide();
      children.props.onBlur?.(e);
    },
    'aria-describedby': isVisible ? tooltipId : undefined,
  });

  const tooltipStyle = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    zIndex: tokens.zIndex.tooltip,
    padding: '6px 10px',
    background: tokens.colors.glass.panel,
    backdropFilter: tokens.blur.strong,
    WebkitBackdropFilter: tokens.blur.strong,
    border: `1px solid ${tokens.colors.border.glow}`,
    borderRadius: tokens.radius.md,
    boxShadow: `${tokens.shadow.glass}, 0 0 20px rgba(96, 165, 250, 0.15)`,
    color: tokens.colors.text.primary,
    fontSize: tokens.fontSize.sm,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'none' : getAnimationTransform(),
    transition: `opacity 0.15s ease-out, transform 0.15s ease-out`,
  };

  const tooltip = isVisible && createPortal(
    <div
      ref={tooltipRef}
      id={tooltipId}
      role="tooltip"
      className={`adaptive-tooltip ${className}`}
      style={tooltipStyle}
    >
      <div style={getArrowStyle()} />
      {content}
    </div>,
    document.body
  );

  return (
    <>
      {trigger}
      {tooltip}
    </>
  );
});

export default AdaptiveTooltip;
