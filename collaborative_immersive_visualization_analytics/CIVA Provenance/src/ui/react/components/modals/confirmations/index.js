/**
 * @file index.js
 * @description Exports for confirmation dialog components.
 *
 * These dialogs are specialized wrappers around ConfirmationDialog and Modal
 * for common confirmation scenarios in CIA Web.
 *
 * @example
 * import {
 *   DeleteViewDialog,
 *   CloseAllViewsDialog,
 *   LeaveRoomDialog,
 *   DeleteRecordingDialog,
 *   DeleteNoteDialog,
 *   DeleteProjectDialog,
 *   ClearChatDialog,
 *   ArchiveProjectDialog,
 *   TransferOwnershipDialog
 * } from '@UI/react/components/modals/confirmations';
 */

// View-related confirmations
export {
  DeleteViewDialog,
  default as DeleteViewDialogDefault,
} from "./DeleteViewDialog";
export {
  CloseAllViewsDialog,
  default as CloseAllViewsDialogDefault,
} from "./CloseAllViewsDialog";

// Room/Collaboration confirmations
export {
  LeaveRoomDialog,
  default as LeaveRoomDialogDefault,
} from "./LeaveRoomDialog";

// Recording/Note confirmations
export {
  DeleteRecordingDialog,
  default as DeleteRecordingDialogDefault,
} from "./DeleteRecordingDialog";
export {
  DeleteNoteDialog,
  default as DeleteNoteDialogDefault,
} from "./DeleteNoteDialog";

// Project confirmations
export {
  DeleteProjectDialog,
  default as DeleteProjectDialogDefault,
} from "./DeleteProjectDialog";
export {
  ClearChatDialog,
  default as ClearChatDialogDefault,
} from "./ClearChatDialog";
export {
  ArchiveProjectDialog,
  default as ArchiveProjectDialogDefault,
} from "./ArchiveProjectDialog";
export {
  TransferOwnershipDialog,
  default as TransferOwnershipDialogDefault,
} from "./TransferOwnershipDialog";
