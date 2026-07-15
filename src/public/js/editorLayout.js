// AIGC START
(function(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.MdEditorLayout = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
    const MODES = ['edit', 'split', 'preview'];

    function normalizeLayoutMode(mode) {
        return MODES.includes(mode) ? mode : 'split';
    }

    function clampSplitPercent(value) {
        const percent = Number(value);
        if (!Number.isFinite(percent)) {
            return 50;
        }
        return Math.min(75, Math.max(25, Math.round(percent)));
    }

    function buildLayoutState(mode, splitPercent) {
        const normalizedMode = normalizeLayoutMode(mode);
        const percent = clampSplitPercent(splitPercent);
        if (normalizedMode === 'edit') {
            return {
                mode: 'edit',
                editorHidden: false,
                previewHidden: true,
                resizerHidden: true,
                editorBasis: '100%',
                previewBasis: '0%'
            };
        }
        if (normalizedMode === 'preview') {
            return {
                mode: 'preview',
                editorHidden: true,
                previewHidden: false,
                resizerHidden: true,
                editorBasis: '0%',
                previewBasis: '100%'
            };
        }
        return {
            mode: 'split',
            editorHidden: false,
            previewHidden: false,
            resizerHidden: false,
            editorBasis: `${percent}%`,
            previewBasis: `${100 - percent}%`
        };
    }

    return {
        normalizeLayoutMode,
        clampSplitPercent,
        buildLayoutState
    };
});
// AIGC END
