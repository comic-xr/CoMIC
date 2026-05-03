/**
 * PropertySelector Stories
 */

import React, { useState } from 'react';
import { PropertySelector } from './PropertySelector';

export default {
    title: 'Molecules/PropertySelector',
    component: PropertySelector,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: 'Grid of linkable property buttons for selecting which property to configure in link management.',
            },
        },
    },
};

// Sample link stats
const sampleStats = {
    camera: { count: 3 },
    filters: { count: 0 },
    colorMaps: { count: 2 },
    widgets: { count: 0 },
    cursors: { count: 1 },
    annotationDisplay: { count: 0 },
};

export const Default = () => {
    const [selected, setSelected] = useState('camera');

    return (
        <div style={{ width: 400, background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
            <PropertySelector
                selectedProperty={selected}
                onSelect={setSelected}
                linkStats={sampleStats}
            />
        </div>
    );
};

export const NoLinks = () => {
    const [selected, setSelected] = useState('camera');

    return (
        <div style={{ width: 400, background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
            <PropertySelector
                selectedProperty={selected}
                onSelect={setSelected}
                linkStats={{}}
            />
        </div>
    );
};

export const AllLinked = () => {
    const [selected, setSelected] = useState('camera');

    const allLinked = {
        camera: { count: 4 },
        filters: { count: 2 },
        colorMaps: { count: 3 },
        widgets: { count: 1 },
        cursors: { count: 2 },
        annotationDisplay: { count: 1 },
    };

    return (
        <div style={{ width: 400, background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
            <PropertySelector
                selectedProperty={selected}
                onSelect={setSelected}
                linkStats={allLinked}
            />
        </div>
    );
};
