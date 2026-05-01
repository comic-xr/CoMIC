// =============================================================================
// CANVAS SIZE PERSISTENCE
// =============================================================================

// The canvas dimensions (rows × cols of the grid) should persist.
// Currently only the SERVER saves this, but we can add localStorage for faster load.

export const CANVAS_SIZE_STORAGE_KEY = 'cia-canvas-size';

export function loadCanvasSize() {
    try {
        const saved = localStorage.getItem(CANVAS_SIZE_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.rows >= 1 && parsed.rows <= 50 && 
                parsed.cols >= 1 && parsed.cols <= 50) {
                return { rows: parsed.rows, cols: parsed.cols };
            }
        }
    } catch (e) { /* ignore */ }
    return null;
}

export function saveCanvasSize(size) {
    try {
        localStorage.setItem(CANVAS_SIZE_STORAGE_KEY, JSON.stringify({
            rows: size.rows,
            cols: size.cols,
        }));
    } catch (e) { /* ignore */ }
}