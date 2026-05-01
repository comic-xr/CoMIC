/**
 * @file instanceTools.js
 * @description Helpers for normalizing instance tools data.
 */

/**
 * Normalize instance tools result to structured shape.
 * Supports legacy array and structured { sections, tools }.
 */
const normalizeSectionColor = (color) => {
    if (!color) return color;
    if (color.startsWith('var(') || color.startsWith('#') || color.startsWith('rgb')) {
        return color;
    }
    return `var(--color-accent-${color})`;
};

export const normalizeInstanceToolsResult = (result) => {
    const normalizeTool = (tool) => {
        if (!tool) return tool;
        const options = tool.options || tool.items;
        const type = tool.type || (options ? 'menu' : 'button');
        return { ...tool, options, type };
    };

    if (!result) {
        return { sections: [], tools: [] };
    }

    if (Array.isArray(result)) {
        return { sections: [], tools: result.map(normalizeTool) };
    }

    if (result.tools && Array.isArray(result.tools)) {
        return {
            sections: Array.isArray(result.sections)
                ? result.sections.map((section) => ({
                    ...section,
                    color: normalizeSectionColor(section.color),
                }))
                : [],
            tools: result.tools.map(normalizeTool),
        };
    }

    return { sections: [], tools: [] };
};

export default {
    normalizeInstanceToolsResult,
};
