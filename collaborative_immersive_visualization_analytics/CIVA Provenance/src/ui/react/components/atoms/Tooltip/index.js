/**
 * @file index.js
 * @description Public exports for the Tooltip component system.
 *
 * This module provides consistent tooltip components for CIA Web:
 * - Tooltip: Main component for displaying contextual information
 * - Tooltip.Rich: Rich tooltip with title, description, and shortcut
 * - TooltipProvider: Context provider for global settings
 * - useTooltip: Hook for custom tooltip implementations
 *
 * @example
 * // Simple tooltip
 * import { Tooltip } from '@UI/react/components/atoms/Tooltip';
 *
 * <Tooltip content="Save changes">
 *   <button>Save</button>
 * </Tooltip>
 *
 * @example
 * // Rich tooltip with keyboard shortcut
 * import { Tooltip } from '@UI/react/components/atoms/Tooltip';
 *
 * <Tooltip
 *   content={
 *     <Tooltip.Rich
 *       title="Global Search"
 *       description="Search across all projects and views"
 *       shortcut="⌘K"
 *     />
 *   }
 * >
 *   <button>Search</button>
 * </Tooltip>
 *
 * @example
 * // Interactive tooltip
 * import { Tooltip } from '@UI/react/components/atoms/Tooltip';
 *
 * <Tooltip
 *   content={<UserCard user={user} />}
 *   interactive
 *   maxWidth={300}
 * >
 *   <Avatar user={user} />
 * </Tooltip>
 *
 * @example
 * // With TooltipProvider for global settings
 * import { TooltipProvider, Tooltip } from '@UI/react/components/atoms/Tooltip';
 *
 * function App() {
 *   return (
 *     <TooltipProvider delayDuration={300} skipDelayDuration={200}>
 *       <Toolbar />
 *     </TooltipProvider>
 *   );
 * }
 *
 * @example
 * // Custom tooltip with useTooltip hook
 * import { useTooltip } from '@UI/react/components/atoms/Tooltip';
 *
 * function CustomTooltip({ children, content }) {
 *   const { isVisible, triggerProps, tooltipProps, position } = useTooltip({
 *     placement: 'bottom',
 *     delay: 200
 *   });
 *
 *   return (
 *     <>
 *       <div {...triggerProps}>{children}</div>
 *       {isVisible && (
 *         <div {...tooltipProps} className="my-custom-tooltip">
 *           {content}
 *         </div>
 *       )}
 *     </>
 *   );
 * }
 *
 * @example
 * // Tooltip on truncated text
 * import { Tooltip } from '@UI/react/components/atoms/Tooltip';
 * import { useRef, useState, useEffect } from 'react';
 *
 * function TruncatedText({ text, maxWidth = 200 }) {
 *   const [isTruncated, setIsTruncated] = useState(false);
 *   const ref = useRef(null);
 *
 *   useEffect(() => {
 *     if (ref.current) {
 *       setIsTruncated(ref.current.scrollWidth > ref.current.clientWidth);
 *     }
 *   }, [text]);
 *
 *   const content = (
 *     <span
 *       ref={ref}
 *       style={{
 *         display: 'block',
 *         maxWidth,
 *         overflow: 'hidden',
 *         textOverflow: 'ellipsis',
 *         whiteSpace: 'nowrap'
 *       }}
 *     >
 *       {text}
 *     </span>
 *   );
 *
 *   if (isTruncated) {
 *     return <Tooltip content={text}>{content}</Tooltip>;
 *   }
 *
 *   return content;
 * }
 *
 * @example
 * // Tooltip placements
 * import { Tooltip } from '@UI/react/components/atoms/Tooltip';
 *
 * <Tooltip content="Top" placement="top"><button>Top</button></Tooltip>
 * <Tooltip content="Bottom" placement="bottom"><button>Bottom</button></Tooltip>
 * <Tooltip content="Left" placement="left"><button>Left</button></Tooltip>
 * <Tooltip content="Right" placement="right"><button>Right</button></Tooltip>
 */

// Main components
export { Tooltip, RichTooltip, formatShortcut } from "./Tooltip";
export { default } from "./Tooltip";

// Provider
export {
  TooltipProvider,
  TooltipContext,
  useTooltipContext,
} from "./TooltipProvider";

// Hook for custom implementations
export { useTooltip } from "./useTooltip";
