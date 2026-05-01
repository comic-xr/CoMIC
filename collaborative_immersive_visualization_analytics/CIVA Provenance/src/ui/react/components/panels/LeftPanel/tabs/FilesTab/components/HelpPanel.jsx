/**
 * @file HelpPanel.jsx
 * @description Contextual help floating panel for the Files Tab.
 * Shows help content in 3 tabs: Overview, Filters & Tags, and Shortcuts.
 *
 * @example
 * <HelpPanel isOpen={showHelp} onClose={() => setShowHelp(false)} />
 */

import React, { memo, useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useAdaptive } from '@UI/react/context';
import './HelpPanel.scss';

/**
 * HelpPanel - Contextual help floating card
 */
export const HelpPanel = memo(function HelpPanel({
    isOpen,
    onClose,
    className = '',
}) {
    const { isVR } = useAdaptive();
    const [activeTab, setActiveTab] = useState('overview');

    if (!isOpen) return null;

    const classList = [
        'help-panel',
        isVR && 'help-panel--vr',
        className,
    ].filter(Boolean).join(' ');

    return (
        <>
            {/* Backdrop */}
            <div className="help-panel__backdrop" onClick={onClose} />

            {/* Panel */}
            <div className={classList}>
                {/* Header */}
                <div className="help-panel__header">
                    <Icon name="helpCircle" size={16} className="help-panel__header-icon" />
                    <span className="help-panel__title">Files Help</span>
                    <button
                        type="button"
                        className="help-panel__close"
                        onClick={onClose}
                        aria-label="Close help"
                    >
                        <Icon name="x" size={14} />
                    </button>
                </div>

                {/* Tab bar */}
                <div className="help-panel__tabs">
                    <button
                        type="button"
                        className={`help-panel__tab ${activeTab === 'overview' ? 'help-panel__tab--active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </button>
                    <button
                        type="button"
                        className={`help-panel__tab ${activeTab === 'filters' ? 'help-panel__tab--active' : ''}`}
                        onClick={() => setActiveTab('filters')}
                    >
                        Filters & Tags
                    </button>
                    <button
                        type="button"
                        className={`help-panel__tab ${activeTab === 'shortcuts' ? 'help-panel__tab--active' : ''}`}
                        onClick={() => setActiveTab('shortcuts')}
                    >
                        Shortcuts
                    </button>
                </div>

                {/* Tab content */}
                <div className="help-panel__content">
                    {activeTab === 'overview' && <HelpOverviewContent />}
                    {activeTab === 'filters' && <HelpFiltersContent />}
                    {activeTab === 'shortcuts' && <HelpShortcutsContent />}
                </div>
            </div>
        </>
    );
});

/**
 * Overview tab content
 */
const HelpOverviewContent = () => (
    <div className="help-content">
        <section className="help-content__section">
            <h3 className="help-content__heading">File Organization</h3>
            <ul className="help-content__list">
                <li><strong>Starred</strong> - Quick access to important files</li>
                <li><strong>All Files</strong> - Browse folders and files</li>
                <li><strong>Loaded</strong> - Currently active datasets</li>
            </ul>
        </section>

        <section className="help-content__section">
            <h3 className="help-content__heading">File States</h3>
            <div className="help-content__states">
                <div className="help-content__state">
                    <span className="help-content__state-dot help-content__state-dot--stored" />
                    <span>Stored - Available to load</span>
                </div>
                <div className="help-content__state">
                    <span className="help-content__state-dot help-content__state-dot--loading" />
                    <span>Loading - Being loaded into memory</span>
                </div>
                <div className="help-content__state">
                    <span className="help-content__state-dot help-content__state-dot--loaded" />
                    <span>Loaded - Ready for visualization</span>
                </div>
                <div className="help-content__state">
                    <span className="help-content__state-dot help-content__state-dot--processing" />
                    <span>Processing - Server computation active</span>
                </div>
            </div>
        </section>

        <section className="help-content__section">
            <h3 className="help-content__heading">Quick Actions</h3>
            <ul className="help-content__list">
                <li>Click star icon to star/unstar files</li>
                <li>Hover volumetric files for "Load" button</li>
                <li>Click folders to expand/collapse</li>
                <li>Use breadcrumbs to navigate up</li>
            </ul>
        </section>
    </div>
);

/**
 * Filters & Tags tab content
 */
const HelpFiltersContent = () => (
    <div className="help-content">
        <section className="help-content__section">
            <h3 className="help-content__heading">Category Filters</h3>
            <p className="help-content__text">
                Click category chips to filter by file type. Multiple categories can be selected.
            </p>
            <div className="help-content__chips">
                <span className="help-content__chip help-content__chip--teal">Vol</span>
                <span className="help-content__chip help-content__chip--green">3D</span>
                <span className="help-content__chip help-content__chip--blue">Docs</span>
                <span className="help-content__chip help-content__chip--purple">Img</span>
            </div>
        </section>

        <section className="help-content__section">
            <h3 className="help-content__heading">Tag Filtering</h3>
            <p className="help-content__text">
                Tags use smart AND/OR logic:
            </p>
            <ul className="help-content__list">
                <li><strong>Within category</strong>: OR (Pre-op OR Post-op)</li>
                <li><strong>Between categories</strong>: AND (Pre-op AND Control)</li>
            </ul>
            <div className="help-content__example">
                <strong>Example:</strong> Select "Pre-op" + "Post-op" (Phase) and "Control" (Cohort)
                <br />
                <span className="help-content__example-result">
                    Result: Files that are (Pre-op OR Post-op) AND in Control group
                </span>
            </div>
        </section>

        <section className="help-content__section">
            <h3 className="help-content__heading">Starred Filter Bypass</h3>
            <p className="help-content__text">
                When filters hide starred items, click "Show all" to temporarily bypass
                filters in the Starred section. Changing filters re-applies them.
            </p>
        </section>
    </div>
);

/**
 * Shortcuts tab content
 */
const HelpShortcutsContent = () => (
    <div className="help-content">
        <section className="help-content__section">
            <h3 className="help-content__heading">Keyboard Shortcuts</h3>
            <div className="help-content__shortcuts">
                <div className="help-content__shortcut">
                    <span className="help-content__shortcut-label">Search files</span>
                    <kbd className="help-content__kbd">/</kbd>
                </div>
                <div className="help-content__shortcut">
                    <span className="help-content__shortcut-label">Clear filters</span>
                    <kbd className="help-content__kbd">Esc</kbd>
                </div>
                <div className="help-content__shortcut">
                    <span className="help-content__shortcut-label">Toggle starred section</span>
                    <kbd className="help-content__kbd">S</kbd>
                </div>
                <div className="help-content__shortcut">
                    <span className="help-content__shortcut-label">New folder</span>
                    <kbd className="help-content__kbd">N</kbd>
                </div>
                <div className="help-content__shortcut">
                    <span className="help-content__shortcut-label">Upload files</span>
                    <kbd className="help-content__kbd">U</kbd>
                </div>
            </div>
        </section>

        <section className="help-content__section">
            <h3 className="help-content__heading">Mouse Actions</h3>
            <ul className="help-content__list">
                <li><strong>Right-click</strong> file - Context menu</li>
                <li><strong>Drag</strong> resize handle - Adjust starred height</li>
                <li><strong>Double-click</strong> file - Load or open</li>
            </ul>
        </section>
    </div>
);

export default HelpPanel;
