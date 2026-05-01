/**
 * @file index.js
 * @description Public exports for the ConfirmationDialog component.
 *
 * This module provides the ConfirmationDialog component that extends the base Modal
 * to handle all confirmation dialogs in CIA Web (10 total), including dangerous
 * actions with type-to-confirm functionality.
 *
 * @example
 * // Simple confirmation
 * import { ConfirmationDialog } from '@UI/react/components/modals/ConfirmationDialog';
 * import { useModal } from '@UI/react/components/modals/Modal';
 *
 * function CloseAllViews({ viewCount, onCloseAll }) {
 *   const { isOpen, open, close } = useModal();
 *
 *   return (
 *     <>
 *       <button onClick={open}>Close All</button>
 *       <ConfirmationDialog
 *         isOpen={isOpen}
 *         onClose={close}
 *         title="Close All Views?"
 *         description={`All ${viewCount} views will be closed.`}
 *         severity="warning"
 *         confirmLabel="Close All"
 *         onConfirm={() => {
 *           onCloseAll();
 *           close();
 *         }}
 *       />
 *     </>
 *   );
 * }
 *
 * @example
 * // Dangerous action with type-to-confirm
 * import { ConfirmationDialog } from '@UI/react/components/modals/ConfirmationDialog';
 *
 * function DeleteProject({ projectName, onDelete }) {
 *   const [isOpen, setIsOpen] = useState(false);
 *
 *   return (
 *     <>
 *       <button onClick={() => setIsOpen(true)}>Delete Project</button>
 *       <ConfirmationDialog
 *         isOpen={isOpen}
 *         onClose={() => setIsOpen(false)}
 *         title="Delete Project Permanently?"
 *         description="This action is permanent and cannot be undone."
 *         severity="danger"
 *         confirmLabel="Delete Project"
 *         onConfirm={() => {
 *           onDelete();
 *           setIsOpen(false);
 *         }}
 *         showInput
 *         inputPlaceholder="Type DELETE to confirm"
 *         inputMatchValue="DELETE"
 *       />
 *     </>
 *   );
 * }
 *
 * @example
 * // With "Don't ask again" checkbox
 * import { ConfirmationDialog } from '@UI/react/components/modals/ConfirmationDialog';
 *
 * function DeleteAnnotation({ onDelete, onDontAskAgainChange }) {
 *   const [isOpen, setIsOpen] = useState(false);
 *
 *   return (
 *     <ConfirmationDialog
 *       isOpen={isOpen}
 *       onClose={() => setIsOpen(false)}
 *       title="Delete Annotation?"
 *       description="This annotation will be permanently deleted."
 *       severity="warning"
 *       confirmLabel="Delete"
 *       onConfirm={onDelete}
 *       showCheckbox
 *       checkboxLabel="Don't ask me again for this session"
 *       onCheckboxChange={onDontAskAgainChange}
 *     />
 *   );
 * }
 */

// Main component
export { default as ConfirmationDialog } from "./ConfirmationDialog";
export { default } from "./ConfirmationDialog";
