/**
 * @file index.jsx
 * @description Public exports for FilesTab.
 */

// Main FilesTab exports - V2 is now the standard
export { FilesTabV2 as default, FilesTabV2, FilesTabV2 as FilesPanelContent } from './FilesTabV2';

// Legacy export (deprecated, use FilesTabV2 instead)
export { FilesPanelContent as FilesTabLegacy } from './FilesTab';

// Hooks
export { useFilesTab, canVisualize } from './hooks/useFilesTab';

// Components
export { FileItemList, FileItemGrid, getFileTypeConfig } from './components/FileItem';
export { FileThumbnail } from './components/FileThumbnail';
export { FileContextMenu } from './components/FileContextMenu';
export { UploadDropzone } from './components/UploadDropzone';
export { DatasetTreeItem } from './components/DatasetTreeItem';
export { FolderNode } from './components/FolderNode';

// Section organisms
export { StarredSection, TabbedFilesBrowser, CompactFilesPanel } from './sections';