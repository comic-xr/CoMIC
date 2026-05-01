// src/ui/react/components/modals/index.js
// Modal component exports

// Base Modal component and utilities
export { Modal, ModalHeader, ModalContent, ModalFooter, useModal, useFocusTrap } from './Modal';

// Confirmation Dialog (base)
export { ConfirmationDialog } from './ConfirmationDialog';

// Specific confirmation dialogs
export {
  DeleteViewDialog,
  CloseAllViewsDialog,
  LeaveRoomDialog,
  DeleteRecordingDialog,
  DeleteNoteDialog,
  DeleteProjectDialog,
  ClearChatDialog,
  ArchiveProjectDialog,
  TransferOwnershipDialog,
} from './confirmations';

// Feature modals
export { AnnotationContextMenu } from './AnnotationContextMenu';
export { AnnotationModal } from './AnnotationModal';
export { CreateRoomModal } from './CreateRoomModal';
export { CreateSubsetDialog } from './CreateSubsetDialog';
export { DatasetSettingsModal } from './DatasetSettingsModal';
export { FileDetailsModal } from './FileDetailsModal';
export { FormModal } from './FormModal';
export { GlobalSearchModal } from './GlobalSearchModal';
export { HelpModal } from './HelpModal';
export { InviteMemberModal } from './InviteMemberModal';
export { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
export { MergeConflictPicker } from './MergeConflictPicker';
export { NewProjectModal } from './NewProjectModal';
export { ProfileModal } from './ProfileModal';
export { RecordingConsentModal } from './RecordingConsentModal';
export { ShareViewModal } from './ShareViewModal';
export { UsernameModal } from './UsernameModal';
export { ViewSettingsModal } from './ViewSettingsModal';
export { VoiceCommandHelp } from './VoiceCommandHelp';
export { WorkspacePickerModal } from './WorkspacePickerModal';

// ViewGroup modals
export { DuplicationDialog } from './DuplicationDialog';
