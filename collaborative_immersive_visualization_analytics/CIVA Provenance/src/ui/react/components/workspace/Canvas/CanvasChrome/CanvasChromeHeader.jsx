// src/ui/react/components/workspace/Canvas/CanvasChrome/CanvasChromeHeader.jsx
// CanvasChromeHeader - header bar for workspace/viewgroup/navigation controls.

import React, { memo, useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { DropdownPortal } from '@UI/react/components/atoms/DropdownPortal';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { ModeToggle } from '@UI/react/components/organisms/WorkspaceBar';
import { CREATE_OPTIONS } from '@UI/react/components/organisms/CanvasTabsBar/CanvasTabsBar.logic';
import { formatGridPosition } from '@UI/react/utils/gridPosition';
import './CanvasChromeHeader.scss';

const normalizeItems = (items = []) => items.map((item) => {
    if (typeof item === 'string') {
        return { id: item, name: item };
    }
    return item;
});

const DropdownList = memo(function DropdownList({
    open,
    onClose,
    triggerRef,
    items,
    renderItem,
    header,
    footer,
    className = '',
}) {
    if (!open) return null;

    return (
        <DropdownPortal
            open={open}
            onClose={onClose}
            triggerRef={triggerRef}
            align="start"
            position="bottom"
            className={`canvas-chrome-header__dropdown ${className}`}
        >
            <div className="canvas-chrome-header__dropdown-inner">
                {header}
                {items.map(renderItem)}
                {footer}
            </div>
        </DropdownPortal>
    );
});

const HeaderSection = memo(function HeaderSection({ label, color, children, className = '' }) {
    const colorClass = color ? `canvas-chrome-header__label--${color}` : '';
    return (
        <div className={`canvas-chrome-header__section ${className}`}>
            <div className={`canvas-chrome-header__label ${colorClass}`}>{label}</div>
            <div className="canvas-chrome-header__content">{children}</div>
        </div>
    );
});

export const CanvasChromeHeader = memo(function CanvasChromeHeader({
    // Navigation
    canGoBack = false,
    onGoBack,
    onGoHome,

    // Workspace
    workspace,
    workspaces = [],
    onWorkspaceChange,
    allowWorkspaceSwitch = true,
    onOpenCreateWorkspace,

    // ViewGroup
    viewGroup,
    viewGroups = [],
    onViewGroupChange,
    isViewGroupLinked = false,
    onEditViewGroup,
    onOpenViewGroupManager,

    // Edit mode
    isEditMode = false,
    onToggleEditMode,

    // Flow
    flowDirection = 'right',
    onFlowDirectionChange,

    // Display options
    showCoordinates = false,
    showViewGroupBorders = false,
    onToggleCoordinates,
    onToggleViewGroupBorders,

    // Mode toggle (tile vs tabs)
    workspaceViewMode = 'tile',
    onWorkspaceViewModeChange,

    // Navigator
    canvasSize = { cols: 1, rows: 1 },
    viewportSize = { cols: 1, rows: 1 },
    viewportPosition = { col: 0, row: 0 },
    onMoveViewport,
    onHome,
    onOpenNavigator,

    // Window mode
    windowMode = 'docked',
    onWindowModeChange,
    onCloseWorkspace,
    showWindowControls = true,

    className = '',
}) {
    const [workspaceOpen, setWorkspaceOpen] = useState(false);
    const [viewGroupOpen, setViewGroupOpen] = useState(false);
    const [displayOpen, setDisplayOpen] = useState(false);
    const [workspaceQuery, setWorkspaceQuery] = useState('');
    const [viewGroupQuery, setViewGroupQuery] = useState('');
    const [viewGroupSort, setViewGroupSort] = useState('name-asc');
    const [viewGroupFilter, setViewGroupFilter] = useState('all');
    const [viewGroupTag, setViewGroupTag] = useState(null);
    const [workspaceSort, setWorkspaceSort] = useState('name-asc');
    const [workspaceFilter, setWorkspaceFilter] = useState('all');
    const [workspaceTag, setWorkspaceTag] = useState(null);
    const [headerOverflowOpen, setHeaderOverflowOpen] = useState(false);
    const overflowTriggerRef = useRef(null);
    const workspaceTriggerRef = useRef(null);
    const viewGroupTriggerRef = useRef(null);
    const displayTriggerRef = useRef(null);
    const headerRef = useRef(null);
    const [headerWidth, setHeaderWidth] = useState(0);

    useEffect(() => {
        if (!headerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setHeaderWidth(entry.contentRect.width);
            }
        });
        observer.observe(headerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!allowWorkspaceSwitch && workspaceOpen) {
            setWorkspaceOpen(false);
        }
    }, [allowWorkspaceSwitch, workspaceOpen]);

    useEffect(() => {
        if (hideDisplayGroup && displayOpen) {
            setDisplayOpen(false);
        }
    }, [displayOpen, hideDisplayGroup]);

    const workspaceItems = useMemo(() => normalizeItems(workspaces), [workspaces]);
    const viewGroupItems = useMemo(() => normalizeItems(viewGroups), [viewGroups]);
    const workspaceLabel = workspace?.name || (typeof workspace === 'string' ? workspace : 'Workspace');
    const workspaceId = workspace?.id || (typeof workspace === 'string' ? workspace : null);
    const viewGroupLabel = viewGroup?.name || (typeof viewGroup === 'string' ? viewGroup : 'All ViewGroups');
    const viewGroupId = viewGroup?.id || (typeof viewGroup === 'string' ? viewGroup : null);

    const activeDisplayCount = Number(showCoordinates) + Number(showViewGroupBorders);
    const effectiveWidth = headerWidth || window.innerWidth || 0;
    const showNames = effectiveWidth >= 500;
    const hideEditGroup = effectiveWidth < 980;
    const hideDisplayGroup = effectiveWidth < 900;
    const overflowCount = Number(hideEditGroup) + Number(hideDisplayGroup);
    const workspaceNameMax = Math.max(40, Math.min(140, (effectiveWidth - 400) * 0.2));
    const viewGroupNameMax = Math.max(40, Math.min(120, (effectiveWidth - 400) * 0.15));

    const viewGroupTags = useMemo(() => {
        const tags = new Set();
        viewGroupItems.forEach((item) => {
            if (Array.isArray(item.tags)) {
                item.tags.forEach((tag) => tags.add(tag));
            }
        });
        return Array.from(tags);
    }, [viewGroupItems]);

    const workspaceTags = useMemo(() => {
        const tags = new Set();
        workspaceItems.forEach((item) => {
            if (Array.isArray(item.tags)) {
                item.tags.forEach((tag) => tags.add(tag));
            }
        });
        return Array.from(tags);
    }, [workspaceItems]);

    const filteredWorkspaces = useMemo(() => {
        const query = workspaceQuery.trim().toLowerCase();
        const hasQuery = Boolean(query);
        const matchesFilter = (item) => {
            if (workspaceFilter === 'all') return true;
            return item.type === workspaceFilter;
        };

        let items = workspaceItems.filter((item) => {
            if (hasQuery && !(item.name || '').toLowerCase().includes(query)) return false;
            if (!matchesFilter(item)) return false;
            if (workspaceTag && (!Array.isArray(item.tags) || !item.tags.includes(workspaceTag))) return false;
            return true;
        });

        const sorters = {
            'name-asc': (a, b) => (a.name || '').localeCompare(b.name || ''),
            'name-desc': (a, b) => (b.name || '').localeCompare(a.name || ''),
            'recent': (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
        };

        const sorter = sorters[workspaceSort] || sorters['name-asc'];
        return items.slice().sort(sorter);
    }, [workspaceItems, workspaceQuery, workspaceFilter, workspaceSort, workspaceTag]);

    const filteredViewGroups = useMemo(() => {
        const query = viewGroupQuery.trim().toLowerCase();
        const hasQuery = Boolean(query);
        const isLinked = (item) => Boolean(item.linkedTo || item.isLinked);
        const hasTags = (item) => Array.isArray(item.tags) && item.tags.length > 0;

        let items = viewGroupItems.filter((item) => {
            if (hasQuery && !(item.name || '').toLowerCase().includes(query)) return false;
            if (viewGroupFilter === 'linked' && !isLinked(item)) return false;
            if (viewGroupFilter === 'unlinked' && isLinked(item)) return false;
            if (viewGroupFilter === 'tagged' && !hasTags(item)) return false;
            if (viewGroupTag && (!Array.isArray(item.tags) || !item.tags.includes(viewGroupTag))) return false;
            return true;
        });

        const sorters = {
            'name-asc': (a, b) => (a.name || '').localeCompare(b.name || ''),
            'name-desc': (a, b) => (b.name || '').localeCompare(a.name || ''),
            'views-desc': (a, b) => (b.views?.length || 0) - (a.views?.length || 0),
            'views-asc': (a, b) => (a.views?.length || 0) - (b.views?.length || 0),
            'linked-first': (a, b) => Number(isLinked(b)) - Number(isLinked(a)),
        };

        const sorter = sorters[viewGroupSort] || sorters['name-asc'];
        return items.slice().sort(sorter);
    }, [viewGroupItems, viewGroupQuery, viewGroupFilter, viewGroupSort, viewGroupTag]);

    const handleCloseWorkspace = useCallback(() => {
        setWorkspaceOpen(false);
        setWorkspaceQuery('');
        setWorkspaceTag(null);
    }, []);

    const handleCloseViewGroups = useCallback(() => {
        setViewGroupOpen(false);
        setViewGroupQuery('');
        setViewGroupTag(null);
    }, []);

    const showNavigator = Boolean(onMoveViewport || onHome || onOpenNavigator);
    const showModeToggle = Boolean(onWorkspaceViewModeChange) && workspaceViewMode === 'tile';

    const viewportLabel = useMemo(() => {
        return formatGridPosition(viewportPosition?.col || 0, viewportPosition?.row || 0);
    }, [viewportPosition?.col, viewportPosition?.row]);

    const rows = Math.max(canvasSize?.rows || 1, 1);
    const cols = Math.max(canvasSize?.cols || 1, 1);
    const viewportRows = Math.max(viewportSize?.rows || 1, 1);
    const viewportCols = Math.max(viewportSize?.cols || 1, 1);
    const viewportRow = Math.max(viewportPosition?.row || 0, 0);
    const viewportCol = Math.max(viewportPosition?.col || 0, 0);

    const canMoveUp = viewportRow > 0;
    const canMoveDown = viewportRow + viewportRows < rows;
    const canMoveLeft = viewportCol > 0;
    const canMoveRight = viewportCol + viewportCols < cols;

    const renderMiniGrid = () => {
        const maxPreviewRows = 4;
        const maxPreviewCols = 6;
        const previewRows = Math.min(rows, maxPreviewRows);
        const previewCols = Math.min(cols, maxPreviewCols);
        const rowOffset = Math.floor((maxPreviewRows - previewRows) / 2);
        const colOffset = Math.floor((maxPreviewCols - previewCols) / 2);
        const rowScale = previewRows / rows;
        const colScale = previewCols / cols;
        const viewRowSpan = Math.min(previewRows, Math.max(1, Math.round(viewportRows * rowScale)));
        const viewColSpan = Math.min(previewCols, Math.max(1, Math.round(viewportCols * colScale)));
        const maxRowTravel = Math.max(0, rows - viewportRows);
        const maxColTravel = Math.max(0, cols - viewportCols);
        const maxPreviewRow = Math.max(0, previewRows - viewRowSpan);
        const maxPreviewCol = Math.max(0, previewCols - viewColSpan);
        const viewRowStart = maxRowTravel === 0 ? 0 : Math.round((viewportRow / maxRowTravel) * maxPreviewRow);
        const viewColStart = maxColTravel === 0 ? 0 : Math.round((viewportCol / maxColTravel) * maxPreviewCol);
        const viewRowEnd = Math.min(previewRows, viewRowStart + viewRowSpan);
        const viewColEnd = Math.min(previewCols, viewColStart + viewColSpan);
        const hasOverflow = rows > maxPreviewRows || cols > maxPreviewCols;

        const cells = [];
        for (let r = 0; r < maxPreviewRows; r += 1) {
            for (let c = 0; c < maxPreviewCols; c += 1) {
                const localRow = r - rowOffset;
                const localCol = c - colOffset;
                const isWithinGrid =
                    localRow >= 0 &&
                    localRow < previewRows &&
                    localCol >= 0 &&
                    localCol < previewCols;
                const isInViewport =
                    isWithinGrid &&
                    localRow >= viewRowStart &&
                    localRow < viewRowEnd &&
                    localCol >= viewColStart &&
                    localCol < viewColEnd;
                cells.push(
                    <span
                        key={`${r}-${c}`}
                        className={`canvas-chrome-header__mini-cell ${isWithinGrid ? 'is-visible' : 'is-empty'} ${isInViewport ? 'is-viewport' : ''}`}
                    />
                );
            }
        }

        return (
            <button
                type="button"
                className="canvas-chrome-header__mini-grid"
                style={{ '--grid-cols': maxPreviewCols }}
                onClick={onOpenNavigator}
                title="Open Navigator"
            >
                {cells}
                {hasOverflow && (
                    <span className="canvas-chrome-header__mini-more" title="Grid larger than preview">
                        +
                    </span>
                )}
            </button>
        );
    };

    return (
        <header ref={headerRef} className={`canvas-chrome-header ${className}`}>
            <div className="canvas-chrome-header__left">
                <HeaderSection label="Workspace" color="teal" className="canvas-chrome-header__section--workspace">
                    <div className="canvas-chrome-header__group">
                        <div className="canvas-chrome-header__nav-group">
                            <button
                                type="button"
                                className="canvas-chrome-header__icon-btn"
                                onClick={onGoBack}
                                disabled={!canGoBack}
                                title="Back"
                                aria-label="Back"
                            >
                                <Icon name="arrowLeft" size={14} />
                            </button>
                        </div>

                        <div className="canvas-chrome-header__selector-group">
                            <button
                                ref={workspaceTriggerRef}
                                type="button"
                                className={`canvas-chrome-header__selector canvas-chrome-header__selector--workspace${allowWorkspaceSwitch ? '' : ' canvas-chrome-header__selector--static'}`}
                                onClick={
                                    allowWorkspaceSwitch
                                        ? () => setWorkspaceOpen((prev) => !prev)
                                        : undefined
                                }
                                aria-expanded={allowWorkspaceSwitch ? workspaceOpen : undefined}
                                aria-haspopup={allowWorkspaceSwitch ? 'listbox' : undefined}
                                aria-disabled={!allowWorkspaceSwitch}
                                disabled={!allowWorkspaceSwitch}
                            >
                                <Icon name="grid" size={14} />
                                {showNames && (
                                    <span
                                        className="canvas-chrome-header__selector-name"
                                        style={{ maxWidth: `${workspaceNameMax}px` }}
                                    >
                                        {workspaceLabel}
                                    </span>
                                )}
                                {allowWorkspaceSwitch ? <Icon name="chevronDown" size={12} /> : null}
                            </button>

                            <Icon name="chevronRight" size={12} className="canvas-chrome-header__chevron" />

                            <button
                                ref={viewGroupTriggerRef}
                                type="button"
                                className="canvas-chrome-header__selector canvas-chrome-header__selector--viewgroup"
                                onClick={() => setViewGroupOpen((prev) => !prev)}
                                aria-expanded={viewGroupOpen}
                                aria-haspopup="listbox"
                            >
                                {viewGroup ? (
                                    <>
                                        <span
                                            className="canvas-chrome-header__dot"
                                            style={{ background: viewGroup.color || 'var(--color-accent-purple)' }}
                                        />
                                        {showNames && (
                                            <span
                                                className="canvas-chrome-header__selector-name"
                                                style={{ maxWidth: `${viewGroupNameMax}px` }}
                                            >
                                                {viewGroupLabel}
                                            </span>
                                        )}
                                        {isViewGroupLinked && (
                                            <Icon name="link" size={12} className="canvas-chrome-header__link" />
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <Icon name="grid3x3" size={12} />
                                        {showNames && (
                                            <span
                                                className="canvas-chrome-header__selector-name"
                                                style={{ maxWidth: `${viewGroupNameMax}px` }}
                                            >
                                                All ViewGroups
                                            </span>
                                        )}
                                    </>
                                )}
                                <Icon name="chevronDown" size={12} />
                            </button>
                        </div>
                    </div>
                </HeaderSection>
            </div>

            <div className="canvas-chrome-header__center">
                {!hideEditGroup && (
                    <HeaderSection label="Edit" color="amber">
                        <div className="canvas-chrome-header__group">
                            <div className="canvas-chrome-header__edit">
                                <button
                                    type="button"
                                    className={`canvas-chrome-header__pill-btn ${isEditMode ? 'is-active' : ''}`}
                                    onClick={() => onToggleEditMode?.(!isEditMode)}
                                    aria-pressed={isEditMode}
                                >
                                    <Icon name="pencil" size={12} />
                                    <span>Edit</span>
                                </button>
                            </div>

                            <div className="canvas-chrome-header__flow">
                                <div className="canvas-chrome-header__button-group">
                                    <button
                                        type="button"
                                        className={`canvas-chrome-header__icon-btn ${flowDirection === 'right' ? 'is-active' : ''}`}
                                        onClick={() => onFlowDirectionChange?.('right')}
                                        title="Flow Right"
                                        aria-pressed={flowDirection === 'right'}
                                    >
                                        <Icon name="arrowRight" size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        className={`canvas-chrome-header__icon-btn ${flowDirection === 'down' ? 'is-active' : ''}`}
                                        onClick={() => onFlowDirectionChange?.('down')}
                                        title="Flow Down"
                                        aria-pressed={flowDirection === 'down'}
                                    >
                                        <Icon name="arrowDown" size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </HeaderSection>
                )}
            </div>

            <div className="canvas-chrome-header__right">
                {showNavigator && (
                    <HeaderSection label="Navigator" color="teal">
                        <div className="canvas-chrome-header__group canvas-chrome-header__group--navigator">
                            {renderMiniGrid()}
                            <button
                                type="button"
                                className="canvas-chrome-header__icon-btn"
                                title="Home (A1)"
                                aria-label="Home"
                                onClick={onHome}
                                disabled={!onHome}
                            >
                                <Icon name="home" size={14} />
                            </button>
                            <div className="canvas-chrome-header__nav-buttons">
                                <button
                                    type="button"
                                    className="canvas-chrome-header__icon-btn"
                                    title="Move Left"
                                    disabled={!canMoveLeft}
                                    onClick={() => onMoveViewport?.(0, -1)}
                                >
                                    <Icon name="arrowLeft" size={14} />
                                </button>
                                <button
                                    type="button"
                                    className="canvas-chrome-header__icon-btn"
                                    title="Move Up"
                                    disabled={!canMoveUp}
                                    onClick={() => onMoveViewport?.(-1, 0)}
                                >
                                    <Icon name="arrowUp" size={14} />
                                </button>
                                <button
                                    type="button"
                                    className="canvas-chrome-header__icon-btn"
                                    title="Move Down"
                                    disabled={!canMoveDown}
                                    onClick={() => onMoveViewport?.(1, 0)}
                                >
                                    <Icon name="arrowDown" size={14} />
                                </button>
                                <button
                                    type="button"
                                    className="canvas-chrome-header__icon-btn"
                                    title="Move Right"
                                    disabled={!canMoveRight}
                                    onClick={() => onMoveViewport?.(0, 1)}
                                >
                                    <Icon name="arrowRight" size={14} />
                                </button>
                            </div>
                            <span className="canvas-chrome-header__position">{viewportLabel}</span>
                        </div>
                    </HeaderSection>
                )}

                {showModeToggle && (
                    <HeaderSection label="Mode" color="cyan">
                        <div className="canvas-chrome-header__group">
                            <ModeToggle
                                canvasMode={workspaceViewMode}
                                onModeChange={onWorkspaceViewModeChange}
                            />
                        </div>
                    </HeaderSection>
                )}

                {!hideDisplayGroup && (
                    <HeaderSection label="Display" color="blue">
                        <div className="canvas-chrome-header__group">
                            <button
                                ref={displayTriggerRef}
                                type="button"
                                className="canvas-chrome-header__icon-btn canvas-chrome-header__icon-btn--dropdown"
                                onClick={() => setDisplayOpen((prev) => !prev)}
                                aria-expanded={displayOpen}
                                aria-haspopup="menu"
                                title="Display options"
                            >
                                <Icon name="grid" size={14} />
                                {activeDisplayCount > 0 && (
                                    <span className="canvas-chrome-header__badge">{activeDisplayCount}</span>
                                )}
                                <Icon name="chevronDown" size={12} />
                            </button>
                        </div>
                    </HeaderSection>
                )}

                {overflowCount > 0 && (
                    <HeaderSection label="More" color="teal">
                        <div className="canvas-chrome-header__group">
                            <button
                                ref={overflowTriggerRef}
                                type="button"
                                className="canvas-chrome-header__more-btn"
                                onClick={() => setHeaderOverflowOpen((prev) => !prev)}
                                aria-expanded={headerOverflowOpen}
                            >
                                <Icon name="moreHorizontal" size={14} />
                                <span className="canvas-chrome-header__more-count">+{overflowCount}</span>
                            </button>
                        </div>
                    </HeaderSection>
                )}

                <HeaderSection label="Canvas" color="purple">
                    <div className="canvas-chrome-header__group">
                        {showWindowControls ? (
                            <div className="canvas-chrome-header__button-group">
                                <button
                                    type="button"
                                    className={`canvas-chrome-header__icon-btn ${windowMode === 'docked' ? 'is-active' : ''}`}
                                    onClick={() => onWindowModeChange?.('docked')}
                                    title="Docked"
                                    aria-pressed={windowMode === 'docked'}
                                >
                                    <Icon name="dock" size={14} />
                                </button>
                                <button
                                    type="button"
                                    className={`canvas-chrome-header__icon-btn ${windowMode === 'floating' ? 'is-active' : ''}`}
                                    onClick={() => onWindowModeChange?.('floating')}
                                    title="Floating"
                                    aria-pressed={windowMode === 'floating'}
                                >
                                    <Icon name="windowRestore" size={14} />
                                </button>
                            </div>
                        ) : null}
                        <button
                            type="button"
                            className="canvas-chrome-header__icon-btn canvas-chrome-header__icon-btn--danger"
                            onClick={() => onCloseWorkspace?.()}
                            title="Close canvas"
                            disabled={!onCloseWorkspace}
                        >
                            <Icon name="x" size={14} />
                        </button>
                    </div>
                </HeaderSection>
            </div>

            {/* Workspace dropdown */}
            <DropdownList
                open={workspaceOpen}
                onClose={handleCloseWorkspace}
                triggerRef={workspaceTriggerRef}
                items={filteredWorkspaces}
                header={(
                    <>
                        <SearchInput
                            className="canvas-chrome-header__dropdown-search"
                            value={workspaceQuery}
                            onChange={setWorkspaceQuery}
                            placeholder="Search workspaces..."
                            size="sm"
                            autoFocus
                        />
                        <div className="canvas-chrome-header__dropdown-controls">
                            <div className="canvas-chrome-header__filter-row">
                                {['all', 'project', 'breakout', 'personal'].map((filter) => (
                                    <button
                                        key={filter}
                                        type="button"
                                        className={`canvas-chrome-header__filter-chip ${workspaceFilter === filter ? 'is-active' : ''}`}
                                        onClick={() => setWorkspaceFilter(filter)}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                            {workspaceTags.length > 0 && (
                                <div className="canvas-chrome-header__tag-row">
                                    {workspaceTags.map((tag) => (
                                        <button
                                            key={tag}
                                            type="button"
                                            className={`canvas-chrome-header__tag-chip ${workspaceTag === tag ? 'is-active' : ''}`}
                                            onClick={() => setWorkspaceTag(workspaceTag === tag ? null : tag)}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <label className="canvas-chrome-header__sort">
                                <span>Sort</span>
                                <select value={workspaceSort} onChange={(e) => setWorkspaceSort(e.target.value)}>
                                    <option value="name-asc">Name A–Z</option>
                                    <option value="name-desc">Name Z–A</option>
                                    <option value="recent">Recently updated</option>
                                </select>
                            </label>
                        </div>
                        <div className="canvas-chrome-header__dropdown-divider" />
                    </>
                )}
                renderItem={(item) => (
                    <button
                        key={item.id}
                        className={`canvas-chrome-header__dropdown-item ${workspaceId === item.id ? 'is-active' : ''}`}
                        onClick={() => {
                            onWorkspaceChange?.(item);
                            handleCloseWorkspace();
                        }}
                    >
                        <Icon name="grid" size={12} />
                        <span>{item.name}</span>
                    </button>
                )}
                footer={onOpenCreateWorkspace ? (
                    <div className="canvas-chrome-header__dropdown-footer">
                        {workspaceViewMode === 'tile' ? (
                            <>
                                <div className="canvas-chrome-header__dropdown-subtitle">Create</div>
                                {CREATE_OPTIONS.map((option) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        className="canvas-chrome-header__dropdown-item canvas-chrome-header__dropdown-item--create"
                                        onClick={() => {
                                            onOpenCreateWorkspace?.(option.id);
                                            handleCloseWorkspace();
                                        }}
                                    >
                                        <Icon name={option.icon} size={12} />
                                        <span className="canvas-chrome-header__dropdown-main">
                                            <span className="canvas-chrome-header__dropdown-text">{option.label}</span>
                                            <span className="canvas-chrome-header__dropdown-desc">{option.description}</span>
                                        </span>
                                    </button>
                                ))}
                            </>
                        ) : (
                            <button
                                type="button"
                                className="canvas-chrome-header__dropdown-item canvas-chrome-header__dropdown-item--footer"
                                onClick={() => {
                                    onOpenCreateWorkspace?.('empty');
                                    handleCloseWorkspace();
                                }}
                            >
                                <Icon name="plus" size={12} />
                                <span className="canvas-chrome-header__dropdown-text">Create Workspace</span>
                            </button>
                        )}
                    </div>
                ) : null}
            />

            {/* ViewGroup dropdown */}
            <DropdownList
                open={viewGroupOpen}
                onClose={handleCloseViewGroups}
                triggerRef={viewGroupTriggerRef}
                items={filteredViewGroups}
                header={(
                    <>
                        <SearchInput
                            className="canvas-chrome-header__dropdown-search"
                            value={viewGroupQuery}
                            onChange={setViewGroupQuery}
                            placeholder="Search view groups..."
                            size="sm"
                            autoFocus
                        />
                        <div className="canvas-chrome-header__dropdown-controls">
                            <div className="canvas-chrome-header__filter-row">
                                {['all', 'linked', 'unlinked', 'tagged'].map((filter) => (
                                    <button
                                        key={filter}
                                        type="button"
                                        className={`canvas-chrome-header__filter-chip ${viewGroupFilter === filter ? 'is-active' : ''}`}
                                        onClick={() => setViewGroupFilter(filter)}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                            {viewGroupTags.length > 0 && (
                                <div className="canvas-chrome-header__tag-row">
                                    {viewGroupTags.map((tag) => (
                                        <button
                                            key={tag}
                                            type="button"
                                            className={`canvas-chrome-header__tag-chip ${viewGroupTag === tag ? 'is-active' : ''}`}
                                            onClick={() => setViewGroupTag(viewGroupTag === tag ? null : tag)}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <label className="canvas-chrome-header__sort">
                                <span>Sort</span>
                                <select value={viewGroupSort} onChange={(e) => setViewGroupSort(e.target.value)}>
                                    <option value="name-asc">Name A–Z</option>
                                    <option value="name-desc">Name Z–A</option>
                                    <option value="views-desc">Views high→low</option>
                                    <option value="views-asc">Views low→high</option>
                                    <option value="linked-first">Linked first</option>
                                </select>
                            </label>
                        </div>
                        <button
                            type="button"
                            className={`canvas-chrome-header__dropdown-item ${!viewGroupId ? 'is-active' : ''}`}
                            onClick={() => {
                                onViewGroupChange?.(null);
                                handleCloseViewGroups();
                            }}
                        >
                            <Icon name="grid3x3" size={12} />
                            <span className="canvas-chrome-header__dropdown-text">All ViewGroups</span>
                        </button>
                        <div className="canvas-chrome-header__dropdown-divider" />
                    </>
                )}
                renderItem={(item) => (
                    <div
                        key={item.id}
                        role="menuitem"
                        tabIndex={0}
                        className={`canvas-chrome-header__dropdown-item canvas-chrome-header__dropdown-item--selectable ${viewGroupId === item.id ? 'is-active' : ''}`}
                        onClick={() => {
                            onViewGroupChange?.(item);
                            handleCloseViewGroups();
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                onViewGroupChange?.(item);
                                handleCloseViewGroups();
                            }
                        }}
                    >
                        <span
                            className="canvas-chrome-header__dot"
                            style={{ background: item.color || 'var(--color-accent-purple)' }}
                        />
                        <div className="canvas-chrome-header__dropdown-main">
                            <span className="canvas-chrome-header__dropdown-text">{item.name}</span>
                            <div className="canvas-chrome-header__dropdown-meta">
                                {typeof item.views?.length === 'number' && (
                                    <span className="canvas-chrome-header__dropdown-count">
                                        {item.views.length} views
                                    </span>
                                )}
                                {Array.isArray(item.tags) && item.tags.length > 0 && (
                                    <div className="canvas-chrome-header__dropdown-tags">
                                        {item.tags.slice(0, 2).map((tag) => (
                                            <span key={tag} className="canvas-chrome-header__dropdown-tag">{tag}</span>
                                        ))}
                                        {item.tags.length > 2 && (
                                            <span className="canvas-chrome-header__dropdown-tag">+{item.tags.length - 2}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        {item.linkedTo && (
                            <Icon name="link" size={12} className="canvas-chrome-header__link" />
                        )}
                        {onEditViewGroup && (
                            <button
                                type="button"
                                className="canvas-chrome-header__edit-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEditViewGroup?.(item);
                                    handleCloseViewGroups();
                                }}
                                title="Edit ViewGroup"
                            >
                                <Icon name="settings" size={12} />
                            </button>
                        )}
                    </div>
                )}
                footer={onOpenViewGroupManager ? (
                    <button
                        type="button"
                        className="canvas-chrome-header__dropdown-item canvas-chrome-header__dropdown-item--footer"
                        onClick={() => {
                            onOpenViewGroupManager?.();
                            handleCloseViewGroups();
                        }}
                    >
                        <Icon name="layout" size={12} />
                        <span className="canvas-chrome-header__dropdown-text">Manage ViewGroups</span>
                    </button>
                ) : null}
            />

            {/* Display options dropdown */}
            <DropdownList
                open={displayOpen}
                onClose={() => setDisplayOpen(false)}
                triggerRef={displayTriggerRef}
                items={[
                    { id: 'coordinates', label: 'Grid Coordinates', value: showCoordinates, onToggle: onToggleCoordinates },
                    { id: 'borders', label: 'ViewGroup Borders', value: showViewGroupBorders, onToggle: onToggleViewGroupBorders },
                ]}
                renderItem={(item) => (
                    <label key={item.id} className="canvas-chrome-header__dropdown-item canvas-chrome-header__dropdown-item--toggle canvas-chrome-header__toggle">
                        <input
                            type="checkbox"
                            checked={item.value}
                            onChange={() => item.onToggle?.(!item.value)}
                            className="canvas-chrome-header__toggle-input"
                        />
                        <span className="canvas-chrome-header__toggle-track">
                            <span className="canvas-chrome-header__toggle-thumb" />
                        </span>
                        <span className="canvas-chrome-header__toggle-label">{item.label}</span>
                    </label>
                )}
            />

            <DropdownPortal
                open={overflowCount > 0 && headerOverflowOpen}
                onClose={() => setHeaderOverflowOpen(false)}
                triggerRef={overflowTriggerRef}
                align="end"
                position="bottom"
                className="canvas-chrome-header__overflow"
            >
                <div className="canvas-chrome-header__overflow-panel">
                    {hideEditGroup && (
                        <div className="canvas-chrome-header__overflow-section">
                            <div className="canvas-chrome-header__label canvas-chrome-header__label--amber">Edit</div>
                            <div className="canvas-chrome-header__overflow-content">
                                <button
                                    type="button"
                                    className={`canvas-chrome-header__pill-btn ${isEditMode ? 'is-active' : ''}`}
                                    onClick={() => onToggleEditMode?.(!isEditMode)}
                                    aria-pressed={isEditMode}
                                >
                                    <Icon name="pencil" size={12} />
                                    <span>Edit</span>
                                </button>
                                <div className="canvas-chrome-header__button-group">
                                    <button
                                        type="button"
                                        className={`canvas-chrome-header__icon-btn ${flowDirection === 'right' ? 'is-active' : ''}`}
                                        onClick={() => onFlowDirectionChange?.('right')}
                                        title="Flow Right"
                                        aria-pressed={flowDirection === 'right'}
                                    >
                                        <Icon name="arrowRight" size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        className={`canvas-chrome-header__icon-btn ${flowDirection === 'down' ? 'is-active' : ''}`}
                                        onClick={() => onFlowDirectionChange?.('down')}
                                        title="Flow Down"
                                        aria-pressed={flowDirection === 'down'}
                                    >
                                        <Icon name="arrowDown" size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {hideDisplayGroup && (
                        <div className="canvas-chrome-header__overflow-section">
                            <div className="canvas-chrome-header__label canvas-chrome-header__label--blue">Display</div>
                            <div className="canvas-chrome-header__overflow-content canvas-chrome-header__overflow-content--display">
                                <label className="canvas-chrome-header__overflow-toggle canvas-chrome-header__toggle">
                                    <input
                                        type="checkbox"
                                        checked={showCoordinates}
                                        onChange={() => onToggleCoordinates?.(!showCoordinates)}
                                        className="canvas-chrome-header__toggle-input"
                                    />
                                    <span className="canvas-chrome-header__toggle-track">
                                        <span className="canvas-chrome-header__toggle-thumb" />
                                    </span>
                                    <span className="canvas-chrome-header__toggle-label">Grid Coordinates</span>
                                </label>
                                <label className="canvas-chrome-header__overflow-toggle canvas-chrome-header__toggle">
                                    <input
                                        type="checkbox"
                                        checked={showViewGroupBorders}
                                        onChange={() => onToggleViewGroupBorders?.(!showViewGroupBorders)}
                                        className="canvas-chrome-header__toggle-input"
                                    />
                                    <span className="canvas-chrome-header__toggle-track">
                                        <span className="canvas-chrome-header__toggle-thumb" />
                                    </span>
                                    <span className="canvas-chrome-header__toggle-label">ViewGroup Borders</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            </DropdownPortal>
        </header>
    );
});

export default CanvasChromeHeader;
