/**
 * @file index.js
 * @description Public exports for the FormModal component.
 *
 * FormModal extends the base Modal to handle multi-field input forms
 * like New Project, Invite Member, and Share View modals.
 *
 * @example
 * // Basic usage
 * import { FormModal, FormField } from '@UI/react/components/modals/FormModal';
 *
 * function NewProjectModal({ isOpen, onClose, onCreate }) {
 *   const [name, setName] = useState('');
 *   const [description, setDescription] = useState('');
 *   const [isSubmitting, setIsSubmitting] = useState(false);
 *
 *   const handleSubmit = async () => {
 *     setIsSubmitting(true);
 *     try {
 *       await onCreate({ name, description });
 *       onClose();
 *     } finally {
 *       setIsSubmitting(false);
 *     }
 *   };
 *
 *   return (
 *     <FormModal
 *       isOpen={isOpen}
 *       onClose={onClose}
 *       title="Create New Project"
 *       icon="folderPlus"
 *       submitLabel="Create Project"
 *       onSubmit={handleSubmit}
 *       isSubmitting={isSubmitting}
 *       submitDisabled={!name.trim()}
 *     >
 *       <FormField
 *         name="name"
 *         label="Project Name"
 *         type="text"
 *         required
 *         autoFocus
 *         maxLength={100}
 *         placeholder="Enter project name"
 *         value={name}
 *         onChange={setName}
 *       />
 *       <FormField
 *         name="description"
 *         label="Description"
 *         type="textarea"
 *         maxLength={500}
 *         placeholder="Optional project description"
 *         value={description}
 *         onChange={setDescription}
 *       />
 *     </FormModal>
 *   );
 * }
 *
 * @example
 * // With tag input for emails
 * import { FormModal, FormField } from '@UI/react/components/modals/FormModal';
 *
 * function InviteMembersModal({ isOpen, onClose, onInvite }) {
 *   const [emails, setEmails] = useState([]);
 *   const [role, setRole] = useState('member');
 *
 *   return (
 *     <FormModal
 *       isOpen={isOpen}
 *       onClose={onClose}
 *       title="Invite Members"
 *       icon={UserPlus}
 *       submitLabel={`Send ${emails.length} Invite${emails.length !== 1 ? 's' : ''}`}
 *       onSubmit={() => onInvite({ emails, role })}
 *       submitDisabled={emails.length === 0}
 *     >
 *       <FormField
 *         name="emails"
 *         label="Email Addresses"
 *         type="tags"
 *         required
 *         placeholder="Enter email addresses"
 *         value={emails}
 *         onChange={setEmails}
 *         helpText="Press Enter or comma to add"
 *       />
 *       <FormField
 *         name="role"
 *         label="Role"
 *         type="select"
 *         value={role}
 *         onChange={setRole}
 *         options={[
 *           { value: 'viewer', label: 'Viewer' },
 *           { value: 'member', label: 'Member' },
 *           { value: 'admin', label: 'Admin' }
 *         ]}
 *       />
 *     </FormModal>
 *   );
 * }
 *
 * @example
 * // With radio buttons
 * import { FormModal, FormField } from '@UI/react/components/modals/FormModal';
 *
 * function VisibilityModal({ isOpen, onClose, onSave }) {
 *   const [visibility, setVisibility] = useState('private');
 *
 *   return (
 *     <FormModal
 *       isOpen={isOpen}
 *       onClose={onClose}
 *       title="Change Visibility"
 *       submitLabel="Save"
 *       onSubmit={() => onSave(visibility)}
 *     >
 *       <FormField
 *         name="visibility"
 *         label="Who can access?"
 *         type="radio"
 *         value={visibility}
 *         onChange={setVisibility}
 *         options={[
 *           { value: 'private', label: 'Private - Only you' },
 *           { value: 'team', label: 'Team - Your team members' },
 *           { value: 'public', label: 'Public - Anyone with the link' }
 *         ]}
 *       />
 *     </FormModal>
 *   );
 * }
 */

// Main components
export { FormModal } from "./FormModal";
export { default } from "./FormModal";
export { FormField } from "./FormField";
