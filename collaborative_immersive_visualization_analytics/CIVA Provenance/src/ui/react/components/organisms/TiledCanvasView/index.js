/**
 * @file index.js
 * @description Barrel exports for TiledCanvasView components
 */

export { TiledCanvasView, CanvasPanel, default } from './TiledCanvasView';
export { MiniCanvasHeader } from './MiniCanvasHeader';
export { ResizableDivider } from './ResizableDivider';
export {
    CANVAS_SIZING,
    WORKSPACE_TYPE_CONFIG,
    useSplitRatio,
    useOpenWorkspaces,
    getLayoutConfig,
} from './TiledCanvasView.logic';
