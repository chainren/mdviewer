class FileTree {
    constructor() {
        this.container = document.getElementById('file-tree');
        this.files = [];
        this.currentFile = null;
        this.onFileSelect = null;
        this.contextMenu = null;
        this.init();
    }

    init() {
        this.loadFiles();
        document.getElementById('refresh-files').addEventListener('click', () => {
            this.loadFiles();
        });
        
        // 添加键盘导航支持
        this.setupKeyboardNavigation();
        
        // 添加右键菜单支持
        this.setupContextMenu();
    }
    
    setupKeyboardNavigation() {
        this.container.addEventListener('keydown', (e) => {
            const items = Array.from(this.container.querySelectorAll('.file-tree-item'));
            const currentIndex = items.findIndex(item => item.classList.contains('focused'));
            
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.focusItem(items, currentIndex + 1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.focusItem(items, currentIndex - 1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.handleExpand(currentIndex, items);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.handleCollapse(currentIndex, items);
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    this.handleSelect(currentIndex, items);
                    break;
                case 'Home':
                    e.preventDefault();
                    this.focusItem(items, 0);
                    break;
                case 'End':
                    e.preventDefault();
                    this.focusItem(items, items.length - 1);
                    break;
            }
        });
        
        // 使文件树可以获得焦点
        this.container.setAttribute('tabindex', '0');
    }
    
    focusItem(items, index) {
        if (index < 0 || index >= items.length) return;
        
        // 移除之前的焦点
        items.forEach(item => item.classList.remove('focused'));
        
        // 添加新的焦点
        items[index].classList.add('focused');
        items[index].focus();
        
        // 确保项目在视图中
        items[index].scrollIntoView({ block: 'nearest' });
    }
    
    handleExpand(currentIndex, items) {
        if (currentIndex < 0 || currentIndex >= items.length) return;
        
        const item = items[currentIndex];
        const fileData = this.findFileDataByElement(item);
        
        if (fileData && fileData.type === 'directory') {
            if (!fileData.expanded) {
                this.toggleDirectory(fileData, item);
            } else {
                // 如果已经展开，移动到第一个子项
                const nextItem = this.findNextVisibleItem(items, currentIndex);
                if (nextItem) {
                    this.focusItem(items, items.indexOf(nextItem));
                }
            }
        }
    }
    
    handleCollapse(currentIndex, items) {
        if (currentIndex < 0 || currentIndex >= items.length) return;
        
        const item = items[currentIndex];
        const fileData = this.findFileDataByElement(item);
        
        if (fileData && fileData.type === 'directory' && fileData.expanded) {
            this.toggleDirectory(fileData, item);
        } else {
            // 如果不是目录或已收缩，尝试找到父项
            const parentItem = this.findParentItem(items, currentIndex);
            if (parentItem) {
                this.focusItem(items, items.indexOf(parentItem));
            }
        }
    }
    
    handleSelect(currentIndex, items) {
        if (currentIndex < 0 || currentIndex >= items.length) return;
        
        const item = items[currentIndex];
        const fileData = this.findFileDataByElement(item);
        
        if (fileData) {
            if (fileData.type === 'file') {
                this.selectFile(fileData, item);
            } else if (fileData.type === 'directory') {
                this.toggleDirectory(fileData, item);
            }
        }
    }
    
    findNextVisibleItem(items, currentIndex) {
        // 简化的实现：返回下一个项目
        return items[currentIndex + 1] || null;
    }
    
    findParentItem(items, currentIndex) {
        // 简化的实现：找到级别更低的项目
        const currentItem = items[currentIndex];
        const currentLevel = parseInt(currentItem.getAttribute('data-level')) || 0;
        
        for (let i = currentIndex - 1; i >= 0; i--) {
            const item = items[i];
            const level = parseInt(item.getAttribute('data-level')) || 0;
            if (level < currentLevel) {
                return item;
            }
        }
        return null;
    }
    
    findFileDataByElement(element) {
        // 通过元素找到对应的文件数据
        const itemText = element.querySelector('.file-name')?.textContent;
        if (!itemText) return null;
        
        return this.findFileDataByName(this.files, itemText);
    }
    
    findFileDataByName(files, name, currentPath = '') {
        for (const file of files) {
            if (file.name === name) {
                return file;
            }
            
            if (file.type === 'directory' && file.children) {
                const found = this.findFileDataByName(file.children, name, currentPath + '/' + file.name);
                if (found) return found;
            }
        }
        return null;
    }
    
    setupContextMenu() {
        // 创建右键菜单元素
        this.createContextMenu();
        
        // 添加全局点击事件来关闭菜单
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });
        
        // 阻止右键菜单的默认行为
        document.addEventListener('contextmenu', (e) => {
            if (!e.target.closest('.file-tree-item')) {
                this.hideContextMenu();
            }
        });
    }
    
    createContextMenu() {
        this.contextMenu = document.createElement('div');
        this.contextMenu.className = 'context-menu';
        this.contextMenu.style.display = 'none';
        document.body.appendChild(this.contextMenu);
    }
    
    showContextMenu(event, file) {
        event.preventDefault();
        event.stopPropagation();
        
        this.hideContextMenu();
        
        // 清空菜单
        this.contextMenu.innerHTML = '';
        
        // 添加菜单项
        if (file.type === 'file') {
            this.addContextMenuItem('📖 打开文件', () => {
                this.selectFile(file, null);
                this.hideContextMenu();
            });
            
            this.addContextMenuItem('✏️ 编辑文件', () => {
                this.editFile(file);
                this.hideContextMenu();
            });
            
            this.addContextMenuItem('📋 复制路径', () => {
                this.copyFilePath(file);
                this.hideContextMenu();
            });
        } else if (file.type === 'directory') {
            this.addContextMenuItem(file.expanded ? '📁 折叠目录' : '📂 展开目录', () => {
                const element = this.findElementByFile(file);
                if (element) {
                    this.toggleDirectory(file, element);
                }
                this.hideContextMenu();
            });
            
            this.addContextMenuItem('🔄 刷新目录', () => {
                this.refreshDirectory(file);
                this.hideContextMenu();
            });
        }
        
        this.addContextMenuSeparator();
        
        this.addContextMenuItem('📄 新建文件', () => {
            this.createNewFile(file);
            this.hideContextMenu();
        });
        
        this.addContextMenuItem('📁 新建文件夹', () => {
            this.createNewDirectory(file);
            this.hideContextMenu();
        });
        
        // 定位菜单
        this.contextMenu.style.left = event.pageX + 'px';
        this.contextMenu.style.top = event.pageY + 'px';
        this.contextMenu.style.display = 'block';
    }
    
    addContextMenuItem(label, onClick) {
        const item = document.createElement('div');
        item.className = 'context-menu-item';
        item.textContent = label;
        item.addEventListener('click', onClick);
        this.contextMenu.appendChild(item);
    }
    
    addContextMenuSeparator() {
        const separator = document.createElement('div');
        separator.className = 'context-menu-separator';
        this.contextMenu.appendChild(separator);
    }
    
    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.style.display = 'none';
        }
    }
    
    findElementByFile(file) {
        const items = this.container.querySelectorAll('.file-tree-item');
        for (const item of items) {
            const fileName = item.querySelector('.file-name')?.textContent;
            if (fileName === file.name) {
                return item;
            }
        }
        return null;
    }
    
    editFile(file) {
        if (this.onFileSelect) {
            this.onFileSelect(file);
        }
        
        // 触发编辑功能
        const editEvent = new CustomEvent('file-edit', { detail: file });
        document.dispatchEvent(editEvent);
    }
    
    copyFilePath(file) {
        const fullPath = file.path;
        navigator.clipboard.writeText(fullPath).then(() => {
            this.showNotification('文件路径已复制到剪贴板');
        }).catch(() => {
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = fullPath;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('文件路径已复制到剪贴板');
        });
    }
    
    refreshDirectory(directory) {
        this.loadFiles();
        this.showNotification('目录已刷新');
    }
    
    async createNewFile(parentFile) {
        const fileName = prompt('请输入新文件名（包含扩展名，支持 .md/.markdown/.mdown/.mkd/.mkdn）:');
        if (!fileName) return;
        const allowed = ['.md', '.markdown', '.mdown', '.mkd', '.mkdn'];
        const lower = fileName.toLowerCase();
        if (!allowed.some(ext => lower.endsWith(ext))) {
            this.showNotification('仅支持 Markdown 扩展名');
            return;
        }
        const dirPath = parentFile && parentFile.type === 'directory' ? (parentFile.path || parentFile.name) : '';
        const target = dirPath ? `${dirPath}/${fileName}` : fileName;
        try {
            const res = await fetch(`/api/file/${encodeURIComponent(target)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: '' })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                this.showNotification(data.error || `创建失败（${res.status}）`);
                return;
            }
            this.showNotification(`已创建：${target}`);
            // 刷新文件树，并跳转到编辑器
            await this.loadFiles();
            const returnUrl = window.location.pathname + window.location.search;
            const editUrl = `/editor.html?file=${encodeURIComponent(target)}&return=${encodeURIComponent(returnUrl)}`;
            window.location.href = editUrl;
        } catch (err) {
            console.error('创建文件失败', err);
            this.showNotification('创建文件失败');
        }
    }
    
    createNewDirectory(parentFile) {
        const dirName = prompt('请输入新文件夹名称:');
        if (dirName) {
            this.showNotification(`创建文件夹: ${dirName}`);
            // 这里可以添加实际的文件夹创建逻辑
        }
    }
    
    showNotification(message) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--accent-color, #007bff);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-size: 0.875rem;
            max-width: 300px;
            word-wrap: break-word;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    openNewFileModal(parentDir) {
        const backdrop = document.getElementById('newfile-modal');
        const dirInput = document.getElementById('newfile-dir');
        const nameInput = document.getElementById('newfile-name');
        if (!backdrop || !dirInput || !nameInput) {
            // 回退：若页面无弹窗，使用 prompt
            this.createNewFile(parentDir);
            return;
        }
        // 默认选中当前目录
        const dirPath = parentDir && parentDir.type === 'directory' ? (parentDir.path || parentDir.name) : '';
        dirInput.value = dirPath || '';
        nameInput.value = '';
        backdrop.style.display = 'flex';

        const cancel = document.getElementById('newfile-cancel');
        const confirm = document.getElementById('newfile-confirm');
        const onCancel = () => { backdrop.style.display = 'none'; cleanup(); };
        const onConfirm = () => { this.confirmCreateNewFile(); cleanup(); };
        const onBackdrop = (e) => { if (e.target === backdrop) onCancel(); };
        const onKey = (e) => { if (e.key === 'Escape') onCancel(); };

        cancel.addEventListener('click', onCancel);
        confirm.addEventListener('click', onConfirm);
        backdrop.addEventListener('click', onBackdrop);
        document.addEventListener('keydown', onKey, { once: true });

        function cleanup(){
            cancel.removeEventListener('click', onCancel);
            confirm.removeEventListener('click', onConfirm);
            backdrop.removeEventListener('click', onBackdrop);
        }
    }

    renderNewFileTree() {
        const host = document.getElementById('newfile-tree');
        if (!host) return;
        host.innerHTML = '';
        const renderNode = (node, parentPath='') => {
            const fullPath = node.type === 'directory' ? (parentPath ? `${parentPath}/${node.name}` : node.name) : node.path;
            const item = document.createElement('div');
            item.className = 'tree-item';
            item.textContent = node.name;
            item.title = fullPath;
            if (node.type === 'directory') {
                item.addEventListener('click', () => {
                    const dirInput = document.getElementById('newfile-dir');
                    if (dirInput) dirInput.value = fullPath;
                    // 高亮选中
                    host.querySelectorAll('.tree-item').forEach(el => el.classList.remove('selected'));
                    item.classList.add('selected');
                });
                host.appendChild(item);
                if (node.children && node.children.length) {
                    node.children.forEach(child => renderNode(child, fullPath));
                }
            }
        };
        this.files.forEach(root => renderNode(root, ''));
    }

    async confirmCreateNewFile() {
        const backdrop = document.getElementById('newfile-modal');
        const dirInput = document.getElementById('newfile-dir');
        const nameInput = document.getElementById('newfile-name');
        const dir = dirInput ? dirInput.value.trim() : '';
        const name = nameInput ? nameInput.value.trim() : '';
        const allowed = ['.md', '.markdown', '.mdown', '.mkd', '.mkdn'];
        const lower = name.toLowerCase();
        if (!name || !allowed.some(ext => lower.endsWith(ext))) {
            this.showNotification('请输入合法的 Markdown 文件名');
            return;
        }
        const target = dir ? `${dir}/${name}` : name;
        try {
            const res = await fetch(`/api/file/${encodeURIComponent(target)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: '' })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                this.showNotification(data.error || `创建失败（${res.status}）`);
                return;
            }
            if (backdrop) backdrop.style.display = 'none';
            await this.loadFiles();
            const returnUrl = window.location.pathname + window.location.search;
            const editUrl = `/editor.html?file=${encodeURIComponent(target)}&return=${encodeURIComponent(returnUrl)}`;
            window.location.href = editUrl;
        } catch (err) {
            console.error('创建文件失败', err);
            this.showNotification('创建文件失败');
        }
    }

    async loadFiles() {
        try {
            this.container.innerHTML = '<div class="loading">加载中...</div>';
            const response = await fetch('/api/files');
            this.files = await response.json();
            this.render();
            // 同步到新建弹窗的目录树
            this.renderNewFileTree();
        } catch (error) {
            console.error('Error loading files:', error);
            this.container.innerHTML = '<div class="error">加载文件失败</div>';
        }
    }

    render() {
        if (this.files.length === 0) {
            this.container.innerHTML = '<div class="placeholder">未找到 Markdown 文件</div>';
            return;
        }

        this.container.innerHTML = '';
        this.files.forEach(file => {
            this.container.appendChild(this.createFileElement(file));
        });
    }

    createFileElement(file, level = 0) {
        const element = document.createElement('div');
        element.className = `file-tree-item ${file.type}`;
        element.style.paddingLeft = `${level * 1.5 + 0.5}rem`;
        element.setAttribute('data-level', level);
        element.setAttribute('data-name', file.name);
        if (file.path) {
            element.setAttribute('data-path', file.path);
        }
        
        if (file.type === 'directory') {
            const expandIcon = document.createElement('span');
            expandIcon.className = `expand-icon ${file.expanded ? 'expanded' : ''}`;
            expandIcon.textContent = '▶';
            expandIcon.setAttribute('aria-expanded', file.expanded ? 'true' : 'false');
            element.appendChild(expandIcon);
            
            const icon = document.createElement('span');
            icon.className = 'file-icon';
            icon.textContent = file.expanded ? '📂' : '📁';
            element.appendChild(icon);
            
            const name = document.createElement('span');
            name.textContent = file.name;
            name.className = 'file-name';
            element.appendChild(name);

            // 目录级“+”新建文件按钮
            const addBtn = document.createElement('button');
            addBtn.className = 'add-file-btn';
            addBtn.textContent = '+';
            addBtn.title = '新建文件';
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openNewFileModal(file);
            });
            element.appendChild(addBtn);
            
            // 添加双击事件支持
            element.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                this.toggleDirectory(file, element);
            });
            
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDirectory(file, element);
            });
            
            // 添加右键菜单事件
            element.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showContextMenu(e, file);
            });
            
            if (file.children && file.children.length > 0) {
                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'file-tree-children' + (file.expanded ? ' expanded' : '');
                childrenContainer.style.maxHeight = file.expanded ? '1000px' : '0';
                childrenContainer.style.overflow = 'hidden';
                childrenContainer.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
                if (file.expanded) {
                    childrenContainer.style.opacity = '1';
                }
                
                file.children.forEach(child => {
                    childrenContainer.appendChild(this.createFileElement(child, level + 1));
                });
                
                const wrapper = document.createElement('div');
                wrapper.className = 'file-tree-wrapper';
                wrapper.appendChild(element);
                wrapper.appendChild(childrenContainer);
                
                // 初次展开的动画
                if (file.expanded) {
                    setTimeout(() => {
                        childrenContainer.style.maxHeight = childrenContainer.scrollHeight + 'px';
                        childrenContainer.style.opacity = '1';
                    }, 10);
                }
                
                return wrapper;
            }
        } else {
            const icon = document.createElement('span');
            icon.className = 'file-icon';
            icon.textContent = '📄';
            element.appendChild(icon);
            
            const name = document.createElement('span');
            name.textContent = file.name;
            name.className = 'file-name';
            element.appendChild(name);
            
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectFile(file, element);
            });
            
            // 添加右键菜单事件
            element.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showContextMenu(e, file);
            });
            
            if (this.currentFile && this.currentFile.path === file.path) {
                element.classList.add('active');
            }
        }
        
        return element;
    }

    toggleDirectory(directory, element) {
        const wasExpanded = directory.expanded;
        directory.expanded = !directory.expanded;
        
        // 获取展开图标和文件夹图标
        const expandIcon = element.querySelector('.expand-icon');
        const folderIcon = element.querySelector('.file-icon');
        // 精确定位紧邻子容器，避免选到其他层级
        const sibling = element.nextElementSibling;
        const childrenContainer = sibling && sibling.classList && sibling.classList.contains('file-tree-children') ? sibling : null;
        
        if (expandIcon) {
            expandIcon.classList.toggle('expanded', directory.expanded);
            expandIcon.setAttribute('aria-expanded', directory.expanded ? 'true' : 'false');
        }
        
        if (folderIcon) {
            folderIcon.textContent = directory.expanded ? '📂' : '📁';
        }
        
        if (childrenContainer) {
            if (directory.expanded) {
                // 展开动画
                childrenContainer.classList.add('expanded');
                childrenContainer.style.maxHeight = '0';
                childrenContainer.style.opacity = '0';
                
                setTimeout(() => {
                    childrenContainer.style.maxHeight = childrenContainer.scrollHeight + 'px';
                    childrenContainer.style.opacity = '1';
                }, 10);
                
                // 动画结束后重置max-height
                setTimeout(() => {
                    childrenContainer.style.maxHeight = 'none';
                }, 300);
            } else {
                // 收缩动画
                childrenContainer.style.maxHeight = childrenContainer.scrollHeight + 'px';
                
                setTimeout(() => {
                    childrenContainer.style.maxHeight = '0';
                    childrenContainer.style.opacity = '0';
                    childrenContainer.classList.remove('expanded');
                }, 10);
            }
        } else {
            // 如果没有子容器，重新渲染整个树，使新结构（含子容器）可见
            this.render();
        }
    }

    selectFile(file, element) {
        if (this.currentFile) {
            const prevActive = this.container.querySelector('.file-tree-item.active');
            if (prevActive) {
                prevActive.classList.remove('active');
            }
        }
        
        this.currentFile = file;
        if (element) {
            element.classList.add('active');
        }
        
        if (this.onFileSelect) {
            this.onFileSelect(file);
        }
    }

    setCurrentFile(file) {
        this.currentFile = file;
        this.render();
    }

    updateBreadcrumb(path) {
        const breadcrumb = document.getElementById('breadcrumb');
        const parts = path.split('/').filter(part => part);
        
        // 清空面包屑并重新构建，确保移除旧的事件监听器
        breadcrumb.innerHTML = '';
        
        // 添加根目录
        const rootItem = document.createElement('span');
        rootItem.className = 'breadcrumb-item';
        rootItem.setAttribute('data-path', '');
        rootItem.textContent = '根目录';
        rootItem.style.cursor = 'pointer';
        rootItem.addEventListener('click', (e) => {
            e.stopPropagation();
            this.loadFiles();
        });
        breadcrumb.appendChild(rootItem);
        
        let currentPath = '';
        parts.forEach((part, index) => {
            // 添加分隔符
            const separator = document.createElement('span');
            separator.textContent = ' / ';
            breadcrumb.appendChild(separator);
            
            // 添加路径部分
            currentPath += (index === 0 ? '' : '/') + part;
            const pathItem = document.createElement('span');
            pathItem.className = 'breadcrumb-item';
            pathItem.setAttribute('data-path', currentPath);
            pathItem.textContent = part;
            pathItem.style.cursor = 'pointer';
            pathItem.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemPath = e.currentTarget.getAttribute('data-path');
                if (itemPath) {
                    this.navigateToPath(itemPath);
                }
            });
            
            // 添加悬停效果
            pathItem.addEventListener('mouseenter', () => {
                pathItem.style.color = 'var(--accent-color, #007bff)';
                pathItem.style.textDecoration = 'underline';
            });
            
            pathItem.addEventListener('mouseleave', () => {
                pathItem.style.color = '';
                pathItem.style.textDecoration = '';
            });
            
            breadcrumb.appendChild(pathItem);
        });
    }
    
    navigateToPath(targetPath) {
        console.log('Navigating to path:', targetPath);
        // 查找对应的路径并展开
        const findAndExpandPath = (files, targetPath, currentPath = '') => {
            for (const file of files) {
                const fullPath = currentPath ? `${currentPath}/${file.name}` : file.name;
                
                if (fullPath === targetPath) {
                    if (file.type === 'directory') {
                        // 确保目录被展开
                        if (!file.expanded) {
                            file.expanded = true;
                        }
                        this.render();
                        // 滚动到该目录位置
                        setTimeout(() => {
                            const element = this.findElementByPath(targetPath);
                            if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                element.classList.add('highlighted');
                                setTimeout(() => {
                                    element.classList.remove('highlighted');
                                }, 1000);
                            }
                        }, 100);
                        return true;
                    } else if (file.type === 'file') {
                        this.selectFile(file, null);
                        return true;
                    }
                }
                
                if (file.type === 'directory' && file.children) {
                    if (findAndExpandPath(file.children, targetPath, fullPath)) {
                        file.expanded = true;
                        this.render();
                        return true;
                    }
                }
            }
            return false;
        };
        
        // 如果点击的是目录，切换展开状态；如果是文件，选择文件
        const targetFile = this.findFileByPath(this.files, targetPath);
        if (targetFile) {
            if (targetFile.type === 'directory') {
                targetFile.expanded = !targetFile.expanded;
                this.render();
            } else if (targetFile.type === 'file') {
                this.selectFile(targetFile, null);
            }
        } else {
            // 如果文件不存在，尝试展开路径
            findAndExpandPath(this.files, targetPath);
        }
    }
    
    findElementByPath(targetPath) {
        const items = this.container.querySelectorAll('.file-tree-item');
        for (const item of items) {
            const path = item.getAttribute('data-path');
            if (path === targetPath) return item;
        }
        return null;
    }

    findFileByPath(files, targetPath, currentPath = '') {
        for (const file of files) {
            const fullPath = currentPath ? `${currentPath}/${file.name}` : file.name;
            
            if (fullPath === targetPath) {
                return file;
            }
            
            if (file.type === 'directory' && file.children) {
                const found = this.findFileByPath(file.children, targetPath, fullPath);
                if (found) return found;
            }
        }
        return null;
    }
}

window.FileTree = FileTree;