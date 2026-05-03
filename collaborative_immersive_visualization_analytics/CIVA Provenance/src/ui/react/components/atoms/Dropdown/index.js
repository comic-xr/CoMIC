/**
 * @file index.js
 * @description Public exports for the Dropdown component system.
 *
 * This module provides flexible dropdown components for CIA Web:
 * - Dropdown: Base dropdown with positioning and portal rendering
 * - DropdownMenu: Menu with items, separators, headers, and submenus
 * - DropdownSelect: Select input with search and multi-select
 * - useDropdown: Hook for custom dropdown implementations
 *
 * @example
 * // Basic dropdown menu
 * import { Dropdown, DropdownMenu } from '@UI/react/components/atoms/Dropdown';
 * import { Button } from '@UI/react/components/atoms/Button';
 * import { Icon } from '@UI/react/components/atoms/Icon';
 *
 * <Dropdown trigger={<Button variant="ghost">Options</Button>}>
 *   <DropdownMenu
 *     items={[
 *       { id: 'profile', label: 'Profile', icon: User },
 *       { id: 'settings', label: 'Settings', icon: Settings },
 *       { type: 'separator' },
 *       { id: 'logout', label: 'Sign Out', icon: LogOut, danger: true }
 *     ]}
 *     onSelect={(item) => handleAction(item.id)}
 *   />
 * </Dropdown>
 *
 * @example
 * // Select input
 * import { DropdownSelect } from '@UI/react/components/atoms/Dropdown';
 *
 * <DropdownSelect
 *   options={[
 *     { value: 'viewer', label: 'Viewer' },
 *     { value: 'member', label: 'Member' },
 *     { value: 'admin', label: 'Admin' }
 *   ]}
 *   value={role}
 *   onChange={setRole}
 *   placeholder="Select role..."
 * />
 *
 * @example
 * // Multi-select with search
 * import { DropdownSelect } from '@UI/react/components/atoms/Dropdown';
 *
 * <DropdownSelect
 *   options={users}
 *   value={selectedUsers}
 *   onChange={setSelectedUsers}
 *   multiple
 *   searchable
 *   clearable
 *   placeholder="Add users..."
 * />
 *
 * @example
 * // Custom dropdown with useDropdown hook
 * import { useDropdown } from '@UI/react/components/atoms/Dropdown';
 *
 * function CustomDropdown() {
 *   const { isOpen, toggle, triggerRef, dropdownRef, position } = useDropdown({
 *     placement: 'bottom-end',
 *     offset: 8
 *   });
 *
 *   return (
 *     <>
 *       <button ref={triggerRef} onClick={toggle}>Toggle</button>
 *       {isOpen && (
 *         <div
 *           ref={dropdownRef}
 *           style={{ position: 'fixed', left: position.x, top: position.y }}
 *         >
 *           Custom content
 *         </div>
 *       )}
 *     </>
 *   );
 * }
 *
 * @example
 * // Menu with checkboxes and radio items
 * import { Dropdown, DropdownMenu } from '@UI/react/components/atoms/Dropdown';
 *
 * <Dropdown trigger={<Button>View Options</Button>}>
 *   <DropdownMenu
 *     items={[
 *       { type: 'header', label: 'Text Style' },
 *       { id: 'bold', label: 'Bold', type: 'checkbox', checked: isBold },
 *       { id: 'italic', label: 'Italic', type: 'checkbox', checked: isItalic },
 *       { type: 'separator' },
 *       { type: 'header', label: 'Alignment' },
 *       { id: 'left', label: 'Left', type: 'radio', checked: align === 'left' },
 *       { id: 'center', label: 'Center', type: 'radio', checked: align === 'center' },
 *       { id: 'right', label: 'Right', type: 'radio', checked: align === 'right' }
 *     ]}
 *     onSelect={handleFormatChange}
 *   />
 * </Dropdown>
 *
 * @example
 * // Nested submenu
 * import { Dropdown, DropdownMenu } from '@UI/react/components/atoms/Dropdown';
 *
 * <Dropdown trigger={<Button>File</Button>}>
 *   <DropdownMenu
 *     items={[
 *       { id: 'new', label: 'New', submenu: [
 *         { id: 'new-file', label: 'New File' },
 *         { id: 'new-folder', label: 'New Folder' }
 *       ]},
 *       { id: 'open', label: 'Open...' },
 *       { type: 'separator' },
 *       { id: 'save', label: 'Save', shortcut: '⌘S' }
 *     ]}
 *   />
 * </Dropdown>
 */

// Main components
export { Dropdown, useDropdownContext } from "./Dropdown";
export { default } from "./Dropdown";
export { DropdownMenu, MenuItem } from "./DropdownMenu";
export { DropdownSelect } from "./DropdownSelect";

// Hook for custom implementations
export { useDropdown } from "./useDropdown";
