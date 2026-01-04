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
            // AIGC START
            const basePort = Number(location.port || 3000);
            const wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws';
            const wsPort = basePort + 5080;
            const host = location.hostname;
            this.websocket = new WebSocket(`${wsProtocol}://${host}:${wsPort}`);
            //AIGC END
            
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
        
        // 构建树形结构
        const tree = this.buildOutlineTree(outline);
        this.outlineTree = tree; // 保存引用以便后续使用
        
        // 应用默认展开策略：展开第一层（level 1）
        this.applyDefaultExpansion(tree);
        
        // 渲染树形结构
        this.renderOutlineTree(tree, container);
        
        // 添加滚动监听以智能展开
        this.setupScrollListener();
    }

    setupScrollListener() {
        const contentBody = document.getElementById('content-body');
        let scrollTimeout;
        
        const handleScroll = () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.applySmartExpansion();
            }, 200); // 200ms 防抖
        };
        
        // 移除之前的监听器（如果存在）
        if (this.scrollListener) {
            contentBody.removeEventListener('scroll', this.scrollListener);
        }
        
        // 添加新的监听器
        this.scrollListener = handleScroll;
        contentBody.addEventListener('scroll', handleScroll);
        
        // 初始调用一次
        setTimeout(() => {
            this.applySmartExpansion();
        }, 500);
    }

    buildOutlineTree(outline) {
        const tree = [];
        const stack = [];
        
        outline.forEach((item, index) => {
            const node = {
                ...item,
                children: [],
                expanded: false,
                hasChildren: false,
                element: null,
                childrenContainer: null
            };
            
            // 找到父节点
            while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
                stack.pop();
            }
            
            if (stack.length === 0) {
                tree.push(node);
            } else {
                const parent = stack[stack.length - 1];
                parent.children.push(node);
                parent.hasChildren = true;
            }
            
            stack.push(node);
        });
        
        return tree;
    }

    renderOutlineTree(tree, container, level = 0) {
        tree.forEach(node => {
            // 创建大纲项容器
            const itemContainer = document.createElement('div');
            itemContainer.className = 'outline-item-container';
            itemContainer.style.position = 'relative';
            
            // 创建大纲项
            const element = document.createElement('div');
            element.className = `outline-item level-${node.level}`;
            element.textContent = node.text;
            element.title = node.text;
            element.setAttribute('data-heading-id', node.id);
            element.style.cursor = 'pointer';
            element.style.paddingLeft = `${(node.level - 1) * 16 + 8}px`;
            element.style.position = 'relative';
            
            // 添加展开/收起按钮（如果有子节点）
            if (node.hasChildren) {
                const expandButton = document.createElement('span');
                expandButton.className = 'outline-expand-btn';
                expandButton.innerHTML = '▶';
                expandButton.style.cssText = `
                    position: absolute;
                    left: ${(node.level - 1) * 16 + 2}px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 12px;
                    height: 12px;
                    cursor: pointer;
                    font-size: 8px;
                    line-height: 12px;
                    text-align: center;
                    color: var(--text-secondary);
                    transition: transform 0.2s ease, color 0.2s ease;
                    user-select: none;
                `;
                
                expandButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleOutlineNode(node);
                });
                
                element.appendChild(expandButton);
                element.style.paddingLeft = `${(node.level - 1) * 16 + 20}px`;
            } else {
                // 末级节点添加特殊类
                element.classList.add('no-children');
            }
            
            // 创建子节点容器
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'outline-children';
            const isExpanded = node.expanded || false;
            // 设置初始展开状态
            if (isExpanded) {
                childrenContainer.style.maxHeight = '1000px';
                childrenContainer.style.opacity = '1';
            } else {
                childrenContainer.style.maxHeight = '0px';
                childrenContainer.style.opacity = '0';
            }
            childrenContainer.style.overflow = 'hidden';
            childrenContainer.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
            
            // 添加点击事件
            element.addEventListener('click', () => {
                console.log('Outline item clicked:', node.id, node.text);
                this.scrollToHeading(node.id);
            });
            
            // 添加悬停效果
            element.addEventListener('mouseenter', () => {
                element.style.backgroundColor = 'var(--hover-color, rgba(0, 123, 255, 0.1))';
            });
            
            element.addEventListener('mouseleave', () => {
                element.style.backgroundColor = '';
            });
            
            // 保存引用
            node.element = element;
            node.childrenContainer = childrenContainer;
            
            // 如果默认展开，设置展开按钮状态
            if (node.expanded && element.querySelector('.outline-expand-btn')) {
                element.querySelector('.outline-expand-btn').style.transform = 'translateY(-50%) rotate(90deg)';
            }
            
            itemContainer.appendChild(element);
            itemContainer.appendChild(childrenContainer);
            container.appendChild(itemContainer);
            
            // 递归渲染子节点
            if (node.children.length > 0) {
                this.renderOutlineTree(node.children, childrenContainer, level + 1);
            }
        });
    }

    toggleOutlineNode(node) {
        // 1. 切换节点状态
        node.expanded = !node.expanded;
        
        // 2. 直接获取子容器（不依赖保存的引用）
        const itemContainer = node.element.parentElement;
        const childrenContainer = itemContainer.querySelector('.outline-children');
        
        // 3. 直接设置样式，使用inline style确保生效
        if (node.expanded) {
            childrenContainer.style.maxHeight = '1000px';
            childrenContainer.style.opacity = '1';
        } else {
            childrenContainer.style.maxHeight = '0px';
            childrenContainer.style.opacity = '0';
        }
        
        // 4. 更新展开按钮样式
        const expandBtn = node.element.querySelector('.outline-expand-btn');
        if (expandBtn) {
            expandBtn.style.transform = node.expanded ? 'translateY(-50%) rotate(90deg)' : 'translateY(-50%) rotate(0deg)';
        }
    }

    applyDefaultExpansion(tree, currentLevel = 0, targetLevel = 1) {
        tree.forEach(node => {
            // 默认展开策略：展开第一层（level 1）
            if (node.level <= targetLevel && node.hasChildren) {
                node.expanded = true;
            }
            
            // 递归处理子节点
            if (node.children.length > 0) {
                this.applyDefaultExpansion(node.children, currentLevel + 1, targetLevel);
            }
        });
    }

    // 根据当前视口中的标题位置智能展开
    applySmartExpansion() {
        // 获取所有可见的标题元素
        const headings = document.querySelectorAll('#content-body h1, #content-body h2, #content-body h3, #content-body h4, #content-body h5, #content-body h6');
        const visibleHeadings = [];
        
        headings.forEach(heading => {
            const rect = heading.getBoundingClientRect();
            const contentRect = document.getElementById('content-body').getBoundingClientRect();
            
            // 检查标题是否在视口中
            if (rect.top >= contentRect.top && rect.bottom <= contentRect.bottom + 100) {
                visibleHeadings.push({
                    id: heading.id,
                    level: parseInt(heading.tagName.charAt(1)),
                    text: heading.textContent
                });
            }
        });
        
        // 展开当前可见标题及其父级
        this.expandVisibleHeadings(visibleHeadings);
    }

    expandVisibleHeadings(visibleHeadings) {
        if (!this.outlineTree) return;
        
        const expandNodeAndParents = (node, targetId) => {
            if (node.id === targetId) {
                // 找到目标节点，展开它
                if (node.hasChildren && !node.expanded) {
                    this.toggleOutlineNode(node);
                }
                return true;
            }
            
            // 在子节点中查找
            for (let child of node.children) {
                if (expandNodeAndParents(child, targetId)) {
                    // 如果找到了，展开当前节点
                    if (node.hasChildren && !node.expanded) {
                        this.toggleOutlineNode(node);
                    }
                    return true;
                }
            }
            
            return false;
        };
        
        // 对每个可见标题进行展开
        visibleHeadings.forEach(heading => {
            this.outlineTree.forEach(rootNode => {
                expandNodeAndParents(rootNode, heading.id);
            });
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
        const panel = document.getElementById('outline-panel');
        const toggle = document.getElementById('toggle-outline');
        const contentArea = document.querySelector('.content-area');
        const expandedWidth = 250;
        const collapsedWidth = 40;

        this.outlineVisible = !this.outlineVisible;

        if (this.outlineVisible) {
            // 展开时：移除 collapsed，添加 open（在移动端确保从屏幕外滑入）
            panel.classList.remove('collapsed');
            panel.classList.add('open');
            panel.style.width = expandedWidth + 'px';
            panel.style.display = 'flex';
            panel.style.transition = 'width 0.3s ease';
            toggle.textContent = '◀';
            toggle.title = '收起大纲';
        } else {
            // 收起时：移除 open，添加 collapsed（移动端保留把手可点击）
            panel.classList.remove('open');
            panel.classList.add('collapsed');
            panel.style.width = collapsedWidth + 'px';
            panel.style.display = 'flex';
            panel.style.transition = 'width 0.3s ease';
            toggle.textContent = '▶';
            toggle.title = '展开大纲';
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
            const returnUrl = window.location.pathname + window.location.search;
            const editUrl = `/editor.html?file=${encodeURIComponent(filePath)}&return=${encodeURIComponent(returnUrl)}`;
            
            try {
                window.location.href = editUrl;
            } catch (error) {
                console.error('Failed to open editor page:', error);
                alert('无法打开编辑器页面，请检查服务器是否运行');
            }
        }
    }

    handleResize() {
        const width = window.innerWidth;
        const panel = document.getElementById('outline-panel');
        const contentArea = document.querySelector('.content-area');
        const expandedWidth = 250;
        const collapsedWidth = 40;

        if (width <= 640) {
            // 保持可点击把手可见（不再使用 display:none）
            this.outlineVisible = false;
            panel.classList.add('collapsed');
            panel.style.display = 'flex';
            panel.style.width = collapsedWidth + 'px';
            if (contentArea) {
                contentArea.style.marginLeft = collapsedWidth + 'px';
            }

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
            // 桌面端保持抽屉状态与按钮可见
            panel.style.display = 'flex';
            if (this.outlineVisible) {
                panel.classList.remove('collapsed');
                panel.style.width = expandedWidth + 'px';
                if (contentArea) {
                    contentArea.style.marginLeft = expandedWidth + 'px';
                }
            } else {
                panel.classList.add('collapsed');
                panel.style.width = collapsedWidth + 'px';
                if (contentArea) {
                    contentArea.style.marginLeft = collapsedWidth + 'px';
                }
            }

            // 桌面端恢复侧栏抽屉状态
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