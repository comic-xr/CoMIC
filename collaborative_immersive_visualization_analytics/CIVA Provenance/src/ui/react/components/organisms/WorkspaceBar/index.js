/**
 * WorkspaceBar (Canvas Tabs Bar)
 * Workspace-level bar with tabs, mode toggle, popout manager, and breakout manager.
 * Layout: WORKSPACE | MODE | POPOUTS | BREAKOUTS
 */

export { WorkspaceBar } from './WorkspaceBar';
export { default } from './WorkspaceBar';

// Sub-components
export { WorkspaceTab } from './WorkspaceTab';
export { ModeToggle } from './ModeToggle';
export { PopoutManager } from './PopoutManager';
export { BreakoutManager } from './BreakoutManager';

// Logic exports
export {
    useWorkspaceBar,
    useManagerDropdowns,
} from './WorkspaceBar.logic';
