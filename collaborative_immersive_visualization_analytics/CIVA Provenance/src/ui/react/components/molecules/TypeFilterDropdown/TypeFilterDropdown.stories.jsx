/**
 * TypeFilterDropdown Stories
 *
 * Categorized multi-select dropdown for type filtering.
 */

import React, { useState, useRef } from 'react';
import { TypeFilterDropdown } from './TypeFilterDropdown';
import { FILES_TYPE_CATEGORIES } from '@UI/react/hooks/useListFilter/filterConfigs';

export default {
  title: 'Molecules/TypeFilterDropdown',
  component: TypeFilterDropdown,
  parameters: {
    layout: 'centered',
  },
};

// Sample type counts
const SAMPLE_COUNTS = {
  nifti: 23,
  dicom: 156,
  minc: 0,
  analyze: 5,
  vtk: 12,
  obj: 8,
  stl: 3,
  gltf: 0,
  ply: 1,
  png: 45,
  jpg: 89,
  tiff: 12,
  webp: 0,
  pdf: 7,
  csv: 15,
  json: 22,
  xml: 4,
};

// Interactive example
export const Default = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState(['nifti', 'dicom']);
  const triggerRef = useRef(null);

  const toggleType = (typeId) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((t) => t !== typeId)
        : [...prev, typeId]
    );
  };

  const selectAll = () => {
    const allTypeIds = FILES_TYPE_CATEGORIES.flatMap((cat) =>
      cat.types.map((t) => t.id)
    );
    setSelectedTypes(allTypeIds);
  };

  const clearAll = () => {
    setSelectedTypes([]);
  };

  return (
    <div style={{ padding: 100 }}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 16px',
          background: selectedTypes.length > 0 ? '#3b82f6' : '#374151',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        Types {selectedTypes.length > 0 && `(${selectedTypes.length})`}
      </button>

      <TypeFilterDropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef}
        categories={FILES_TYPE_CATEGORIES}
        selectedTypes={selectedTypes}
        typeCounts={SAMPLE_COUNTS}
        onToggleType={toggleType}
        onSelectAll={selectAll}
        onClearAll={clearAll}
      />
    </div>
  );
};

// Empty state (no matches)
export const EmptySearch = () => {
  const [isOpen, setIsOpen] = useState(true);
  const triggerRef = useRef(null);

  return (
    <div style={{ padding: 100 }}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 16px',
          background: '#374151',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        Types
      </button>

      <TypeFilterDropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef}
        categories={[]}
        selectedTypes={[]}
        typeCounts={{}}
        onToggleType={() => {}}
        onSelectAll={() => {}}
        onClearAll={() => {}}
      />
    </div>
  );
};

// All types selected
export const AllSelected = () => {
  const [isOpen, setIsOpen] = useState(true);
  const triggerRef = useRef(null);
  const allTypeIds = FILES_TYPE_CATEGORIES.flatMap((cat) =>
    cat.types.map((t) => t.id)
  );
  const [selectedTypes, setSelectedTypes] = useState(allTypeIds);

  const toggleType = (typeId) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((t) => t !== typeId)
        : [...prev, typeId]
    );
  };

  return (
    <div style={{ padding: 100 }}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 16px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        Types ({selectedTypes.length})
      </button>

      <TypeFilterDropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef}
        categories={FILES_TYPE_CATEGORIES}
        selectedTypes={selectedTypes}
        typeCounts={SAMPLE_COUNTS}
        onToggleType={toggleType}
        onSelectAll={() =>
          setSelectedTypes(
            FILES_TYPE_CATEGORIES.flatMap((cat) => cat.types.map((t) => t.id))
          )
        }
        onClearAll={() => setSelectedTypes([])}
      />
    </div>
  );
};
