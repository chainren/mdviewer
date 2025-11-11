// AIGC START
(function(){
  const $ = (id) => document.getElementById(id);
  const qs = (s) => document.querySelector(s);

  const params = new URLSearchParams(window.location.search);
  const filePath = params.get('file');
  let originUrl = params.get('return');

  let renderer;
  let renderDebounce;
  const renderDelay = 250;
  const ACTIVE_HEADING_CLASS = 'active-preview-heading';
  let currentOutline = [];
  let lastSyncedHeadingId = null;
  let pendingSync = null;
  let lastActiveHeadingElement = null;

  function setStatus(text){
    const s = $('status');
    if(s) s.textContent = text;
  }

  function applyThemeFromViewer(){
    const saved = localStorage.getItem('markdown-viewer-theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
  }

  let lastModified = undefined;
  async function loadFile(){
    if(!filePath) return;
    try{
      $('editor-title').textContent = `编辑：${filePath}`;
      const res = await fetch(`/api/file/${encodeURIComponent(filePath)}`);
      if(!res.ok){ throw new Error(`加载失败：${res.status}`); }
      const data = await res.json();
      $('editor-textarea').value = data.content || '';
      lastModified = data.lastModified;
      scheduleRender();
      setStatus('已加载');
    }catch(err){
      console.error(err);
      setStatus('加载失败');
    }
  }

  function scheduleRender(){
    clearTimeout(renderDebounce);
    renderDebounce = setTimeout(renderPreview, renderDelay);
  }

  function isPreviewHidden() {
    const pane = $('preview-pane');
    return !pane || pane.classList.contains('hidden');
  }

  function getCursorLine() {
    const ta = $('editor-textarea');
    if (!ta) return 0;
    const pos = ta.selectionStart || 0;
    const value = ta.value.slice(0, pos);
    if (!value) return 0;
    return value.split('\n').length - 1;
  }

  function getTotalLines() {
    const ta = $('editor-textarea');
    if (!ta) return 0;
    const value = ta.value;
    if (!value) return 0;
    return value.split('\n').length;
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

    const { smooth = true, force = false } = options;
    const line = typeof position.line === 'number' ? position.line : 0;
    const ratio = typeof position.ratio === 'number' ? clamp(position.ratio, 0, 1) : 0;
    const totalLines = Math.max(getTotalLines() - 1, 0);

    if (!currentOutline.length) {
      const top = ratio * Math.max(previewBody.scrollHeight - previewBody.clientHeight, 0);
      scrollPreview(previewBody, top, smooth);
      highlightHeading(null);
      lastSyncedHeadingId = null;
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
        const sectionTopSpan = Math.max(nextTop - targetTop, 0);
        desiredTop = targetTop + progressWithin * sectionTopSpan;
      }
    } else {
      const maxScroll = Math.max(previewBody.scrollHeight - previewBody.clientHeight, 0);
      if (totalLines > target.line) {
        const sectionLineSpan = Math.max(totalLines - target.line, 1);
        const progressWithin = clamp((line - target.line) / sectionLineSpan, 0, 1);
        desiredTop = targetTop + progressWithin * Math.max(maxScroll - targetTop, 0);
      }
    }

    desiredTop = Math.max(desiredTop - 16, 0);

    if (!force && Math.abs(previewBody.scrollTop - desiredTop) < 1 && lastSyncedHeadingId === target.id) {
      highlightHeading(heading);
      return;
    }

    scrollPreview(previewBody, desiredTop, smooth);
    highlightHeading(heading);
    lastSyncedHeadingId = target.id;
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

  function syncPreviewToScroll() {
    if (isPreviewHidden()) {
      return;
    }
    const ta = $('editor-textarea');
    if (!ta) return;
    const scrollRange = Math.max(ta.scrollHeight - ta.clientHeight, 1);
    const ratio = ta.scrollTop / scrollRange;
    const totalLines = Math.max(getTotalLines() - 1, 0);
    const line = Math.round(ratio * totalLines);
    scheduleSync({ line, ratio }, { smooth: false, force: true });
  }

  async function renderPreview(){
    try{
      const pane = $('preview-pane');
      if (pane && pane.classList.contains('hidden')) return; // 预览隐藏时跳过渲染
      const content = $('editor-textarea').value;
      const outline = await renderer.renderContent(content, 'preview-body');
      currentOutline = Array.isArray(outline) ? outline : [];
      lastSyncedHeadingId = null;
      highlightHeading(null);
      syncPreviewToCursor({ smooth: false, force: true });
    }catch(err){
      console.error('预览渲染失败', err);
    }
  }

  function surroundSelection(prefix, suffix){
    const ta = $('editor-textarea');
    const start = ta.selectionStart, end = ta.selectionEnd;
    const before = ta.value.slice(0, start);
    const sel = ta.value.slice(start, end);
    const after = ta.value.slice(end);
    ta.value = before + prefix + sel + suffix + after;
    ta.selectionStart = start + prefix.length;
    ta.selectionEnd = end + prefix.length;
    ta.focus();
    scheduleRender();
    unsaved = true;
  }

  function insertAtLineStart(prefix){
    const ta = $('editor-textarea');
    const pos = ta.selectionStart;
    const value = ta.value;
    const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
    ta.value = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    ta.selectionStart = ta.selectionEnd = pos + prefix.length;
    ta.focus();
    scheduleRender();
    unsaved = true;
  }

  function bindShortcuts(){
    document.addEventListener('keydown', (e)=>{
      const key = e.key.toLowerCase();
      if((e.metaKey || e.ctrlKey) && key === 's'){
        e.preventDefault();
        saveFile();
      }
      if((e.metaKey || e.ctrlKey) && key === 'b'){
        e.preventDefault();
        surroundSelection('**', '**');
      }
      if((e.metaKey || e.ctrlKey) && key === 'i'){
        e.preventDefault();
        surroundSelection('*', '*');
      }
      if((e.metaKey || e.ctrlKey) && /[1-6]/.test(key)){
        e.preventDefault();
        insertAtLineStart('#'.repeat(parseInt(key)) + ' ');
      }
    });
  }

  async function saveFile(targetPath){
    try{
      const pathToSave = targetPath || filePath;
      if(!pathToSave){ return; }
      const content = $('editor-textarea').value;
      const res = await fetch(`/api/file/${encodeURIComponent(pathToSave)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, lastModified })
      });
      let data;
      try {
        data = await res.json();
      } catch (e) {
        const text = await res.text();
        throw new Error(`保存失败（${res.status}）：${text.slice(0,200)}`);
      }
      if(!res.ok || !data.success){
        if (res.status === 409) {
          openOverrideModal(pathToSave);
          return;
        }
        throw new Error(data.error || `保存失败（${res.status}）`);
      }
      lastModified = data.lastModified;
      setStatus('已保存');
      unsaved = false;
    }catch(err){
      console.error('保存错误', err);
      alert(err.message || '保存失败');
      setStatus('保存失败');
    }
  }

  function openOverrideModal(target){
    const b = $('override-modal');
    b.style.display = 'flex';
    b.dataset.target = target;
  }
  function closeOverrideModal(){
    const b = $('override-modal');
    b.style.display = 'none';
    delete b.dataset.target;
  }
  async function confirmOverride(){
    const b = $('override-modal');
    const target = b.dataset.target || filePath;
    const content = $('editor-textarea').value;
    const res = await fetch(`/api/file/${encodeURIComponent(target)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, override: true })
    });
    const data = await res.json();
    if(!res.ok || !data.success){
      alert(data.error || `覆盖保存失败（${res.status}）`);
      return;
    }
    lastModified = data.lastModified;
    setStatus('已保存');
    unsaved = false;
    closeOverrideModal();
  }

  async function openSaveAsModal(){
    const backdrop = $('saveas-modal');
    backdrop.style.display = 'flex';
    // 加载文件树
    try {
      const res = await fetch('/api/files');
      const files = await res.json();
      renderSaveAsTree(files);
    } catch (e) {
      console.error('加载文件树失败', e);
      $('saveas-tree').innerHTML = '<div class="error">加载文件树失败</div>';
    }
  }

  function closeSaveAsModal(){
    const backdrop = $('saveas-modal');
    backdrop.style.display = 'none';
  }

  function renderSaveAsTree(files){
    const container = $('saveas-tree');
    container.innerHTML = '';

    function createItem(node, level){
      const el = document.createElement('div');
      el.className = 'tree-item';
      el.style.paddingLeft = `${level * 1.25 + 0.5}rem`;
      el.textContent = (node.type === 'directory' ? '📁 ' : '📄 ') + node.name;
      el.dataset.path = node.path || '';
      el.dataset.type = node.type;
      el.addEventListener('click', ()=>{
        // 仅允许选择目录作为目标目录
        container.querySelectorAll('.tree-item').forEach(i=> i.classList.remove('selected'));
        el.classList.add('selected');
        if (node.type === 'directory') {
          $('saveas-dir').value = node.path || '';
        } else {
          const dir = node.path ? node.path.replace(/\/[^\/]+$/, '') : '';
          $('saveas-dir').value = dir;
          $('saveas-name').value = node.name;
        }
      });
      return el;
    }

    function traverse(nodes, level){
      nodes.forEach(n => {
        container.appendChild(createItem(n, level));
        if (n.type === 'directory' && n.children && n.children.length) {
          traverse(n.children, level + 1);
        }
      });
    }

    traverse(files, 0);
  }

  async function confirmSaveAs(){
    const dir = $('saveas-dir').value.trim();
    const name = $('saveas-name').value.trim();
    if (!name) { alert('请输入文件名'); return; }
    const target = dir ? `${dir.replace(/\/+$/, '')}/${name}` : name;
    if(!/\.(md|markdown|mdown|mkd|mkdn)$/i.test(target)){
      alert('仅支持保存为 Markdown 文件');
      return;
    }
    await saveFile(target);
    const url = new URL(window.location.href);
    url.searchParams.set('file', target);
    history.replaceState(null, '', url.toString());
    $('editor-title').textContent = `编辑：${target}`;
    closeSaveAsModal();
  }

  function saveAs(){
    openSaveAsModal();
  }

  function togglePreview(){
    const pane = $('preview-pane');
    if (!pane) return;
    pane.classList.toggle('hidden');
    const hidden = pane.classList.contains('hidden');
    try { localStorage.setItem('editor-preview-hidden', hidden ? '1' : '0'); } catch {}
    if (hidden) {
      highlightHeading(null);
    } else {
      scheduleRender();
    }
  }

  function goBack(){
    // 若提供 return 参数，优先回到该 URL；否则回到根预览并携带 ?file
    const previewUrl = originUrl || (`/index.html?file=${encodeURIComponent(filePath || '')}`);
    if (unsaved) {
      const ok = confirm('存在未保存的更改，确定要返回吗？');
      if (!ok) return;
    }
    window.location.href = previewUrl;
  }

  let unsaved = false;

  function bindUI(){
    const textarea = $('editor-textarea');
    if (!textarea) {
      return;
    }
    textarea.addEventListener('input', ()=>{
      unsaved = true;
      scheduleRender();
      syncPreviewToCursor({ smooth: false, force: true });
    });

    textarea.addEventListener('mouseup', ()=>{
      syncPreviewToCursor({ smooth: false, force: true });
    });

    textarea.addEventListener('keyup', (e)=>{
      const navKeys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'];
      if (navKeys.includes(e.key)) {
        syncPreviewToCursor({ smooth: false, force: true });
      }
    });

    textarea.addEventListener('scroll', ()=>{
      syncPreviewToScroll();
    });

    $('btn-save').addEventListener('click', ()=> { saveFile(); unsaved = false; });
    $('btn-save-as').addEventListener('click', ()=> { saveAs(); });
    $('btn-toggle-preview').addEventListener('click', togglePreview);
    $('btn-back').addEventListener('click', goBack);

    $('btn-bold').addEventListener('click', ()=> surroundSelection('**','**'));
    $('btn-italic').addEventListener('click', ()=> surroundSelection('*','*'));
    $('btn-h1').addEventListener('click', ()=> insertAtLineStart('# '));
    $('btn-h2').addEventListener('click', ()=> insertAtLineStart('## '));
    $('btn-h3').addEventListener('click', ()=> insertAtLineStart('### '));
    $('btn-h4').addEventListener('click', ()=> insertAtLineStart('#### '));
    $('btn-h5').addEventListener('click', ()=> insertAtLineStart('##### '));
    $('btn-h6').addEventListener('click', ()=> insertAtLineStart('###### '));

    $('saveas-cancel').addEventListener('click', closeSaveAsModal);
    $('saveas-confirm').addEventListener('click', confirmSaveAs);

    $('override-cancel').addEventListener('click', closeOverrideModal);
    $('override-confirm').addEventListener('click', confirmOverride);

    window.addEventListener('beforeunload', (e)=>{
      if (!unsaved) return;
      e.preventDefault();
      e.returnValue = '';
    });
  }

  function init(){
    applyThemeFromViewer();
    renderer = new MarkdownRenderer();

    const hidden = (localStorage.getItem('editor-preview-hidden') === '1');
    if (hidden) $('preview-pane').classList.add('hidden');

    bindShortcuts();
    bindUI();
    loadFile();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
//AIGC END
