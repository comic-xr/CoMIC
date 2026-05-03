/**
 * Footer2
 * Shared canvas toolbar footer with ViewGroup selector and responsive links.
 */

export { Footer2 } from './Footer2';
export { Footer2Container } from './Footer2Container';
export { default } from './Footer2';

// Logic exports
export {
    useFooterLayout,
    useViewGroupSelector,
    useLinkStats,
    useLinkReminderToast,
    useDuplicationDialog,
    FOOTER_BREAKPOINTS,
    TOOLBAR_SECTIONS,
    LINK_PROPERTIES,
    TYPE_SPECIFIC_LINK_PROPERTIES,
    QUICK_CREATE_TEMPLATES,
} from './Footer2.logic';

// Sub-components
export {
    ViewGroupSelector,
    ViewGroupRow,
    CreateViewGroupPopover,
    ViewGroupSettingsPopover,
} from './components/ViewGroupSelector/ViewGroupSelector';

export {
    LinksSection,
    ExpandedLinks,
    CollapsedLinksIndicator,
    LinksPopover,
    LinkPropertyPopover,
    LinkPropertyIndicator,
} from './components/LinksSection/LinksSection';
