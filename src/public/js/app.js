class MarkdownViewerApp {
    constructor() {
        this.fileTree = null;
        this.renderer = null;
        this.currentFile = null;
        this.outlineVisible = true;
        this.sidebarCollapsed = false;
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
        
        // 恢复侧边栏状态
        const savedSidebarState = localStorage.getItem('sidebar-collapsed');
        if (savedSidebarState === 'true') {
            this.sidebarCollapsed = true;
            // 延迟执行，确保DOM完全加载
            setTimeout(() => {
                this.toggleSidebar();
            }, 100);
        }
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

        // 侧边栏抽屉效果控制
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        const sidebarToggleCollapsed = document.getElementById('sidebar-toggle-collapsed');
        if (sidebarToggleCollapsed) {
            sidebarToggleCollapsed.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

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
                    case 'b':
                        e.preventDefault();
                        this.toggleSidebar();
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
            
            // 使用服务器返回的大纲数据，确保ID一致性
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
        console.log('Rendering outline:', outline);
        const container = document.getElementById('outline-content');
        
        if (!outline || outline.length === 0) {
            container.innerHTML = '<div class="placeholder">无大纲信息</div>';
            return;
        }

        container.innerHTML = '';
        outline.forEach((item, index) => {
            console.log('Creating outline item:', item);
            const element = document.createElement('div');
            element.className = `outline-item level-${item.level}`;
            element.textContent = item.text;
            element.title = item.text;
            element.setAttribute('data-heading-id', item.id);
            element.style.cursor = 'pointer';
            element.style.paddingLeft = `${(item.level - 1) * 16 + 8}px`;
            
            element.addEventListener('click', () => {
                console.log('Outline item clicked:', item.id, item.text);
                this.scrollToHeading(item.id);
            });
            
            // 添加悬停效果
            element.addEventListener('mouseenter', () => {
                element.style.backgroundColor = 'var(--hover-color, rgba(0, 123, 255, 0.1))';
            });
            
            element.addEventListener('mouseleave', () => {
                element.style.backgroundColor = '';
            });
            
            container.appendChild(element);
        });
    }

    scrollToHeading(id) {
        console.log('Attempting to scroll to heading with ID:', id);
        const heading = document.getElementById(id);
        if (heading) {
            console.log('Found heading, scrolling to:', id);
            // 确保在正确的容器内滚动
            const contentBody = document.getElementById('content-body');
            const headingTop = heading.offsetTop;
            contentBody.scrollTo({ top: headingTop - 20, behavior: 'smooth' });
            
            // 高亮显示目标标题
            heading.style.backgroundColor = 'var(--accent-color, #007bff)';
            heading.style.color = 'white';
            heading.style.padding = '2px 8px';
            heading.style.borderRadius = '4px';
            heading.style.transition = 'all 0.3s ease';
            
            // 2秒后移除高亮
            setTimeout(() => {
                heading.style.backgroundColor = '';
                heading.style.color = '';
                heading.style.padding = '';
                heading.style.borderRadius = '';
            }, 2000);
        } else {
            console.warn('Heading not found with ID:', id);
            // 尝试查找所有标题元素
            const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            console.log('Available headings:', Array.from(allHeadings).map(h => ({ id: h.id, text: h.textContent })));
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
        const contentArea = document.querySelector('.content-area');
        
        if (this.outlineVisible) {
            // 展开大纲面板
            panel.style.width = '280px';
            panel.style.display = 'flex';
            panel.style.transition = 'all 0.3s ease';
            toggle.textContent = '◀';
            toggle.title = '收起大纲';
            
            if (contentArea) {
                contentArea.style.marginLeft = '280px';
                contentArea.style.transition = 'all 0.3s ease';
            }
        } else {
            // 收起大纲面板
            panel.style.width = '0';
            panel.style.padding = '0';
            panel.style.overflow = 'hidden';
            panel.style.transition = 'all 0.3s ease';
            toggle.textContent = '▶';
            toggle.title = '展开大纲';
            
            if (contentArea) {
                contentArea.style.marginLeft = '0';
                contentArea.style.transition = 'all 0.3s ease';
            }
        }
    }

    toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
        const sidebar = document.getElementById('sidebar');
        const collapsedBar = document.getElementById('sidebar-collapsed');
        const mainContainer = document.querySelector('.main-container');
        const toggle = document.getElementById('sidebar-toggle');
        const toggleCollapsed = document.getElementById('sidebar-toggle-collapsed');
        
        if (this.sidebarCollapsed) {
            // 收起侧边栏
            sidebar.style.width = '0';
            sidebar.style.padding = '0';
            sidebar.style.overflow = 'hidden';
            sidebar.style.transition = 'all 0.3s ease';
            
            collapsedBar.style.display = 'flex';
            mainContainer.style.marginLeft = '40px'; // 缩略条宽度
            
            if (toggle) {
                toggle.innerHTML = '<span class="sidebar-icon">▶</span>';
                toggle.title = '展开文件浏览器';
            }
            
            // 保存状态到本地存储
            localStorage.setItem('sidebar-collapsed', 'true');
        } else {
            // 展开侧边栏
            sidebar.style.width = '300px';
            sidebar.style.padding = '16px';
            sidebar.style.overflow = 'auto';
            sidebar.style.transition = 'all 0.3s ease';
            
            collapsedBar.style.display = 'none';
            mainContainer.style.marginLeft = '0';
            
            if (toggle) {
                toggle.innerHTML = '<span class="sidebar-icon">◀</span>';
                toggle.title = '收起文件浏览器';
            }
            
            // 保存状态到本地存储
            localStorage.setItem('sidebar-collapsed', 'false');
        }
        
        // 触发窗口大小变化事件，让其他组件重新计算布局
        window.dispatchEvent(new Event('resize'));
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
            
            // 移动端强制展开侧边栏（使用移动端菜单逻辑）
            if (this.sidebarCollapsed) {
                this.sidebarCollapsed = false;
                const sidebar = document.getElementById('sidebar');
                const collapsedBar = document.getElementById('sidebar-collapsed');
                const mainContainer = document.querySelector('.main-container');
                
                sidebar.classList.remove('collapsed');
                collapsedBar.style.display = 'none';
                mainContainer.classList.remove('sidebar-collapsed');
            }
        } else {
            // 桌面端恢复显示
            this.outlineVisible = true;
            document.getElementById('outline-panel').style.display = 'flex';
            
            // 桌面端恢复抽屉状态
            const savedSidebarState = localStorage.getItem('sidebar-collapsed');
            const shouldBeCollapsed = savedSidebarState === 'true';
            
            if (shouldBeCollapsed !== this.sidebarCollapsed) {
                this.toggleSidebar();
            }
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