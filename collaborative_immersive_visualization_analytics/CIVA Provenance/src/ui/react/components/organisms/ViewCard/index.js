/**
 * ViewCard Component System
 * Unified component for displaying view references
 *
 * Uses atoms: ColorDot, StatusDot, Badge from @UI/react/components/atoms
 */

export {
    default,
    default as ViewCard,
    // Variants
    ViewCardDot,
    ViewCardChip,
    ViewCardMini,
    ViewCardCompact,
    ViewCardFull,
    // Link badges (re-exported from atoms)
    LinkBadge,
    ViewerBadge,
    HubBadge,
    ModeBadge,
    SyncStatusIndicator,
    // Constants
    LINK_MODES,
} from './ViewCard';

// Re-export atoms for convenience
export { ColorDot } from '@UI/react/components/atoms/ColorDot';
export { StatusDot } from '@UI/react/components/atoms/StatusDot';
export { Badge } from '@UI/react/components/atoms/Badge';
