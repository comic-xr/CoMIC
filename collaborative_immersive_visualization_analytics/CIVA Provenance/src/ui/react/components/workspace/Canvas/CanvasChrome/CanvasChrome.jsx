// src/ui/react/components/workspace/Canvas/CanvasChrome/CanvasChrome.jsx
// CanvasChrome - composite layout for header, edit bar, footers, and info bar.

import React from 'react';
import { CanvasChromeHeader } from './CanvasChromeHeader';
import { CanvasChromeEditBar } from './CanvasChromeEditBar';
import { Footer1InstanceTools } from './Footer1InstanceTools';
import './CanvasChrome.scss';

export function CanvasChrome({
    headerProps,
    editBarProps,
    footer1Props,
    footer2,
    infoBar,
    isEditMode,
    children,
    className = '',
}) {
    const shouldShowEditBar = editBarProps?.isVisible ?? isEditMode ?? false;

    return (
        <div className={`canvas-chrome ${className}`}>
            <CanvasChromeHeader {...headerProps} />
            {shouldShowEditBar && (
                <CanvasChromeEditBar {...editBarProps} />
            )}
            {children && (
                <div className="canvas-chrome__body">
                    {children}
                </div>
            )}
            <Footer1InstanceTools {...footer1Props} />
            {footer2}
            {infoBar}
        </div>
    );
}

export default CanvasChrome;
