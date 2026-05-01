/**
 * @file index.js
 * @description Public exports for the Modal component system.
 *
 * This module provides the base Modal component and associated utilities
 * that serve as the foundation for all 21 modals in CIA Web.
 *
 * @example
 * // Basic usage with useModal hook
 * import { Modal, useModal } from '@UI/react/components/modals/Modal';
 *
 * function MyComponent() {
 *   const { isOpen, open, close } = useModal();
 *   return (
 *     <>
 *       <button onClick={open}>Open Modal</button>
 *       <Modal isOpen={isOpen} onClose={close} title="My Modal">
 *         <p>Content here</p>
 *       </Modal>
 *     </>
 *   );
 * }
 *
 * @example
 * // With severity and icon
 * import { Modal, useModal } from '@UI/react/components/modals/Modal';
 * import { Icon, getIconComponent } from '@UI/react/components/atoms/Icon';
 *
 * function DeleteModal({ onDelete }) {
 *   const { isOpen, open, close } = useModal();
 *   return (
 *     <Modal
 *       isOpen={isOpen}
 *       onClose={close}
 *       title="Delete Item?"
 *       icon="delete"
 *       severity="danger"
 *       size="sm"
 *       footer={
 *         <>
 *           <button className="btn btn--secondary" onClick={close}>Cancel</button>
 *           <button className="btn btn--danger" onClick={onDelete}>Delete</button>
 *         </>
 *       }
 *     >
 *       <p>This action cannot be undone.</p>
 *     </Modal>
 *   );
 * }
 *
 * @example
 * // Using sub-components directly (for advanced layouts)
 * import Modal, { ModalHeader, ModalContent, ModalFooter } from '@UI/react/components/modals/Modal';
 */

// Main Modal component
export { default as Modal } from "./Modal";
export { default } from "./Modal";

// Sub-components (for advanced usage)
export { default as ModalHeader } from "./ModalHeader";
export { default as ModalContent } from "./ModalContent";
export { default as ModalFooter } from "./ModalFooter";

// Hooks
export { useModal } from "./useModal";
export { useFocusTrap } from "./useFocusTrap";
