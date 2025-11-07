class FileTree {
    constructor() {
        this.container = document.getElementById('file-tree');
        this.files = [];
        this.currentFile = null;
        this.onFileSelect = null;
        this.init();
    }

    init() {
        this.loadFiles();
        document.getElementById('refresh-files').addEventListener('click', () => {
            this.loadFiles();
        });
    }

    async loadFiles() {
        try {
            this.container.innerHTML = '<div class="loading">加载中...</div>';
            const response = await fetch('/api/files');
            this.files = await response.json();
            this.render();
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
        
        if (file.type === 'directory') {
            const expandIcon = document.createElement('span');
            expandIcon.className = `expand-icon ${file.expanded ? 'expanded' : ''}`;
            expandIcon.textContent = '▶';
            element.appendChild(expandIcon);
            
            const icon = document.createElement('span');
            icon.className = 'file-icon';
            icon.textContent = file.expanded ? '📂' : '📁';
            element.appendChild(icon);
            
            const name = document.createElement('span');
            name.textContent = file.name;
            element.appendChild(name);
            
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDirectory(file, element);
            });
            
            if (file.expanded && file.children) {
                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'file-tree-children';
                file.children.forEach(child => {
                    childrenContainer.appendChild(this.createFileElement(child, level + 1));
                });
                
                const wrapper = document.createElement('div');
                wrapper.appendChild(element);
                wrapper.appendChild(childrenContainer);
                return wrapper;
            }
        } else {
            const icon = document.createElement('span');
            icon.className = 'file-icon';
            icon.textContent = '📄';
            element.appendChild(icon);
            
            const name = document.createElement('span');
            name.textContent = file.name;
            element.appendChild(name);
            
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectFile(file, element);
            });
            
            if (this.currentFile && this.currentFile.path === file.path) {
                element.classList.add('active');
            }
        }
        
        return element;
    }

    toggleDirectory(directory, element) {
        directory.expanded = !directory.expanded;
        this.render();
    }

    selectFile(file, element) {
        if (this.currentFile) {
            const prevActive = this.container.querySelector('.file-tree-item.active');
            if (prevActive) {
                prevActive.classList.remove('active');
            }
        }
        
        this.currentFile = file;
        element.classList.add('active');
        
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
        
        breadcrumb.innerHTML = '<span class="breadcrumb-item" data-path="">根目录</span>';
        
        let currentPath = '';
        parts.forEach((part, index) => {
            currentPath += (index === 0 ? '' : '/') + part;
            breadcrumb.innerHTML += ` / <span class="breadcrumb-item" data-path="${currentPath}">${part}</span>`;
        });
        
        // 为面包屑项添加点击事件
        const breadcrumbItems = breadcrumb.querySelectorAll('.breadcrumb-item');
        breadcrumbItems.forEach(item => {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
                const itemPath = item.getAttribute('data-path');
                if (itemPath) {
                    this.navigateToPath(itemPath);
                } else {
                    // 根目录，刷新文件树
                    this.loadFiles();
                }
            });
        });
    }
    
    navigateToPath(targetPath) {
        // 查找对应的路径并展开
        const findAndExpandPath = (files, targetPath, currentPath = '') => {
            for (const file of files) {
                const fullPath = currentPath ? `${currentPath}/${file.name}` : file.name;
                
                if (fullPath === targetPath) {
                    if (file.type === 'directory') {
                        file.expanded = true;
                        this.render();
                        return true;
                    } else if (file.type === 'file') {
                        this.selectFile(file, null);
                        return true;
                    }
                }
                
                if (file.type === 'directory' && file.children) {
                    if (findAndExpandPath(file.children, targetPath, fullPath)) {
                        file.expanded = true;
                        return true;
                    }
                }
            }
            return false;
        };
        
        findAndExpandPath(this.files, targetPath);
    }
}

window.FileTree = FileTree;