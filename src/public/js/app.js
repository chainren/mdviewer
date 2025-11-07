class MarkdownViewerApp {
    constructor() {
        this.fileTree = null;
        this.renderer = null;
        this.currentFile = null;
        this.outlineVisible = true;
        this.themes = ['light', 'dark', 'blue', 'green', 'purple'];
        this.currentTheme = 0;
        this.websocket = null;
        this.init();
    }

    init() {
        this.setupTheme();
        this.setupRenderer();
        this.setupFileTree();
        this.setupWebSocket();
        this.setupEventListeners();
        this.loadInitialFile();
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('markdown-viewer-theme') || 'light';
        this.currentTheme = this.themes.indexOf(savedTheme) >= 0 ? this.themes.indexOf(savedTheme) : 0;
        this.applyTheme();
    }

    setupRenderer() {
        this.renderer = new MarkdownRenderer();
    }

    setupFileTree() {
        this.fileTree = new FileTree();
        this.fileTree.onFileSelect = (file) => {
            this.loadFile(file);
        };
    }

    setupWebSocket() {
        try {
            this.websocket = new WebSocket('ws://localhost:8080');
            
            this.websocket.onopen = () => {
                console.log('WebSocket connected');
            };
            
            this.websocket.onmessage = (event) => {
                const message = JSON.parse(event.data);
                this.handleWebSocketMessage(message);
            };
            
            this.websocket.onclose = () => {
                console.log('WebSocket disconnected');
                setTimeout(() => this.setupWebSocket(), 5000);
            };
            
            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
        }
    }

    handleWebSocketMessage(message) {
        if (message.type === 'file-change' && this.currentFile) {
            const changedFile = message.data.path;
            if (changedFile.includes(this.currentFile.path)) {
                this.loadFile(this.currentFile, true);
            }
        }
    }

    setupEventListeners() {
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.cycleTheme();
        });

        document.getElementById('toggle-outline').addEventListener('click', () => {
            this.toggleOutline();
        });

        document.getElementById('refresh-content').addEventListener('click', () => {
            if (this.currentFile) {
                this.loadFile(this.currentFile, true);
            }
        });

        document.getElementById('edit-file').addEventListener('click', () => {
            this.editCurrentFile();
        });

        // 移动端菜单切换
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'r':
                        e.preventDefault();
                        if (this.currentFile) {
                            this.loadFile(this.currentFile, true);
                        }
                        break;
                    case 'e':
                        e.preventDefault();
                        this.editCurrentFile();
                        break;
                    case 't':
                        e.preventDefault();
                        this.cycleTheme();
                        break;
                }
            } else if (e.key === 'Escape') {
                // ESC键关闭移动端菜单
                this.closeMobileMenu();
            }
        });

        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    async loadFile(file, force = false) {
        if (!file || (this.currentFile && this.currentFile.path === file.path && !force)) {
            return;
        }

        try {
            this.currentFile = file;
            this.fileTree.setCurrentFile(file);
            this.fileTree.updateBreadcrumb(file.path);
            
            // 移动端选择文件后关闭菜单
            if (window.innerWidth <= 640) {
                this.closeMobileMenu();
            }
            
            document.getElementById('content-title').textContent = file.name;
            document.getElementById('content-body').innerHTML = '<div class="loading">加载中...</div>';
            
            const response = await fetch(`/api/file/${encodeURIComponent(file.path)}`);
            const data = await response.json();
            
            await this.renderer.renderContent(data.content);
            this.renderOutline(data.outline);
            
            this.scrollToTop();
        } catch (error) {
            console.error('Error loading file:', error);
            document.getElementById('content-body').innerHTML = `
                <div class="error">
                    <h3>加载文件失败</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    renderOutline(outline) {
        const container = document.getElementById('outline-content');
        
        if (!outline || outline.length === 0) {
            container.innerHTML = '<div class="placeholder">无大纲信息</div>';
            return;
        }

        container.innerHTML = '';
        outline.forEach(item => {
            const element = document.createElement('div');
            element.className = `outline-item level-${item.level}`;
            element.textContent = item.text;
            element.title = item.text;
            
            element.addEventListener('click', () => {
                this.scrollToHeading(item.id);
            });
            
            container.appendChild(element);
        });
    }

    scrollToHeading(id) {
        const heading = document.getElementById(id);
        if (heading) {
            heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            console.warn('Heading not found with ID:', id);
        }
    }

    scrollToTop() {
        document.getElementById('content-body').scrollTop = 0;
    }

    cycleTheme() {
        this.currentTheme = (this.currentTheme + 1) % this.themes.length;
        this.applyTheme();
    }

    applyTheme() {
        const theme = this.themes[this.currentTheme];
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('markdown-viewer-theme', theme);
        
        const icon = document.querySelector('.theme-icon');
        const themeIcons = {
            light: '☀️',
            dark: '🌙',
            blue: '🔵',
            green: '🟢',
            purple: '🟣'
        };
        
        if (icon) {
            icon.textContent = themeIcons[theme] || '🌙';
        }
        
        // 更新按钮标题
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const themeNames = {
                light: '亮色主题',
                dark: '暗色主题',
                blue: '蓝色主题',
                green: '绿色主题',
                purple: '紫色主题'
            };
            themeToggle.title = `切换到${themeNames[theme] || '默认主题'}`;
        }
        
        if (typeof mermaid !== 'undefined') {
            const isDark = theme === 'dark';
            mermaid.initialize({
                theme: isDark ? 'dark' : 'default',
                themeVariables: {
                    darkMode: isDark,
                    primaryColor: isDark ? '#4dabf7' : '#007bff',
                    primaryTextColor: isDark ? '#ffffff' : '#ffffff',
                    primaryBorderColor: isDark ? '#339af0' : '#0056b3',
                    lineColor: isDark ? '#b0b0b0' : '#6c757d'
                }
            });
        }
    }

    toggleOutline() {
        this.outlineVisible = !this.outlineVisible;
        const panel = document.getElementById('outline-panel');
        const toggle = document.getElementById('toggle-outline');
        
        if (this.outlineVisible) {
            panel.style.display = 'flex';
            toggle.textContent = '◀';
            toggle.title = '收起大纲';
        } else {
            panel.style.display = 'none';
            toggle.textContent = '▶';
            toggle.title = '展开大纲';
        }
    }

    editCurrentFile() {
        if (this.currentFile) {
            const filePath = this.currentFile.path;
            const editUrl = `vscode://file/${window.location.hostname}/${filePath}`;
            
            try {
                window.open(editUrl, '_blank');
            } catch (error) {
                console.error('Failed to open file in editor:', error);
                alert('无法自动打开编辑器，请手动打开文件: ' + filePath);
            }
        }
    }

    handleResize() {
        // 响应式处理
        const width = window.innerWidth;
        if (width <= 640) {
            // 移动端适配
            this.outlineVisible = false;
            document.getElementById('outline-panel').style.display = 'none';
        } else {
            // 桌面端恢复显示
            this.outlineVisible = true;
            document.getElementById('outline-panel').style.display = 'flex';
        }
    }

    toggleMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.mobile-menu-overlay');
        
        if (!overlay) {
            // 创建遮罩层
            const newOverlay = document.createElement('div');
            newOverlay.className = 'mobile-menu-overlay';
            document.body.appendChild(newOverlay);
            
            newOverlay.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        }
        
        const currentOverlay = document.querySelector('.mobile-menu-overlay');
        
        if (sidebar.classList.contains('open')) {
            this.closeMobileMenu();
        } else {
            sidebar.classList.add('open');
            currentOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.mobile-menu-overlay');
        
        sidebar.classList.remove('open');
        if (overlay) {
            overlay.classList.remove('active');
        }
        document.body.style.overflow = '';
    }

    async loadInitialFile() {
        // 尝试从URL参数加载文件
        const urlParams = new URLSearchParams(window.location.search);
        const filePath = urlParams.get('file');
        
        if (filePath) {
            try {
                const response = await fetch(`/api/file/${encodeURIComponent(filePath)}`);
                if (response.ok) {
                    const file = { name: filePath.split('/').pop(), path: filePath };
                    this.loadFile(file);
                }
            } catch (error) {
                console.error('Error loading initial file:', error);
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.markdownViewer = new MarkdownViewerApp();
});