// AIGC START
(function(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.MdEditorHistory = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
    function createHistoryManager(maxHistory) {
        const limit = Math.max(parseInt(maxHistory, 10) || 100, 1);
        let stack = [''];
        let index = 0;

        function reset(value) {
            stack = [value || ''];
            index = 0;
        }

        function push(value) {
            const nextValue = value || '';
            if (stack[index] === nextValue) {
                return;
            }
            stack = stack.slice(0, index + 1);
            stack.push(nextValue);
            if (stack.length > limit) {
                stack.shift();
            }
            index = stack.length - 1;
        }

        function undo() {
            if (index > 0) {
                index -= 1;
            }
            return stack[index];
        }

        function redo() {
            if (index < stack.length - 1) {
                index += 1;
            }
            return stack[index];
        }

        function current() {
            return stack[index];
        }

        function entries() {
            return stack.slice();
        }

        return { reset, push, undo, redo, current, entries };
    }

    return { createHistoryManager };
});
// AIGC END
