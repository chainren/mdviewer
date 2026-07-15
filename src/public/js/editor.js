// AIGC START
(function() {
    const $ = (id) => document.getElementById(id);
    const params = new URLSearchParams(window.location.search);
    let currentFilePath = params.get('file');
    const originUrl = params.get('return');
    const commands = window.MdEditorCommands;
    const historyManager = window.MdEditorHistory.createHistoryManager(100);
    const exportTools = window.MdEditorExport;

    let renderer;
    let renderDebounce;
    let lastModified;
    let unsaved = false;
    let currentOutline = [];
    let pendingSync = null;
    let lastSyncedHeadingId = null;
    let lastActiveHeadingElement = null;
    let currentFindQuery = '';
    let dragCounter = 0;

    const renderDelay = 250;
    const ACTIVE_HEADING_CLASS = 'active-preview-heading';
    const TABLE_GRID_ROWS = 8;
    const TABLE_GRID_COLS = 8;
    const MERMAID_TEMPLATES = {
        mindmap: 'mindmap\n  root((主题))\n    子主题 A\n      子节点 A1\n      子节点 A2\n    子主题 B\n      子节点 B1',
        flowchart: 'flowchart TD\n    A[开始] --> B{判断}\n    B -->|是| C[执行]\n    B -->|否| D[结束]'
    };

    let historyTimer = null;
    let applyingHistory = false;

    function textarea() {
        return $('editor-textarea');
    }

    function setStatus(text) {
        const status = $('status');
        if (status) {
            status.textContent = text;
        }
    }

    function applyThemeFromViewer() {
        const saved = localStorage.getItem('markdown-viewer-theme') || 'light';
        document.documentElement.setAttribute('data-theme', saved);
    }

    function getDisplayPath() {
        return currentFilePath || '未命名 Markdown';
    }

    function updateTitle() {
        $('editor-title').textContent = `编辑：${getDisplayPath()}`;
    }

    async function loadFile() {
        if (!currentFilePath) {
            updateTitle();
            resetHistory('');
            scheduleRender({ force: true });
            return;
        }

        try {
            updateTitle();
            const res = await fetch(`/api/file/${encodeURIComponent(currentFilePath)}`);
            if (!res.ok) {
                throw new Error(`加载失败：${res.status}`);
            }
            const data = await res.json();
            textarea().value = data.content || '';
            lastModified = data.lastModified;
            unsaved = false;
            resetHistory(textarea().value);
            scheduleRender({ force: true });
            setStatus('已加载');
        } catch (err) {
            console.error(err);
            setStatus('加载失败');
        }
    }

    function scheduleRender(options = {}) {
        clearTimeout(renderDebounce);
        renderDebounce = setTimeout(() => renderPreview(options), renderDelay);
    }

    function isPreviewHidden() {
        const pane = $('preview-pane');
        return !pane || pane.classList.contains('hidden');
    }

    async function renderPreview(options = {}) {
        try {
            const pane = $('preview-pane');
            if (pane && pane.classList.contains('hidden') && !options.force) {
                return;
            }
            const outline = await renderer.renderContent(textarea().value, {
                targetId: 'preview-body',
                basePath: currentFilePath || ''
            });
            currentOutline = Array.isArray(outline) ? outline : [];
            lastSyncedHeadingId = null;
            highlightHeading(null);
            syncPreviewToCursor({ smooth: false, force: true, highlight: false });
        } catch (err) {
            console.error('预览渲染失败', err);
        }
    }

    function getCursorLine() {
        const element = textarea();
        const pos = element.selectionStart || 0;
        const value = element.value.slice(0, pos);
        return value ? value.split('\n').length - 1 : 0;
    }

    function getTotalLines() {
        const value = textarea().value;
        return value ? value.split('\n').length : 0;
    }

    function computeOffsetInContainer(element, container) {
        let offset = 0;
        let node = element;
        while (node && node !== container) {
            offset += node.offsetTop || 0;
            node = node.offsetParent;
        }
        return offset;
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function highlightHeading(element) {
        if (lastActiveHeadingElement && lastActiveHeadingElement !== element) {
            lastActiveHeadingElement.classList.remove(ACTIVE_HEADING_CLASS);
        }
        if (element && lastActiveHeadingElement !== element) {
            element.classList.add(ACTIVE_HEADING_CLASS);
        }
        lastActiveHeadingElement = element || null;
    }

    function scrollPreview(previewBody, top, smooth) {
        const maxTop = Math.max(previewBody.scrollHeight - previewBody.clientHeight, 0);
        const clampedTop = clamp(top, 0, maxTop);
        if (Math.abs(previewBody.scrollTop - clampedTop) < 1) {
            return;
        }
        previewBody.scrollTo({ top: clampedTop, behavior: smooth ? 'smooth' : 'auto' });
    }

    function syncPreviewToPosition(position = {}, options = {}) {
        if (isPreviewHidden()) {
            return;
        }

        const previewBody = $('preview-body');
        if (!previewBody) {
            return;
        }

        const { smooth = true, force = false, useOutline = true, highlight = true } = options;
        const line = typeof position.line === 'number' ? position.line : 0;
        const ratio = typeof position.ratio === 'number' ? clamp(position.ratio, 0, 1) : 0;
        const totalLines = Math.max(getTotalLines() - 1, 0);
        const outlineHasLineInfo = currentOutline.length && currentOutline.every(item => typeof item.line === 'number');

        if (!useOutline || !outlineHasLineInfo || !currentOutline.length) {
            const top = ratio * Math.max(previewBody.scrollHeight - previewBody.clientHeight, 0);
            scrollPreview(previewBody, top, smooth);
            if (highlight) {
                highlightHeadingByScrollTop(previewBody, top);
            }
            return;
        }

        let targetIndex = -1;
        for (let i = 0; i < currentOutline.length; i++) {
            if (line >= currentOutline[i].line) {
                targetIndex = i;
            } else {
                break;
            }
        }

        if (targetIndex === -1) {
            highlightHeading(null);
            scrollPreview(previewBody, ratio * Math.max(previewBody.scrollHeight - previewBody.clientHeight, 0), smooth);
            lastSyncedHeadingId = null;
            return;
        }

        const target = currentOutline[targetIndex];
        const heading = document.getElementById(target.id);
        if (!heading) {
            highlightHeading(null);
            return;
        }

        const targetTop = computeOffsetInContainer(heading, previewBody);
        let desiredTop = targetTop;
        const next = currentOutline[targetIndex + 1];
        if (next) {
            const nextHeading = document.getElementById(next.id);
            if (nextHeading) {
                const nextTop = computeOffsetInContainer(nextHeading, previewBody);
                const sectionLineSpan = Math.max(next.line - target.line, 1);
                const progressWithin = clamp((line - target.line) / sectionLineSpan, 0, 1);
                desiredTop = targetTop + progressWithin * Math.max(nextTop - targetTop, 0);
            }
        } else if (totalLines > target.line) {
            const maxScroll = Math.max(previewBody.scrollHeight - previewBody.clientHeight, 0);
            const sectionLineSpan = Math.max(totalLines - target.line, 1);
            const progressWithin = clamp((line - target.line) / sectionLineSpan, 0, 1);
            desiredTop = targetTop + progressWithin * Math.max(maxScroll - targetTop, 0);
        }

        desiredTop = Math.max(desiredTop - 16, 0);
        if (!force && Math.abs(previewBody.scrollTop - desiredTop) < 1 && lastSyncedHeadingId === target.id) {
            highlightHeading(heading);
            return;
        }

        scrollPreview(previewBody, desiredTop, smooth);
        if (highlight) {
            highlightHeading(heading);
            lastSyncedHeadingId = target.id;
        }
    }

    function highlightHeadingByScrollTop(previewBody, top) {
        if (!currentOutline.length) {
            highlightHeading(null);
            lastSyncedHeadingId = null;
            return;
        }

        let activeHeading = null;
        for (let i = 0; i < currentOutline.length; i++) {
            const candidate = document.getElementById(currentOutline[i].id);
            if (!candidate) {
                continue;
            }
            const offsetTop = computeOffsetInContainer(candidate, previewBody);
            if (offsetTop <= top + 8) {
                activeHeading = candidate;
            } else {
                break;
            }
        }
        highlightHeading(activeHeading);
        lastSyncedHeadingId = activeHeading ? activeHeading.id : null;
    }

    function scheduleSync(position, options = {}) {
        if (pendingSync) {
            cancelAnimationFrame(pendingSync);
        }
        pendingSync = requestAnimationFrame(() => {
            pendingSync = null;
            syncPreviewToPosition(position, options);
        });
    }

    function syncPreviewToCursor(options = {}) {
        const line = getCursorLine();
        const totalLines = Math.max(getTotalLines() - 1, 0);
        const ratio = totalLines > 0 ? line / totalLines : 0;
        scheduleSync({ line, ratio }, options);
    }

    function syncPreviewToRatio(ratio, options = {}) {
        const clampedRatio = clamp(ratio, 0, 1);
        const totalLines = Math.max(getTotalLines() - 1, 0);
        const line = Math.round(clampedRatio * totalLines);
        scheduleSync({ line, ratio: clampedRatio }, options);
    }

    function syncPreviewToScroll() {
        if (isPreviewHidden()) {
            return;
        }
        const element = textarea();
        const scrollRange = Math.max(element.scrollHeight - element.clientHeight, 1);
        syncPreviewToRatio(element.scrollTop / scrollRange, { smooth: false, force: true, useOutline: false, highlight: true });
    }

    function resetHistory(value) {
        historyManager.reset(value || '');
    }

    function pushHistory() {
        if (applyingHistory) {
            return;
        }
        const value = textarea().value;
        if (historyManager.current() === value) {
            return;
        }
        historyManager.push(value);
    }

    function recordHistorySoon() {
        clearTimeout(historyTimer);
        historyTimer = setTimeout(pushHistory, 350);
    }

    function restoreHistory(value) {
        applyingHistory = true;
        textarea().value = value;
        textarea().selectionStart = textarea().selectionEnd = textarea().value.length;
        applyingHistory = false;
        markChanged(false);
    }

    function undo() {
        clearTimeout(historyTimer);
        pushHistory();
        restoreHistory(historyManager.undo());
    }

    function redo() {
        restoreHistory(historyManager.redo());
    }

    function markChanged(push = true) {
        if (push) {
            pushHistory();
        }
        unsaved = true;
        scheduleRender();
        syncPreviewToCursor({ smooth: false, force: true, highlight: false });
    }

    function runCommand(fn) {
        if (!commands) {
            alert('编辑命令模块未加载');
            return;
        }
        pushHistory();
        fn(textarea());
        markChanged(false);
    }

    async function saveFile(targetPath, options = {}) {
        try {
            const pathToSave = targetPath || currentFilePath;
            if (!pathToSave) {
                openSaveAsModal();
                return false;
            }
            const res = await fetch(`/api/file/${encodeURIComponent(pathToSave)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: textarea().value, lastModified, override: !!options.override })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                if (res.status === 409) {
                    openOverrideModal(pathToSave);
                    return false;
                }
                throw new Error(data.error || `保存失败（${res.status}）`);
            }
            lastModified = data.lastModified;
            currentFilePath = pathToSave;
            unsaved = false;
            resetHistory(textarea().value);
            updateTitle();
            setStatus('已保存');
            return true;
        } catch (err) {
            console.error('保存错误', err);
            alert(err.message || '保存失败');
            setStatus('保存失败');
            return false;
        }
    }

    function openOverrideModal(target) {
        const modal = $('override-modal');
        modal.style.display = 'flex';
        modal.dataset.target = target;
    }

    function closeOverrideModal() {
        const modal = $('override-modal');
        modal.style.display = 'none';
        delete modal.dataset.target;
    }

    async function confirmOverride() {
        const modal = $('override-modal');
        const target = modal.dataset.target || currentFilePath;
        const ok = await saveFile(target, { override: true });
        if (ok) {
            closeOverrideModal();
        }
    }

    async function openSaveAsModal() {
        $('saveas-modal').style.display = 'flex';
        try {
            const res = await fetch('/api/files');
            const files = await res.json();
            renderSaveAsTree(files);
        } catch (err) {
            console.error('加载文件树失败', err);
            $('saveas-tree').innerHTML = '<div class="error">加载文件树失败</div>';
        }
    }

    function closeSaveAsModal() {
        $('saveas-modal').style.display = 'none';
    }

    function renderSaveAsTree(files) {
        const container = $('saveas-tree');
        container.innerHTML = '';

        function createItem(node, level) {
            const item = document.createElement('div');
            item.className = 'tree-item';
            item.style.paddingLeft = `${level * 1.25 + 0.5}rem`;
            item.textContent = (node.type === 'directory' ? '📁 ' : '📄 ') + node.name;
            item.addEventListener('click', () => {
                container.querySelectorAll('.tree-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                if (node.type === 'directory') {
                    $('saveas-dir').value = node.path || '';
                } else {
                    $('saveas-dir').value = node.path ? node.path.replace(/\/[^\/]+$/, '') : '';
                    $('saveas-name').value = node.name;
                }
            });
            return item;
        }

        function traverse(nodes, level) {
            nodes.forEach(node => {
                container.appendChild(createItem(node, level));
                if (node.type === 'directory' && node.children && node.children.length) {
                    traverse(node.children, level + 1);
                }
            });
        }

        traverse(files, 0);
    }

    async function confirmSaveAs() {
        const dir = $('saveas-dir').value.trim();
        const name = $('saveas-name').value.trim();
        if (!name) {
            alert('请输入文件名');
            return;
        }
        const target = dir ? `${dir.replace(/\/+$|\\+$/g, '')}/${name}` : name;
        if (!/\.(md|markdown|mdown|mkd|mkdn)$/i.test(target)) {
            alert('仅支持保存为 Markdown 文件');
            return;
        }
        const ok = await saveFile(target);
        if (!ok) {
            return;
        }
        const url = new URL(window.location.href);
        url.searchParams.set('file', target);
        history.replaceState(null, '', url.toString());
        closeSaveAsModal();
    }

    function togglePreview() {
        const pane = $('preview-pane');
        if (!pane) {
            return;
        }
        pane.classList.toggle('hidden');
        const hidden = pane.classList.contains('hidden');
        try {
            localStorage.setItem('editor-preview-hidden', hidden ? '1' : '0');
        } catch (err) {}
        if (hidden) {
            highlightHeading(null);
        } else {
            scheduleRender({ force: true });
        }
    }

    function goBack() {
        const previewUrl = originUrl || (`/index.html?file=${encodeURIComponent(currentFilePath || '')}`);
        if (unsaved && !confirm('存在未保存的更改，确定要返回吗？')) {
            return;
        }
        window.location.href = previewUrl;
    }

    function openFindModal() {
        $('find-modal').style.display = 'flex';
        $('find-query').focus();
    }

    function closeFindModal() {
        $('find-modal').style.display = 'none';
    }

    function getFindOptions() {
        return {
            query: $('find-query').value,
            replacement: $('find-replacement').value,
            caseSensitive: $('find-case').checked
        };
    }

    function findNext() {
        const options = getFindOptions();
        if (!options.query) {
            setStatus('请输入查找内容');
            return false;
        }
        const start = currentFindQuery === options.query ? textarea().selectionEnd : textarea().selectionStart;
        const match = commands.findNext(textarea(), options.query, start, options.caseSensitive);
        currentFindQuery = options.query;
        if (!commands.selectMatch(textarea(), match)) {
            setStatus('未找到匹配内容');
            return false;
        }
        setStatus(`找到：第 ${match.index + 1} 个字符`);
        syncPreviewToCursor({ smooth: false, force: true });
        return true;
    }

    function replaceOne() {
        const options = getFindOptions();
        if (textarea().selectionStart === textarea().selectionEnd && !findNext()) {
            return;
        }
        pushHistory();
        commands.replaceSelection(textarea(), options.replacement);
        markChanged(false);
        findNext();
    }

    function replaceAll() {
        const options = getFindOptions();
        const result = commands.replaceAll(textarea().value, options.query, options.replacement, options.caseSensitive);
        if (!result.count) {
            setStatus('未找到匹配内容');
            return;
        }
        pushHistory();
        textarea().value = result.value;
        textarea().selectionStart = textarea().selectionEnd = 0;
        markChanged(false);
        setStatus(`已替换 ${result.count} 处`);
    }

    function initTableGrid() {
        const grid = $('table-grid');
        if (!grid || grid.children.length) {
            return;
        }
        for (let row = 1; row <= TABLE_GRID_ROWS; row++) {
            for (let col = 1; col <= TABLE_GRID_COLS; col++) {
                const cell = document.createElement('div');
                cell.className = 'table-grid-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                grid.appendChild(cell);
            }
        }
        grid.addEventListener('mouseover', (event) => {
            if (!event.target.classList.contains('table-grid-cell')) {
                return;
            }
            highlightTableCells(parseInt(event.target.dataset.row, 10), parseInt(event.target.dataset.col, 10));
        });
        grid.addEventListener('mouseleave', () => highlightTableCells(0, 0));
        grid.addEventListener('click', (event) => {
            if (!event.target.classList.contains('table-grid-cell')) {
                return;
            }
            const rows = parseInt(event.target.dataset.row, 10);
            const cols = parseInt(event.target.dataset.col, 10);
            runCommand(element => commands.insertTable(element, rows, cols));
            closeTablePopover();
        });
    }

    function highlightTableCells(rows, cols) {
        document.querySelectorAll('.table-grid-cell').forEach(cell => {
            const row = parseInt(cell.dataset.row, 10);
            const col = parseInt(cell.dataset.col, 10);
            cell.classList.toggle('active', row <= rows && col <= cols);
        });
        $('table-size-label').textContent = rows && cols ? `${rows} × ${cols}` : '选择表格大小';
    }

    function toggleTablePopover() {
        initTableGrid();
        $('table-popover').classList.toggle('show');
    }

    function closeTablePopover() {
        $('table-popover').classList.remove('show');
    }

    function openMermaidModal() {
        $('mermaid-type').value = 'mindmap';
        updateMermaidTemplate();
        $('mermaid-modal').style.display = 'flex';
    }

    function closeMermaidModal() {
        $('mermaid-modal').style.display = 'none';
    }

    function updateMermaidTemplate() {
        $('mermaid-code').value = MERMAID_TEMPLATES[$('mermaid-type').value] || MERMAID_TEMPLATES.mindmap;
    }

    function confirmMermaidInsert() {
        const code = $('mermaid-code').value.trim();
        if (!code) {
            setStatus('请输入 Mermaid 源码');
            return;
        }
        runCommand(element => commands.insertMermaid(element, code));
        closeMermaidModal();
    }

    function insertLink() {
        const selected = textarea().value.slice(textarea().selectionStart, textarea().selectionEnd) || '链接文本';
        const url = prompt('请输入链接地址', 'https://');
        if (!url) {
            return;
        }
        runCommand(element => commands.insertLink(element, url, selected));
    }

    function insertImageByUrlOrFile() {
        const url = prompt('请输入图片 URL；留空则选择本地图片', '');
        if (url) {
            runCommand(element => commands.insertImage(element, '图片', url));
            return;
        }
        $('image-file-input').click();
    }

    function readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = () => reject(new Error('读取图片失败'));
            reader.readAsDataURL(file);
        });
    }

    async function uploadImageAsset(file) {
        if (!currentFilePath) {
            throw new Error('请先保存 Markdown 文件，再上传图片到 assets');
        }
        const dataUrl = await readFileAsDataUrl(file);
        const res = await fetch(`/api/asset/${encodeURIComponent(currentFilePath)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name, dataUrl })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || `图片上传失败（${res.status}）`);
        }
        return data.relativePath;
    }

    async function insertImageFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            setStatus('请选择图片文件');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('图片超过 5MB，请压缩后再上传');
            return;
        }
        try {
            const relativePath = await uploadImageAsset(file);
            runCommand(element => commands.insertImage(element, file.name, relativePath));
            setStatus(`已上传图片：${relativePath}`);
        } catch (error) {
            console.error('图片上传失败', error);
            alert(error.message || '图片上传失败');
            setStatus('图片上传失败');
        }
    }

    function exportMarkdown() {
        exportTools.downloadBlob(textarea().value, 'text/markdown;charset=utf-8', exportTools.baseFilename(currentFilePath, 'md'));
    }

    async function getRenderedBodyHtml() {
        await renderPreview({ force: true });
        const body = $('preview-body');
        return body ? body.innerHTML : `<pre>${exportTools.escapeHtml(textarea().value)}</pre>`;
    }

    async function exportHtml() {
        const bodyHtml = await getRenderedBodyHtml();
        exportTools.downloadBlob(exportTools.buildStandaloneHtml(currentFilePath, bodyHtml), 'text/html;charset=utf-8', exportTools.baseFilename(currentFilePath, 'html'));
    }

    async function exportWord() {
        const bodyHtml = await getRenderedBodyHtml();
        exportTools.downloadBlob(exportTools.buildWordHtml(bodyHtml), 'application/msword;charset=utf-8', exportTools.baseFilename(currentFilePath, 'doc'));
    }

    function exportPdf() {
        window.print();
    }

    function showDropOverlay() {
        $('drop-overlay').classList.add('show');
    }

    function hideDropOverlay() {
        $('drop-overlay').classList.remove('show');
    }

    function handleDroppedFile(file) {
        if (!file) {
            return;
        }
        const ext = file.name.split('.').pop().toLowerCase();
        if (['md', 'markdown', 'txt'].includes(ext)) {
            const reader = new FileReader();
            reader.onload = (event) => {
                pushHistory();
                textarea().value = event.target.result || '';
                markChanged(false);
                setStatus(`已导入：${file.name}`);
            };
            reader.readAsText(file);
            return;
        }
        if (file.type.startsWith('image/')) {
            insertImageFile(file);
        } else {
            setStatus('仅支持拖入 Markdown 文本或图片');
        }
    }

    function bindShortcuts() {
        document.addEventListener('keydown', (event) => {
            const key = event.key.toLowerCase();
            if ((event.metaKey || event.ctrlKey) && key === 's') {
                event.preventDefault();
                saveFile();
            } else if ((event.metaKey || event.ctrlKey) && key === 'z' && !event.shiftKey) {
                event.preventDefault();
                undo();
            } else if ((event.metaKey || event.ctrlKey) && (key === 'y' || (key === 'z' && event.shiftKey))) {
                event.preventDefault();
                redo();
            } else if ((event.metaKey || event.ctrlKey) && key === 'b') {
                event.preventDefault();
                runCommand(element => commands.wrapSelection(element, '**', '**', '文本'));
            } else if ((event.metaKey || event.ctrlKey) && key === 'i') {
                event.preventDefault();
                runCommand(element => commands.wrapSelection(element, '*', '*', '文本'));
            } else if ((event.metaKey || event.ctrlKey) && key === 'u') {
                event.preventDefault();
                runCommand(element => commands.wrapSelection(element, '<u>', '</u>', '文本'));
            } else if ((event.metaKey || event.ctrlKey) && key === 'k') {
                event.preventDefault();
                insertLink();
            } else if ((event.metaKey || event.ctrlKey) && key === 'f') {
                event.preventDefault();
                openFindModal();
            } else if ((event.metaKey || event.ctrlKey) && /^[1-6]$/.test(key)) {
                event.preventDefault();
                runCommand(element => commands.setHeading(element, parseInt(key, 10)));
            } else if (event.key === 'Tab' && document.activeElement === textarea()) {
                event.preventDefault();
                runCommand(element => commands.insertText(element, '    '));
            }
        });
    }

    function bindUI() {
        const element = textarea();
        element.addEventListener('input', () => {
            unsaved = true;
            recordHistorySoon();
            scheduleRender();
            const scrollRange = Math.max(element.scrollHeight - element.clientHeight, 1);
            syncPreviewToRatio(element.scrollTop / scrollRange, { smooth: false, force: true });
        });
        element.addEventListener('mouseup', () => syncPreviewToCursor({ smooth: false, force: true, highlight: false }));
        element.addEventListener('keyup', (event) => {
            const navKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'];
            if (navKeys.includes(event.key)) {
                syncPreviewToCursor({ smooth: false, force: true });
            }
        });
        element.addEventListener('scroll', syncPreviewToScroll);

        $('btn-save').addEventListener('click', () => saveFile());
        $('btn-save-as').addEventListener('click', openSaveAsModal);
        $('btn-back').addEventListener('click', goBack);
        $('btn-toggle-preview').addEventListener('click', togglePreview);

        $('btn-bold').addEventListener('click', () => runCommand(el => commands.wrapSelection(el, '**', '**', '文本')));
        $('btn-italic').addEventListener('click', () => runCommand(el => commands.wrapSelection(el, '*', '*', '文本')));
        $('btn-underline').addEventListener('click', () => runCommand(el => commands.wrapSelection(el, '<u>', '</u>', '文本')));
        $('btn-strike').addEventListener('click', () => runCommand(el => commands.wrapSelection(el, '~~', '~~', '文本')));
        $('btn-inline-code').addEventListener('click', () => runCommand(el => commands.wrapSelection(el, '`', '`', 'code')));
        $('btn-code-block').addEventListener('click', () => runCommand(el => commands.insertFence(el, '', 'code')));
        for (let level = 1; level <= 6; level++) {
            $(`btn-h${level}`).addEventListener('click', () => runCommand(el => commands.setHeading(el, level)));
        }
        $('btn-quote').addEventListener('click', () => runCommand(el => commands.prefixSelectedLines(el, '> ', '引用')));
        $('btn-ul').addEventListener('click', () => runCommand(el => commands.prefixSelectedLines(el, '- ', '列表项')));
        $('btn-ol').addEventListener('click', () => runCommand(el => commands.prefixSelectedLines(el, '1. ', '列表项')));
        $('btn-task').addEventListener('click', () => runCommand(el => commands.prefixSelectedLines(el, '- [ ] ', '任务')));
        $('btn-link').addEventListener('click', insertLink);
        $('btn-image-url').addEventListener('click', insertImageByUrlOrFile);
        $('image-file-input').addEventListener('change', event => {
            insertImageFile(event.target.files[0]).finally(() => {
                event.target.value = '';
            });
        });
        $('btn-table').addEventListener('click', toggleTablePopover);
        $('btn-mermaid').addEventListener('click', openMermaidModal);
        $('btn-find').addEventListener('click', openFindModal);
        $('btn-export-md').addEventListener('click', exportMarkdown);
        $('btn-export-html').addEventListener('click', exportHtml);
        $('btn-export-word').addEventListener('click', exportWord);
        $('btn-export-pdf').addEventListener('click', exportPdf);

        $('saveas-cancel').addEventListener('click', closeSaveAsModal);
        $('saveas-confirm').addEventListener('click', confirmSaveAs);
        $('override-cancel').addEventListener('click', closeOverrideModal);
        $('override-confirm').addEventListener('click', confirmOverride);

        $('find-close').addEventListener('click', closeFindModal);
        $('find-next').addEventListener('click', findNext);
        $('replace-one').addEventListener('click', replaceOne);
        $('replace-all').addEventListener('click', replaceAll);
        $('find-query').addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                findNext();
            }
        });

        $('mermaid-type').addEventListener('change', updateMermaidTemplate);
        $('mermaid-cancel').addEventListener('click', closeMermaidModal);
        $('mermaid-confirm').addEventListener('click', confirmMermaidInsert);

        document.addEventListener('click', (event) => {
            if (!$('table-popover').contains(event.target) && event.target !== $('btn-table')) {
                closeTablePopover();
            }
        });

        document.addEventListener('dragenter', (event) => {
            event.preventDefault();
            dragCounter += 1;
            showDropOverlay();
        });
        document.addEventListener('dragleave', (event) => {
            event.preventDefault();
            dragCounter -= 1;
            if (dragCounter <= 0) {
                dragCounter = 0;
                hideDropOverlay();
            }
        });
        document.addEventListener('dragover', event => event.preventDefault());
        document.addEventListener('drop', (event) => {
            event.preventDefault();
            dragCounter = 0;
            hideDropOverlay();
            handleDroppedFile(event.dataTransfer.files[0]);
        });

        window.addEventListener('beforeunload', (event) => {
            if (!unsaved) {
                return;
            }
            event.preventDefault();
            event.returnValue = '';
        });
    }

    function init() {
        applyThemeFromViewer();
        renderer = new MarkdownRenderer();
        if (localStorage.getItem('editor-preview-hidden') === '1') {
            $('preview-pane').classList.add('hidden');
        }
        initTableGrid();
        bindShortcuts();
        bindUI();
        loadFile();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
// AIGC END
