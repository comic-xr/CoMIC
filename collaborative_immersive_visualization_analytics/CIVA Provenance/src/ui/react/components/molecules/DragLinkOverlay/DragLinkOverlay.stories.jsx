// src/ui/react/components/molecules/DragLinkOverlay/DragLinkOverlay.stories.jsx
// Stories for DragLinkOverlay component

import React, { useState, useEffect } from 'react';
import { DragLinkOverlay } from './DragLinkOverlay';

export default {
    title: 'Molecules/DragLinkOverlay',
    component: DragLinkOverlay,
    parameters: {
        layout: 'fullscreen',
        backgrounds: { default: 'dark' },
    },
};

export const Default = () => {
    const sourceRect = {
        left: 100,
        top: 200,
        width: 100,
        height: 40,
    };

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            {/* Mock source element */}
            <div
                style={{
                    position: 'absolute',
                    left: sourceRect.left,
                    top: sourceRect.top,
                    width: sourceRect.width,
                    height: sourceRect.height,
                    background: 'rgba(45, 212, 191, 0.2)',
                    border: '1px solid #2dd4bf',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2dd4bf',
                    fontSize: '12px',
                }}
            >
                Source
            </div>

            <DragLinkOverlay
                sourceRect={sourceRect}
                currentPosition={{ x: 400, y: 300 }}
                isValidTarget={false}
                targetView={null}
            />
        </div>
    );
};

export const ValidTarget = () => {
    const sourceRect = {
        left: 100,
        top: 200,
        width: 100,
        height: 40,
    };

    const targetView = {
        id: 'v2',
        name: 'Target View',
        color: '#a78bfa',
    };

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            {/* Mock source element */}
            <div
                style={{
                    position: 'absolute',
                    left: sourceRect.left,
                    top: sourceRect.top,
                    width: sourceRect.width,
                    height: sourceRect.height,
                    background: 'rgba(45, 212, 191, 0.2)',
                    border: '1px solid #2dd4bf',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2dd4bf',
                    fontSize: '12px',
                }}
            >
                Source
            </div>

            {/* Mock target element */}
            <div
                style={{
                    position: 'absolute',
                    left: 350,
                    top: 280,
                    width: 100,
                    height: 40,
                    background: 'rgba(167, 139, 250, 0.2)',
                    border: '1px solid #a78bfa',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#a78bfa',
                    fontSize: '12px',
                }}
            >
                Target
            </div>

            <DragLinkOverlay
                sourceRect={sourceRect}
                currentPosition={{ x: 400, y: 300 }}
                isValidTarget={true}
                targetView={targetView}
            />
        </div>
    );
};

export const AnimatedDemo = () => {
    const [position, setPosition] = useState({ x: 200, y: 200 });
    const [isValid, setIsValid] = useState(false);

    const sourceRect = {
        left: 100,
        top: 200,
        width: 100,
        height: 40,
    };

    // Animate cursor position
    useEffect(() => {
        const interval = setInterval(() => {
            setPosition((prev) => ({
                x: 200 + Math.sin(Date.now() / 1000) * 150,
                y: 200 + Math.cos(Date.now() / 1000) * 100,
            }));

            // Toggle valid state periodically
            setIsValid(Math.sin(Date.now() / 500) > 0);
        }, 16);

        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            <div
                style={{
                    position: 'absolute',
                    top: 20,
                    left: 20,
                    padding: '12px',
                    background: 'rgba(0,0,0,0.6)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#fff',
                }}
            >
                Animated demo showing overlay behavior during drag
            </div>

            <div
                style={{
                    position: 'absolute',
                    left: sourceRect.left,
                    top: sourceRect.top,
                    width: sourceRect.width,
                    height: sourceRect.height,
                    background: 'rgba(45, 212, 191, 0.2)',
                    border: '1px solid #2dd4bf',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2dd4bf',
                    fontSize: '12px',
                }}
            >
                Source
            </div>

            <DragLinkOverlay
                sourceRect={sourceRect}
                currentPosition={position}
                isValidTarget={isValid}
                targetView={isValid ? { name: 'Target View', color: '#a78bfa' } : null}
            />
        </div>
    );
};
