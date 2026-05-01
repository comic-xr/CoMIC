/**
 * @file DotNavigation.jsx
 * @description Dot-based section navigation with scroll tracking
 */

import React, { memo } from 'react';
import './DotNavigation.scss';

/**
 * DotNavigation - Visual navigation dots that track active section
 */
export const DotNavigation = memo(function DotNavigation({
  sections,
  activeSection,
  onNavigate,
}) {
  return (
    <div className="dot-navigation">
      {sections.map(section => {
        const isActive = activeSection === section.id;
        return (
          <button
            key={section.id}
            className={`dot-navigation__dot ${isActive ? 'dot-navigation__dot--active' : ''}`}
            data-color={section.color}
            onClick={() => onNavigate(section.id)}
            title={section.label}
          />
        );
      })}
    </div>
  );
});

export default DotNavigation;
