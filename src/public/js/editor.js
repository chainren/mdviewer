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

  async function renderPreview(){
    try{
      const pane = $('preview-pane');
      if (pane && pane.classList.contains('hidden')) return; // 预览隐藏时跳过渲染
      const content = $('editor-textarea').value;
      const outline = await renderer.renderContent(content, 'preview-body');
      // 不使用 outline，这里只负责渲染
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
      const data = await res.json();
      if(!res.ok || !data.success){
        throw new Error(data.error || '保存失败');
      }
      lastModified = data.lastModified;
      setStatus('已保存');
    }catch(err){
      console.error(err);
      alert(err.message || '保存失败');
      setStatus('保存失败');
    }
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
    pane.classList.toggle('hidden');
    const hidden = pane.classList.contains('hidden');
    try { localStorage.setItem('editor-preview-hidden', hidden ? '1' : '0'); } catch {}
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
    $('editor-textarea').addEventListener('input', ()=>{ unsaved = true; scheduleRender(); });
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