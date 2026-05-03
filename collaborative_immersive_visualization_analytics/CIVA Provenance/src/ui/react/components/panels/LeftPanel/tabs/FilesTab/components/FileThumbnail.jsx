/**
 * @file FileThumbnail.jsx
 * @description Thumbnail preview component for files.
 * Fetches and displays file thumbnails with loading states.
 *
 * @example
 * <FileThumbnail fileId="file-1" fallbackIcon={FileIcon} />
 */

import React, { useState, useEffect, memo } from 'react';
import { ui as log } from '@Utils/logger.js';
import { config } from '@Core/config/clientConfig.js';

/**
 * @typedef {Object} FileThumbnailProps
 * @property {string} fileId - File ID for thumbnail fetch
 * @property {React.ComponentType} fallbackIcon - Fallback icon component
 * @property {string} [color] - Icon color
 * @property {string} [colorClass] - Icon color class
 */

/**
 * File thumbnail with fetch and fallback support.
 * Handles 204 No Content responses and auto-refreshes on WebSocket updates.
 *
 * @param {FileThumbnailProps} props - Component props
 * @returns {React.ReactElement} The rendered thumbnail
 */
export const FileThumbnail = memo(function FileThumbnail({
    fileId,
    fallbackIcon: FallbackIcon,
    color,
    colorClass,
}) {
    const [status, setStatus] = useState('loading');
    const [objectUrl, setObjectUrl] = useState(null);
    const [revision, setRevision] = useState(0);

    // Listen for file thumbnail updates from WebSocket
    useEffect(() => {
        const handleThumbnailUpdate = (event) => {
            if (event.detail?.fileId === fileId) {
                log.debug(`File thumbnail updated for ${fileId}, refetching...`);
                setRevision((r) => r + 1);
            }
        };

        window.addEventListener('cia:file-thumbnail-updated', handleThumbnailUpdate);
        return () => window.removeEventListener('cia:file-thumbnail-updated', handleThumbnailUpdate);
    }, [fileId]);

    // Fetch thumbnail
    useEffect(() => {
        if (!fileId) {
            setStatus('error');
            return;
        }

        let cancelled = false;
        setStatus('loading');

        // Clean up previous object URL
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            setObjectUrl(null);
        }

        const loadThumbnail = async () => {
            try {
                const apiBase = config.apiBaseUrl || 'http://localhost:3001/api';
                const url =
                    revision > 0
                        ? `${apiBase}/files/${fileId}/thumbnail?_=${revision}`
                        : `${apiBase}/files/${fileId}/thumbnail`;

                const response = await fetch(url, {
                    credentials: 'include',
                });

                if (cancelled) return;

                // 204 No Content means no thumbnail exists
                if (response.status === 204) {
                    setStatus('no-thumbnail');
                    return;
                }

                if (!response.ok) {
                    setStatus('error');
                    return;
                }

                const blob = await response.blob();
                if (cancelled) return;

                if (blob.size === 0) {
                    setStatus('no-thumbnail');
                    return;
                }

                const blobUrl = URL.createObjectURL(blob);
                setObjectUrl(blobUrl);
                setStatus('loaded');
            } catch (err) {
                if (!cancelled) {
                    log.warn(`Failed to load thumbnail for file ${fileId}:`, err.message);
                    setStatus('error');
                }
            }
        };

        loadThumbnail();

        return () => {
            cancelled = true;
        };
    }, [fileId, revision]); // eslint-disable-line react-hooks/exhaustive-deps

    // Cleanup object URL on unmount
    useEffect(() => {
        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [objectUrl]);

    // Show fallback for error or no-thumbnail states
    if (status === 'error' || status === 'no-thumbnail') {
        return (
            <FallbackIcon
                size={20}
                style={color ? { color, opacity: 0.5 } : { opacity: 0.5 }}
                className={colorClass || ''}
            />
        );
    }

    // Show loading state with semi-transparent icon
    if (status === 'loading' || !objectUrl) {
        return (
            <FallbackIcon
                size={20}
                style={color ? { color, opacity: 0.3 } : { opacity: 0.3 }}
                className={colorClass || ''}
            />
        );
    }

    // Show actual thumbnail
    return (
        <img
            src={objectUrl}
            alt="File thumbnail"
            className="thumbnail__image"
        />
    );
});

export default FileThumbnail;