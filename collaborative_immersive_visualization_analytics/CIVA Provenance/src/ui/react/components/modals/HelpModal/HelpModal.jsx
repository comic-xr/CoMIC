/**
 * @file HelpModal.jsx
 * @description Help modal component for CIA Web.
 * Provides users with quick access to documentation, tutorials, and support resources.
 *
 * Features:
 * - Quick Start guide with step-by-step instructions
 * - Keyboard shortcuts summary with link to full shortcuts modal
 * - External documentation links
 * - Video tutorials grid
 * - Contact support options
 * - Collapsible accordion sections
 * - Full keyboard navigation
 *
 * @example
 * import { HelpModal } from '@UI/react/components/modals/HelpModal';
 *
 * function App() {
 *   const [helpOpen, setHelpOpen] = useState(false);
 *
 *   return (
 *     <>
 *       <button onClick={() => setHelpOpen(true)}>Help</button>
 *       <HelpModal
 *         isOpen={helpOpen}
 *         onClose={() => setHelpOpen(false)}
 *         version="1.0.0"
 *       />
 *     </>
 *   );
 * }
 */

import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { Icon, getIconComponent } from '@UI/react/components/atoms/Icon';
import Modal from '../Modal/Modal';
import { Button } from '@UI/react/components/atoms/Button';
import HelpSection from './HelpSection';
import './HelpModal.scss';

/**
 * Quick start steps data
 */
const QUICK_START_STEPS = [
    {
        icon: Upload,
        title: 'Upload your data files',
        description: 'Drag and drop files or use the Files panel to upload datasets.',
    },
    {
        icon: Eye,
        title: 'Create a view',
        description: 'Select a dataset in the Datasets panel and create a visualization.',
    },
    {
        icon: Layout,
        title: 'Place on canvas',
        description: 'Drag views onto the canvas to arrange your workspace.',
    },
    {
        icon: Users,
        title: 'Invite collaborators',
        description: 'Share your project and work together in real-time.',
    },
    {
        icon: MessageSquare,
        title: 'Add annotations',
        description: 'Mark points of interest and add notes to your visualizations.',
    },
];

/**
 * Keyboard shortcuts summary (top 5)
 */
const KEYBOARD_SHORTCUTS = [
    { keys: ['Cmd', 'K'], description: 'Quick search' },
    { keys: ['Cmd', 'S'], description: 'Save project' },
    { keys: ['Cmd', 'Z'], description: 'Undo' },
    { keys: ['Space'], description: 'Pan canvas' },
    { keys: ['Cmd', '/'], description: 'Toggle help' },
];

/**
 * Documentation links data
 */
const DOC_LINKS = [
    { id: 'guide', label: 'User Guide', href: 'https://docs.cia-web.io/guide', icon: Book },
    { id: 'api', label: 'API Reference', href: 'https://docs.cia-web.io/api', icon: Code },
    { id: 'vr', label: 'VR Mode Guide', href: 'https://docs.cia-web.io/vr', icon: Glasses },
    { id: 'tutorials', label: 'Video Tutorials', href: 'https://docs.cia-web.io/tutorials', icon: Video },
];

/**
 * Video tutorials data
 */
const VIDEO_TUTORIALS = [
    {
        id: 'getting-started',
        title: 'Getting Started with CIA Web',
        duration: '5:32',
        thumbnail: null, // Placeholder for now
        href: 'https://docs.cia-web.io/videos/getting-started',
    },
    {
        id: 'data-import',
        title: 'Importing & Managing Data',
        duration: '8:15',
        thumbnail: null,
        href: 'https://docs.cia-web.io/videos/data-import',
    },
    {
        id: 'visualizations',
        title: 'Creating Visualizations',
        duration: '12:48',
        thumbnail: null,
        href: 'https://docs.cia-web.io/videos/visualizations',
    },
    {
        id: 'collaboration',
        title: 'Real-time Collaboration',
        duration: '6:22',
        thumbnail: null,
        href: 'https://docs.cia-web.io/videos/collaboration',
    },
];

/**
 * Support links data
 */
const SUPPORT_LINKS = [
    {
        id: 'email',
        label: 'Email Support',
        href: 'mailto:support@cia-web.io',
        icon: Mail,
        description: 'Get help from our team',
    },
    {
        id: 'feedback',
        label: 'Send Feedback',
        href: 'https://feedback.cia-web.io',
        icon: Send,
        description: 'Share your thoughts',
    },
    {
        id: 'community',
        label: 'Community Forum',
        href: 'https://community.cia-web.io',
        icon: MessageCircle,
        description: 'Join the discussion',
    },
    {
        id: 'bugs',
        label: 'Report a Bug',
        href: 'https://github.com/cia-web/issues',
        icon: Bug,
        description: 'Help us improve',
    },
];

/**
 * @typedef {Object} HelpModalProps
 * @property {boolean} isOpen - Whether modal is visible
 * @property {() => void} onClose - Close handler
 * @property {string} [initialSection='quickstart'] - Initially expanded section
 * @property {string} [version] - App version to display in footer
 * @property {() => void} [onOpenShortcuts] - Handler to open keyboard shortcuts modal
 * @property {string} [className] - Additional CSS class
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Help modal component providing access to documentation and support.
 *
 * @param {HelpModalProps} props - Component props
 * @returns {React.ReactElement} The rendered modal
 */
function HelpModal({
    isOpen,
    onClose,
    initialSection = 'quickstart',
    version,
    onOpenShortcuts,
    className = '',
    testId
}) {
    // Track expanded sections (multiple can be expanded)
    const [expandedSections, setExpandedSections] = useState(new Set([initialSection]));

    // Ref for section navigation
    const sectionsRef = useRef([]);

    /**
     * Toggle section expansion
     */
    const toggleSection = useCallback((sectionId) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(sectionId)) {
                next.delete(sectionId);
            } else {
                next.add(sectionId);
            }
            return next;
        });
    }, []);

    /**
     * Check if section is expanded
     */
    const isSectionExpanded = useCallback((sectionId) => {
        return expandedSections.has(sectionId);
    }, [expandedSections]);

    /**
     * Handle keyboard navigation between sections
     */
    const handleKeyDown = useCallback((event) => {
        const focusedElement = document.activeElement;
        const isHeader = focusedElement?.classList.contains('help-section__header');

        if (!isHeader) return;

        const currentIndex = sectionsRef.current.findIndex(
            el => el?.contains(focusedElement)
        );

        if (currentIndex === -1) return;

        let nextIndex = currentIndex;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                nextIndex = (currentIndex + 1) % sectionsRef.current.length;
                break;
            case 'ArrowUp':
                event.preventDefault();
                nextIndex = currentIndex - 1;
                if (nextIndex < 0) nextIndex = sectionsRef.current.length - 1;
                break;
            case 'Home':
                event.preventDefault();
                nextIndex = 0;
                break;
            case 'End':
                event.preventDefault();
                nextIndex = sectionsRef.current.length - 1;
                break;
            default:
                return;
        }

        const nextSection = sectionsRef.current[nextIndex];
        const nextHeader = nextSection?.querySelector('.help-section__header');
        nextHeader?.focus();
    }, []);

    // Reset expanded sections when modal opens
    useEffect(() => {
        if (isOpen) {
            setExpandedSections(new Set([initialSection]));
        }
    }, [isOpen, initialSection]);

    /**
     * Handle opening keyboard shortcuts modal
     */
    const handleViewAllShortcuts = useCallback(() => {
        if (onOpenShortcuts) {
            onClose();
            onOpenShortcuts();
        }
    }, [onClose, onOpenShortcuts]);

    // Build class names
    const contentClassNames = [
        'help-modal__content',
        className
    ].filter(Boolean).join(' ');

    // Modal footer
    const footer = (
        <div className="help-modal__footer">
            <span className="help-modal__version">
                {version ? `CIA Web v${version}` : 'CIA Web'}
            </span>
            <Button variant="secondary" onClick={onClose}>
                Close
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Help & Resources"
            icon="help"
            severity="info"
            size="lg"
            footer={footer}
            testId={testId}
        >
            <div
                className={contentClassNames}
                onKeyDown={handleKeyDown}
                role="presentation"
            >
                {/* Quick Start Section */}
                <div ref={el => sectionsRef.current[0] = el}>
                    <HelpSection
                        id="quickstart"
                        title="Quick Start"
                        icon="rocket"
                        isExpanded={isSectionExpanded('quickstart')}
                        onToggle={() => toggleSection('quickstart')}
                    >
                        <div className="quick-start">
                            {QUICK_START_STEPS.map((step, index) => {
                                const StepIcon = step.icon;
                                return (
                                    <div key={index} className="quick-start__step">
                                        <span className="quick-start__step-number">{index + 1}</span>
                                        <div className="quick-start__step-content">
                                            <div className="quick-start__step-title">
                                                {step.title}
                                            </div>
                                            <div className="quick-start__step-description">
                                                {step.description}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <a
                                href="https://docs.cia-web.io/quickstart"
                                className="quick-start__learn-more"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Learn More <ArrowRight size={14} />
                            </a>
                        </div>
                    </HelpSection>
                </div>

                {/* Keyboard Shortcuts Section */}
                <div ref={el => sectionsRef.current[1] = el}>
                    <HelpSection
                        id="shortcuts"
                        title="Keyboard Shortcuts"
                        icon="keyboard"
                        isExpanded={isSectionExpanded('shortcuts')}
                        onToggle={() => toggleSection('shortcuts')}
                    >
                        <div className="shortcuts-summary">
                            <div className="shortcuts-summary__list">
                                {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                                    <div key={index} className="shortcuts-summary__item">
                                        <span className="shortcuts-summary__keys">
                                            {shortcut.keys.map((key, keyIndex) => (
                                                <React.Fragment key={keyIndex}>
                                                    <kbd className="shortcuts-summary__key">{key}</kbd>
                                                    {keyIndex < shortcut.keys.length - 1 && (
                                                        <span className="shortcuts-summary__separator">+</span>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </span>
                                        <span className="shortcuts-summary__description">
                                            {shortcut.description}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {onOpenShortcuts && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleViewAllShortcuts}
                                    className="shortcuts-summary__view-all"
                                >
                                    View All Shortcuts
                                </Button>
                            )}
                        </div>
                    </HelpSection>
                </div>

                {/* Documentation Section */}
                <div ref={el => sectionsRef.current[2] = el}>
                    <HelpSection
                        id="documentation"
                        title="Documentation"
                        icon="file"
                        isExpanded={isSectionExpanded('documentation')}
                        onToggle={() => toggleSection('documentation')}
                    >
                        <div className="doc-links">
                            {DOC_LINKS.map((link) => {
                                const LinkIcon = link.icon;
                                return (
                                    <a
                                        key={link.id}
                                        href={link.href}
                                        className="doc-links__item"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <span className="doc-links__icon">
                                            <LinkIcon size={18} />
                                        </span>
                                        <span className="doc-links__label">{link.label}</span>
                                        <span className="doc-links__external">
                                            <ExternalLink size={14} />
                                        </span>
                                    </a>
                                );
                            })}
                        </div>
                    </HelpSection>
                </div>

                {/* Video Tutorials Section */}
                <div ref={el => sectionsRef.current[3] = el}>
                    <HelpSection
                        id="videos"
                        title="Video Tutorials"
                        icon="video"
                        isExpanded={isSectionExpanded('videos')}
                        onToggle={() => toggleSection('videos')}
                    >
                        <div className="video-grid">
                            {VIDEO_TUTORIALS.map((video) => (
                                <a
                                    key={video.id}
                                    href={video.href}
                                    className="video-grid__item"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <div className="video-grid__thumbnail">
                                        {/* Placeholder thumbnail */}
                                        <div className="video-grid__placeholder">
                                            <Video size={24} />
                                        </div>
                                    </div>
                                    <div className="video-grid__overlay">
                                        <span className="video-grid__play">
                                            <Play size={20} />
                                        </span>
                                    </div>
                                    <span className="video-grid__duration">{video.duration}</span>
                                    <div className="video-grid__title">{video.title}</div>
                                </a>
                            ))}
                        </div>
                    </HelpSection>
                </div>

                {/* Contact Support Section */}
                <div ref={el => sectionsRef.current[4] = el}>
                    <HelpSection
                        id="support"
                        title="Contact Support"
                        icon="headphones"
                        isExpanded={isSectionExpanded('support')}
                        onToggle={() => toggleSection('support')}
                    >
                        <div className="support-links">
                            {SUPPORT_LINKS.map((link) => {
                                const LinkIcon = link.icon;
                                return (
                                    <a
                                        key={link.id}
                                        href={link.href}
                                        className="support-links__item"
                                        target={link.href.startsWith('mailto:') ? undefined : '_blank'}
                                        rel={link.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                                    >
                                        <span className="support-links__icon">
                                            <LinkIcon size={18} />
                                        </span>
                                        <div className="support-links__content">
                                            <span className="support-links__label">{link.label}</span>
                                            <span className="support-links__description">{link.description}</span>
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                    </HelpSection>
                </div>
            </div>
        </Modal>
    );
}

export default memo(HelpModal);
export { HelpModal };