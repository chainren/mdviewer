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
        this.setupResizers();
        this.setupComments();
        this.setupSelectionComment();
        this.setupCommentFloatingButton();
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

    setupCommentFloatingButton() {
        // 创建悬浮按钮
        const floatingBtn = document.createElement('div');
        floatingBtn.className = 'comment-stats-floating';
        floatingBtn.id = 'comment-floating-stats';
        
        floatingBtn.innerHTML = `
            <span class="comment-stats-count" id="comment-total-count">
                💬 0
            </span>
            <button class="comment-nav-btn" id="comment-prev-btn" title="上一条评论">
                ▲
            </button>
            <button class="comment-nav-btn" id="comment-next-btn" title="下一条评论">
                ▼
            </button>
        `;
        
        document.body.appendChild(floatingBtn);
        
        document.getElementById('comment-prev-btn').addEventListener('click', () => {
            this.scrollToComment('prev');
        });
        
        document.getElementById('comment-next-btn').addEventListener('click', () => {
            this.scrollToComment('next');
        });
    }

    updateCommentStats() {
        // 计算所有评论总数
        const allComments = document.querySelectorAll('.comment-toggle-btn.has-comments');
        let totalCount = 0;
        
        allComments.forEach(btn => {
            const text = btn.textContent;
            const match = text.match(/\((\d+)\)/);
            if (match) {
                totalCount += parseInt(match[1]);
            }
        });
        
        const statsEl = document.getElementById('comment-floating-stats');
        const countEl = document.getElementById('comment-total-count');
        
        if (statsEl && countEl) {
            countEl.innerHTML = `💬 ${totalCount}`;
            
            if (totalCount > 0) {
                statsEl.classList.add('visible');
            } else {
                statsEl.classList.remove('visible');
            }
        }
    }

    scrollToComment(direction) {
        const contentBody = document.getElementById('content-body');
        if (!contentBody) return;
        
        const currentScrollTop = contentBody.scrollTop;
        const containerRect = contentBody.getBoundingClientRect();
        
        // 目标视口偏移量 (Header 高度 + 留白)
        const TARGET_OFFSET = 100;
        // 容差值，用于判定当前元素
        const THRESHOLD = 5; 

        // 获取所有有评论的区域
        const commentSections = Array.from(document.querySelectorAll('.comment-section'));
        const activeSections = commentSections.filter(section => {
            const btn = section.querySelector('.comment-toggle-btn');
            return btn && btn.classList.contains('has-comments');
        });
        
        if (activeSections.length === 0) return;
        
        let targetSection = null;
        
        if (direction === 'next') {
            // 找到第一个在 [目标位置 + 容差] 下方的评论
            // 这样可以避免选中当前正在展示的评论
            targetSection = activeSections.find(section => {
                const rect = section.getBoundingClientRect();
                // 必须严格大于当前视线位置，才能算作"下一条"
                return rect.top > containerRect.top + TARGET_OFFSET + THRESHOLD; 
            });
            
            // 如果没有下一个，回到第一个（循环）
            if (!targetSection) {
                 this.showNotification('已是最后一条，回到顶部');
                 targetSection = activeSections[0];
            }
        } else {
            // 找到第一个在 [目标位置 - 容差] 上方的评论，倒序查找
            const reversed = [...activeSections].reverse();
            targetSection = reversed.find(section => {
                const rect = section.getBoundingClientRect();
                // 必须严格小于当前视线位置
                return rect.top < containerRect.top + TARGET_OFFSET - THRESHOLD;
            });
            
             // 如果没有上一个，回到最后一个（循环）
            if (!targetSection) {
                 this.showNotification('已是第一条，跳到底部');
                 targetSection = activeSections[activeSections.length - 1];
            }
        }
        
        if (targetSection) {
            // 滚动到该元素
            const sectionRect = targetSection.getBoundingClientRect();
            // 计算需要滚动的相对距离
            const relativeTop = sectionRect.top - containerRect.top;
            
            contentBody.scrollTo({
                top: currentScrollTop + relativeTop - TARGET_OFFSET,
                behavior: 'smooth'
            });
            
            // 高亮处理
            const toggleBtn = targetSection.querySelector('.comment-toggle-btn');
            const element = targetSection.closest('.commentable-element');
            
            // 1. 背景闪烁
            if (element) {
                const originalBg = element.style.backgroundColor;
                element.style.transition = 'background-color 0.3s ease';
                element.style.backgroundColor = 'var(--bg-tertiary)';
                setTimeout(() => {
                    element.style.backgroundColor = originalBg;
                }, 1000);
            }
            
            // 2. 按钮强制显示 5 秒
            if (toggleBtn) {
                // 清除之前的定时器（如果有）
                if (toggleBtn.dataset.forceVisibleTimer) {
                    clearTimeout(parseInt(toggleBtn.dataset.forceVisibleTimer));
                }
                
                toggleBtn.classList.add('force-visible');
                
                const timer = setTimeout(() => {
                    toggleBtn.classList.remove('force-visible');
                    delete toggleBtn.dataset.forceVisibleTimer;
                }, 5000);
                
                toggleBtn.dataset.forceVisibleTimer = timer.toString();
            }
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

        // 文件浏览器标题区域的折叠按钮
        const collapseSidebarBtn = document.getElementById('collapse-sidebar');
        if (collapseSidebarBtn) {
            collapseSidebarBtn.addEventListener('click', () => {
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

    setupResizers() {
        // Sidebar Resizer
        const sidebarResizer = document.getElementById('resizer-sidebar');
        const sidebar = document.getElementById('sidebar');
        
        if (sidebarResizer && sidebar) {
            let isResizingSidebar = false;
            
            sidebarResizer.addEventListener('mousedown', (e) => {
                if (this.sidebarCollapsed) return;
                isResizingSidebar = true;
                sidebarResizer.classList.add('resizing');
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none'; // 防止拖动时选中文本
                
                // 禁用过渡动画以消除滞后感
                sidebar.style.transition = 'none';
                
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isResizingSidebar) return;
                
                // 限制最小宽度 150px，最大宽度 600px
                let newWidth = e.clientX;
                if (newWidth < 150) newWidth = 150;
                if (newWidth > 600) newWidth = 600;
                
                sidebar.style.width = `${newWidth}px`;
                localStorage.setItem('sidebar-width', newWidth);
            });

            document.addEventListener('mouseup', () => {
                if (isResizingSidebar) {
                    isResizingSidebar = false;
                    sidebarResizer.classList.remove('resizing');
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';
                    
                    // 恢复 CSS 定义的过渡动画（移除内联样式）
                    sidebar.style.transition = '';
                }
            });
        }

        // Outline Resizer
        const outlineResizer = document.getElementById('resizer-outline');
        const outlinePanel = document.getElementById('outline-panel');
        
        if (outlineResizer && outlinePanel) {
            let isResizingOutline = false;

            outlineResizer.addEventListener('mousedown', (e) => {
                if (!this.outlineVisible) return;
                isResizingOutline = true;
                outlineResizer.classList.add('resizing');
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                
                // 禁用过渡动画
                outlinePanel.style.transition = 'none';
                
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isResizingOutline) return;
                
                // Outline Start X = Sidebar Width + Sidebar Resizer
                const sidebarWidth = this.sidebarCollapsed ? 40 : sidebar.getBoundingClientRect().width;
                // sidebar resizer width is 5px, sidebar collapsed uses 40px fixed
                const offset = sidebarWidth + (this.sidebarCollapsed ? 0 : 5); 
                
                let newWidth = e.clientX - offset;
                
                // 限制最小宽度 150px，最大宽度 600px
                if (newWidth < 150) newWidth = 150;
                if (newWidth > 600) newWidth = 600;

                outlinePanel.style.width = `${newWidth}px`;
                localStorage.setItem('outline-width', newWidth);
            });

            document.addEventListener('mouseup', () => {
                if (isResizingOutline) {
                    isResizingOutline = false;
                    outlineResizer.classList.remove('resizing');
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';
                    
                    // 恢复 CSS 定义的过渡动画
                    outlinePanel.style.transition = '';
                }
            });
        }
    }

    async loadFile(file, force = false) {
        if (!file || (this.currentFile && this.currentFile.path === file.path && !force)) {
            return;
        }

        try {
            this.currentFile = file;
            this.fileTree.setCurrentFile(file);
            this.fileTree.updateBreadcrumb(file.path);
            
            // 更新 URL，支持深链接
            const url = new URL(window.location);
            url.searchParams.set('file', file.path);
            window.history.pushState({ path: file.path }, '', url.toString());
            
            // 移动端选择文件后关闭菜单
            if (window.innerWidth <= 640) {
                this.closeMobileMenu();
            }
            
            document.getElementById('content-title').textContent = file.name;
            document.getElementById('content-body').innerHTML = '<div class="loading">加载中...</div>';
            
            const response = await fetch(`/api/file/${encodeURIComponent(file.path)}`);
            const data = await response.json();
            
            // 使用服务器返回的大纲数据，确保ID一致性
            await this.renderer.renderContent(data.content, { basePath: data.path });
            this.renderOutline(data.outline);
            this.loadComments(file.path);
            
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
                childrenContainer.style.maxHeight = '5000px';
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
            childrenContainer.style.maxHeight = '5000px';
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
        const contentBody = document.getElementById('content-body');
        
        if (heading && contentBody) {
            console.log('Found heading, scrolling to:', id);
            
            // 核心修复：计算 heading 相对于 contentBody 的准确偏移
            const bodyRect = contentBody.getBoundingClientRect();
            const headingRect = heading.getBoundingClientRect();
            const relativeTop = headingRect.top - bodyRect.top;
            
            // 执行滚动
            contentBody.scrollTo({ 
                top: contentBody.scrollTop + relativeTop - 20, 
                behavior: 'smooth' 
            });
            
            // 高亮显示目标标题
            const originalBg = heading.style.backgroundColor;
            const originalTransition = heading.style.transition;
            
            heading.style.transition = 'background-color 0.3s ease';
            heading.style.backgroundColor = 'var(--hover-color, rgba(0, 123, 255, 0.2))';
            heading.style.borderRadius = '4px';
            
            setTimeout(() => {
                heading.style.backgroundColor = originalBg;
                setTimeout(() => { heading.style.transition = originalTransition; }, 300);
            }, 2000);
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
        const panel = document.getElementById('outline-panel');
        const toggle = document.getElementById('toggle-outline');
        const contentArea = document.querySelector('.content-area');
        const resizer = document.getElementById('resizer-outline');
        
        const savedWidth = localStorage.getItem('outline-width');
        const expandedWidth = savedWidth ? parseInt(savedWidth) : 250;
        const collapsedWidth = 40;

        this.outlineVisible = !this.outlineVisible;

        if (this.outlineVisible) {
            // 展开时：移除 collapsed，添加 open
            panel.classList.remove('collapsed');
            panel.classList.add('open');
            panel.style.width = expandedWidth + 'px';
            panel.style.display = 'flex';
            panel.style.transition = 'width 0.3s ease';
            if (resizer) resizer.style.display = 'block';
            toggle.textContent = '◀';
            toggle.title = '收起大纲';
        } else {
            // 收起时：移除 open，添加 collapsed
            panel.classList.remove('open');
            panel.classList.add('collapsed');
            panel.style.width = collapsedWidth + 'px';
            panel.style.display = 'flex';
            panel.style.transition = 'width 0.3s ease';
            if (resizer) resizer.style.display = 'none';
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
        const collapseSidebarBtn = document.getElementById('collapse-sidebar');
        const resizer = document.getElementById('resizer-sidebar');

        if (this.sidebarCollapsed) {
            // 收起侧边栏
            sidebar.style.width = '0';
            sidebar.style.padding = '0';
            sidebar.style.overflow = 'hidden';
            sidebar.style.transition = 'all 0.3s ease';

            collapsedBar.style.display = 'flex';
            mainContainer.style.marginLeft = '0'; // 移除左边距，缩略条作为独立元素存在
            if (resizer) resizer.style.display = 'none';

            if (toggle) {
                toggle.innerHTML = '<span class="sidebar-icon">▶</span>';
                toggle.title = '展开文件浏览器';
            }

            // 更新文件浏览器标题区域的折叠按钮
            if (collapseSidebarBtn) {
                collapseSidebarBtn.textContent = '▶';
                collapseSidebarBtn.title = '展开文件浏览器';
            }

            // 保存状态到本地存储
            localStorage.setItem('sidebar-collapsed', 'true');
        } else {
            // 展开侧边栏
            const savedWidth = localStorage.getItem('sidebar-width');
            const expandedWidth = savedWidth ? parseInt(savedWidth) : 280; // 这里的默认值280px和CSS一致
            
            sidebar.style.width = expandedWidth + 'px';
            sidebar.style.padding = '16px';
            sidebar.style.overflow = 'auto';
            sidebar.style.transition = 'all 0.3s ease';

            collapsedBar.style.display = 'none';
            mainContainer.style.marginLeft = '0';
            if (resizer) resizer.style.display = 'block';

            if (toggle) {
                toggle.innerHTML = '<span class="sidebar-icon">◀</span>';
                toggle.title = '收起文件浏览器';
            }

            // 更新文件浏览器标题区域的折叠按钮
            if (collapseSidebarBtn) {
                collapseSidebarBtn.textContent = '◀';
                collapseSidebarBtn.title = '折叠文件浏览器';
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
        
        const savedOutlineWidth = localStorage.getItem('outline-width');
        const expandedWidth = savedOutlineWidth ? parseInt(savedOutlineWidth) : 250;
        const collapsedWidth = 40;
        
        const resizerSidebar = document.getElementById('resizer-sidebar');
        const resizerOutline = document.getElementById('resizer-outline');

        if (width <= 640) {
            // 移动端不需要 resizer
            if (resizerSidebar) resizerSidebar.style.display = 'none';
            if (resizerOutline) resizerOutline.style.display = 'none';

            // 保持可点击把手可见（不再使用 display:none）
            this.outlineVisible = false;
            panel.classList.add('collapsed');
            panel.style.display = 'flex';
            panel.style.width = collapsedWidth + 'px';
            if (contentArea) {
                contentArea.style.marginLeft = '0'; // 清除可能存在的 margin
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
            
            // 恢复 Resizer 可见性
            if (resizerSidebar) resizerSidebar.style.display = this.sidebarCollapsed ? 'none' : 'block';
            if (resizerOutline) resizerOutline.style.display = this.outlineVisible ? 'block' : 'none';

            if (this.outlineVisible) {
                panel.classList.remove('collapsed');
                panel.style.width = expandedWidth + 'px';
                if (contentArea) {
                    contentArea.style.marginLeft = '0';
                }
            } else {
                panel.classList.add('collapsed');
                panel.style.width = collapsedWidth + 'px';
                if (contentArea) {
                    contentArea.style.marginLeft = '0';
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

    // ==================== 评论功能 ====================

    setupComments() {
        // 全局事件委托，处理评论按钮点击
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('comment-toggle-btn')) {
                this.toggleComments(e.target);
            }
        });

        // 全局事件委托，处理评论表单提交（排除选中文本评论弹窗中的 form）
        document.addEventListener('submit', (e) => {
            if (e.target.closest('.selection-comment-popover')) return;
            if (e.target.classList.contains('comment-form') || e.target.classList.contains('reply-form')) {
                this.handleCommentSubmit(e);
            }
        });

        // 全局事件委托，处理取消按钮
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('comment-cancel-btn')) {
                this.handleCommentCancel(e);
            }
        });

        // 全局事件委托，处理删除评论
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('comment-delete-btn')) {
                this.handleCommentDelete(e);
            }
        });

        // 点击外部关闭评论窗口
        document.addEventListener('click', (e) => {
            // 如果点击的是评论切换按钮，不处理（由 toggleComments 处理）
            if (e.target.closest('.comment-toggle-btn')) return;

            // 如果点击的是评论容器内部或回复表单内部，不关闭
            if (e.target.closest('.comments-container') || e.target.closest('.reply-form')) return;

            // 如果点击的是选中文本评论相关元素，不关闭
            if (e.target.closest('.selection-comment-popover') ||
                e.target.closest('.selection-comment-bubble') ||
                e.target.closest('.commented-text') ||
                e.target.closest('.commented-text-badge')) return;

            // 关闭所有打开的评论窗口
            document.querySelectorAll('.comments-container.active').forEach(container => {
                container.classList.remove('active');
            });

            // 关闭所有打开的回复表单
            document.querySelectorAll('.reply-form.active').forEach(form => {
                form.classList.remove('active');
            });
        });
    }

    // ==================== 文本选中评论功能 ====================

    setupSelectionComment() {
        this._selectionBubble = null;
        this._selectionPopover = null;

        // 监听鼠标弹起事件，检测文本选中
        document.addEventListener('mouseup', (e) => {
            // 不在评论弹窗或气泡内触发
            if (e.target.closest('.selection-comment-bubble') ||
                e.target.closest('.selection-comment-popover') ||
                e.target.closest('.comments-container')) {
                return;
            }
            // 延迟检测，让浏览器完成选区
            setTimeout(() => this._handleTextSelection(e), 10);
        });

        // 点击已标注文本时显示评论弹窗
        document.addEventListener('click', (e) => {
            const badge = e.target.closest('.commented-text-badge');
            const commentedText = e.target.closest('.commented-text');
            if (badge || commentedText) {
                e.preventDefault();
                e.stopPropagation();
                const target = badge || commentedText;
                const elementId = target.dataset.elementId;
                const commentId = target.dataset.selCommentId;
                this._showSelectionCommentPopover(target, elementId, commentId);
                return;
            }

            // 点击弹窗外部关闭
            if (this._selectionPopover &&
                !e.target.closest('.selection-comment-popover') &&
                !e.target.closest('.selection-comment-bubble')) {
                this._removeSelectionPopover();
            }
        });

        // 选区变化时移除气泡（如果选区被清除）
        document.addEventListener('selectionchange', () => {
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed) {
                // 延迟移除，防止点击气泡时选区先消失
                this._pendingBubbleRemove = setTimeout(() => {
                    this._removeSelectionBubble();
                }, 200);
            }
        });
    }

    _handleTextSelection(e) {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) {
            return;
        }

        const selectedText = sel.toString().trim();
        if (!selectedText || selectedText.length < 1) {
            return;
        }

        // 确保选中的内容在内容区域内
        const contentBody = document.getElementById('content-body');
        if (!contentBody) return;

        const range = sel.getRangeAt(0);
        if (!contentBody.contains(range.commonAncestorContainer)) {
            return;
        }

        // 找到所属的 commentable-element
        const startNode = range.startContainer.nodeType === Node.TEXT_NODE
            ? range.startContainer.parentElement
            : range.startContainer;
        const commentableEl = startNode.closest('.commentable-element');
        if (!commentableEl) return;

        const elementId = commentableEl.dataset.elementId;
        if (!elementId) return;

        // 计算文本偏移量（相对于 commentable-element 的文本内容）
        const textOffset = this._getTextOffsetInElement(commentableEl, range.startContainer, range.startOffset);

        // 显示浮动评论气泡
        this._showSelectionBubble(range, elementId, selectedText, textOffset);
    }

    _getTextOffsetInElement(rootEl, targetNode, targetOffset) {
        const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
        let offset = 0;
        let node;
        while ((node = walker.nextNode())) {
            if (node === targetNode) {
                return offset + targetOffset;
            }
            // 跳过评论区域的文本节点
            if (node.parentElement.closest('.comment-section')) continue;
            offset += node.textContent.length;
        }
        return offset;
    }

    _showSelectionBubble(range, elementId, selectedText, textOffset) {
        this._removeSelectionBubble();

        const rect = range.getBoundingClientRect();
        const bubble = document.createElement('button');
        bubble.className = 'selection-comment-bubble';
        bubble.innerHTML = '💬 评论选中';
        bubble.style.left = `${rect.left + rect.width / 2 - 45 + window.scrollX}px`;
        bubble.style.top = `${rect.top - 36 + window.scrollY}px`;

        bubble.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // 取消延迟移除
            if (this._pendingBubbleRemove) {
                clearTimeout(this._pendingBubbleRemove);
                this._pendingBubbleRemove = null;
            }
        });

        bubble.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._openSelectionCommentForm(elementId, selectedText, textOffset, rect);
            this._removeSelectionBubble();
            window.getSelection().removeAllRanges();
        });

        document.body.appendChild(bubble);
        this._selectionBubble = bubble;
    }

    _removeSelectionBubble() {
        if (this._selectionBubble) {
            this._selectionBubble.remove();
            this._selectionBubble = null;
        }
    }

    _removeSelectionPopover() {
        if (this._selectionPopover) {
            this._selectionPopover.remove();
            this._selectionPopover = null;
        }
    }

    _openSelectionCommentForm(elementId, selectedText, textOffset, rect) {
        this._removeSelectionPopover();

        const popover = document.createElement('div');
        popover.className = 'selection-comment-popover';

        const previewText = selectedText.length > 40
            ? selectedText.substring(0, 40) + '...'
            : selectedText;

        popover.innerHTML = `
            <div class="popover-header">
                <span class="selected-text-preview" title="${selectedText.replace(/"/g, '&quot;')}">"${previewText}"</span>
                <button class="popover-close-btn" title="关闭">&times;</button>
            </div>
            <div class="comments-list"></div>
            <form class="comment-form" data-element-id="${elementId}" data-selected-text="${encodeURIComponent(selectedText)}" data-text-offset="${textOffset}" data-text-length="${selectedText.length}">
                <textarea name="content" placeholder="添加评论..." required></textarea>
                <div class="comment-actions">
                    <button type="submit" class="comment-submit-btn">确认</button>
                    <button type="button" class="comment-cancel-btn">取消</button>
                </div>
            </form>
        `;

        // 定位弹窗
        popover.style.left = `${Math.max(10, Math.min(rect.left + window.scrollX, window.innerWidth - 370))}px`;
        popover.style.top = `${rect.bottom + 8 + window.scrollY}px`;

        // 关闭按钮
        popover.querySelector('.popover-close-btn').addEventListener('click', () => {
            this._removeSelectionPopover();
        });

        // 表单提交
        const form = popover.querySelector('.comment-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this._submitSelectionComment(form);
        });

        // 取消按钮
        popover.querySelector('.comment-cancel-btn').addEventListener('click', () => {
            this._removeSelectionPopover();
        });

        document.body.appendChild(popover);
        this._selectionPopover = popover;
        popover.querySelector('textarea').focus();
    }

    async _submitSelectionComment(form) {
        const elementId = form.dataset.elementId;
        const selectedText = decodeURIComponent(form.dataset.selectedText);
        const textOffset = parseInt(form.dataset.textOffset);
        const textLength = parseInt(form.dataset.textLength);
        const content = form.querySelector('textarea').value.trim();

        if (!content) {
            this.showNotification('请填写评论内容');
            return;
        }

        if (!this.currentFile) {
            this.showNotification('未选择文件');
            return;
        }

        try {
            const response = await fetch(`/api/comments/${encodeURIComponent(this.currentFile.path)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    elementId,
                    content,
                    selectedText,
                    textOffset,
                    textLength
                })
            });

            const data = await response.json();
            if (data.success) {
                this._removeSelectionPopover();
                await this.loadComments(this.currentFile.path);
                this.updateCommentStats();
                this.showNotification('评论已发布');
            } else {
                this.showNotification(data.error || '发布失败');
            }
        } catch (error) {
            console.error('Error submitting selection comment:', error);
            this.showNotification('发布失败');
        }
    }

    _showSelectionCommentPopover(targetEl, elementId, commentId) {
        this._removeSelectionPopover();

        const rect = targetEl.getBoundingClientRect();
        const popover = document.createElement('div');
        popover.className = 'selection-comment-popover';
        popover.dataset.elementId = elementId;

        const selectedText = targetEl.closest('.commented-text')?.dataset.selectedText || targetEl.dataset.selectedText || '';
        const previewText = selectedText.length > 40
            ? selectedText.substring(0, 40) + '...'
            : selectedText;

        popover.innerHTML = `
            <div class="popover-header">
                <span class="selected-text-preview" title="${selectedText.replace(/"/g, '&quot;')}">"${previewText}"</span>
                <button class="popover-close-btn" title="关闭">&times;</button>
            </div>
            <div class="comments-list"></div>
            <form class="comment-form" data-element-id="${elementId}" data-selected-text="${encodeURIComponent(selectedText)}" data-text-offset="${targetEl.closest('.commented-text')?.dataset.textOffset || 0}" data-text-length="${selectedText.length}">
                <textarea name="content" placeholder="回复评论..." required></textarea>
                <div class="comment-actions">
                    <button type="submit" class="comment-submit-btn">确认</button>
                    <button type="button" class="comment-cancel-btn">取消</button>
                </div>
            </form>
        `;

        // 定位
        popover.style.left = `${Math.max(10, Math.min(rect.left + window.scrollX, window.innerWidth - 370))}px`;
        popover.style.top = `${rect.bottom + 8 + window.scrollY}px`;

        // 关闭按钮
        popover.querySelector('.popover-close-btn').addEventListener('click', () => {
            this._removeSelectionPopover();
        });

        // 表单提交
        const form = popover.querySelector('.comment-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this._submitSelectionComment(form);
        });

        // 取消按钮
        popover.querySelector('.comment-cancel-btn').addEventListener('click', () => {
            this._removeSelectionPopover();
        });

        document.body.appendChild(popover);
        this._selectionPopover = popover;

        // 加载该选中文本的评论
        this._loadSelectionComments(popover, elementId, selectedText);
    }

    async _loadSelectionComments(popover, elementId, selectedText) {
        if (!this.currentFile) return;

        try {
            const response = await fetch(`/api/comments/${encodeURIComponent(this.currentFile.path)}`);
            const data = await response.json();
            if (!data.success) return;

            const elementComments = data.comments[elementId] || [];
            // 过滤出属于同一选中文本的评论
            const selComments = elementComments.filter(c => c.selectedText === selectedText);

            const commentsList = popover.querySelector('.comments-list');
            commentsList.innerHTML = '';

            if (selComments.length === 0) {
                commentsList.innerHTML = '<div class="comments-list-empty">暂无评论</div>';
                return;
            }

            selComments.forEach(comment => {
                const el = this.createCommentElement(comment);
                commentsList.appendChild(el);
            });
        } catch (error) {
            console.error('Error loading selection comments:', error);
        }
    }

    // 在已渲染的内容中高亮已评论的选中文本
    _highlightCommentedSelections(comments) {
        const contentBody = document.getElementById('content-body');
        if (!contentBody) return;

        for (const [elementId, elementComments] of Object.entries(comments)) {
            // 只处理有 selectedText 的评论
            const selectionComments = elementComments.filter(c => c.selectedText);
            if (selectionComments.length === 0) continue;

            const commentableEl = contentBody.querySelector(`.commentable-element[data-element-id="${elementId}"]`);
            if (!commentableEl) continue;

            // 按 selectedText 分组
            const textGroups = {};
            selectionComments.forEach(c => {
                const key = c.selectedText;
                if (!textGroups[key]) {
                    textGroups[key] = { text: c.selectedText, offset: c.textOffset, count: 0, commentId: c.id };
                }
                textGroups[key].count++;
            });

            // 对每组进行高亮
            for (const group of Object.values(textGroups)) {
                this._wrapTextWithHighlight(commentableEl, group.text, elementId, group.count, group.commentId);
            }
        }
    }

    _wrapTextWithHighlight(rootEl, searchText, elementId, commentCount, commentId) {
        if (!searchText) return;

        const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                // 跳过评论区域
                if (node.parentElement.closest('.comment-section') ||
                    node.parentElement.closest('.commented-text') ||
                    node.parentElement.closest('.commented-text-badge')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        const textNodes = [];
        let node;
        while ((node = walker.nextNode())) {
            textNodes.push(node);
        }

        // 在文本节点中查找 searchText（可能跨节点）
        const fullText = textNodes.map(n => n.textContent).join('');
        const matchIndex = fullText.indexOf(searchText);
        if (matchIndex === -1) return;

        // 定位到具体的文本节点和偏移
        let currentOffset = 0;
        let startNodeIdx = -1, startOff = 0;
        let endNodeIdx = -1, endOff = 0;
        const matchEnd = matchIndex + searchText.length;

        for (let i = 0; i < textNodes.length; i++) {
            const len = textNodes[i].textContent.length;
            if (startNodeIdx === -1 && currentOffset + len > matchIndex) {
                startNodeIdx = i;
                startOff = matchIndex - currentOffset;
            }
            if (endNodeIdx === -1 && currentOffset + len >= matchEnd) {
                endNodeIdx = i;
                endOff = matchEnd - currentOffset;
                break;
            }
            currentOffset += len;
        }

        if (startNodeIdx === -1 || endNodeIdx === -1) return;

        // 用 Range + surroundContents 或手动拆分节点包裹
        try {
            const range = document.createRange();
            range.setStart(textNodes[startNodeIdx], startOff);
            range.setEnd(textNodes[endNodeIdx], endOff);

            const wrapper = document.createElement('span');
            wrapper.className = 'commented-text';
            wrapper.dataset.elementId = elementId;
            wrapper.dataset.selCommentId = commentId;
            wrapper.dataset.selectedText = searchText;

            range.surroundContents(wrapper);

            // 添加气泡角标
            const badge = document.createElement('span');
            badge.className = 'commented-text-badge';
            badge.dataset.elementId = elementId;
            badge.dataset.selCommentId = commentId;
            badge.dataset.selectedText = searchText;
            badge.textContent = `💬${commentCount > 1 ? commentCount : ''}`;
            wrapper.after(badge);
        } catch (e) {
            // surroundContents 在跨元素时会失败，使用 extractContents + wrapper
            try {
                const range = document.createRange();
                range.setStart(textNodes[startNodeIdx], startOff);
                range.setEnd(textNodes[endNodeIdx], endOff);

                const fragment = range.extractContents();
                const wrapper = document.createElement('span');
                wrapper.className = 'commented-text';
                wrapper.dataset.elementId = elementId;
                wrapper.dataset.selCommentId = commentId;
                wrapper.dataset.selectedText = searchText;
                wrapper.appendChild(fragment);
                range.insertNode(wrapper);

                const badge = document.createElement('span');
                badge.className = 'commented-text-badge';
                badge.dataset.elementId = elementId;
                badge.dataset.selCommentId = commentId;
                badge.dataset.selectedText = searchText;
                badge.textContent = `💬${commentCount > 1 ? commentCount : ''}`;
                wrapper.after(badge);
            } catch (e2) {
                console.warn('Failed to highlight text:', searchText, e2);
            }
        }
    }

    async loadComments(filePath) {
        try {
            const response = await fetch(`/api/comments/${encodeURIComponent(filePath)}`);
            const data = await response.json();
            if (data.success) {
                this.renderAllComments(data.comments);
            }
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    }

    renderAllComments(comments) {
        // 先清除旧的高亮标记
        document.querySelectorAll('.commented-text').forEach(el => {
            const parent = el.parentNode;
            while (el.firstChild) parent.insertBefore(el.firstChild, el);
            el.remove();
        });
        document.querySelectorAll('.commented-text-badge').forEach(el => el.remove());

        // 为每个元素渲染块级评论
        for (const [elementId, elementComments] of Object.entries(comments)) {
            this.renderElementComments(elementId, elementComments);
        }

        // 高亮已评论的选中文本
        this._highlightCommentedSelections(comments);

        this.updateCommentStats();
    }

    renderElementComments(elementId, comments) {
        const commentSection = document.querySelector(`.comment-section[data-element-id="${elementId}"]`);
        if (!commentSection) return;

        const toggleBtn = commentSection.querySelector('.comment-toggle-btn');
        const commentsList = commentSection.querySelector('.comments-list');

        // 更新按钮状态
        if (comments && comments.length > 0) {
            toggleBtn.classList.add('has-comments');
            toggleBtn.textContent = `💬 评论 (${comments.length})`;
        } else {
            toggleBtn.classList.remove('has-comments');
            toggleBtn.textContent = '💬 评论';
        }

        // 渲染评论列表
        commentsList.innerHTML = '';
        if (!comments || comments.length === 0) {
            commentsList.innerHTML = '<div class="comments-list-empty">暂无评论</div>';
            return;
        }

        // 构建树状结构
        const commentMap = {};
        const rootComments = [];

        comments.forEach(c => {
            commentMap[c.id] = { ...c, replies: [] };
        });

        comments.forEach(c => {
            if (c.parentId && commentMap[c.parentId]) {
                commentMap[c.parentId].replies.push(commentMap[c.id]);
            } else {
                rootComments.push(commentMap[c.id]);
            }
        });

        // 递归渲染
        const renderCommentTree = (commentNodes, container) => {
            commentNodes.forEach(node => {
                const commentEl = this.createCommentElement(node);
                container.appendChild(commentEl);

                if (node.replies.length > 0) {
                    const repliesContainer = document.createElement('div');
                    repliesContainer.className = 'comment-replies';
                    renderCommentTree(node.replies, repliesContainer);
                    commentEl.appendChild(repliesContainer);
                }
            });
        };

        renderCommentTree(rootComments, commentsList);
    }

    createCommentElement(comment) {
        const commentItem = document.createElement('div');
        commentItem.className = 'comment-item';
        commentItem.dataset.commentId = comment.id;

        const header = document.createElement('div');
        header.className = 'comment-header';

        const author = document.createElement('span');
        author.className = 'comment-author';
        // AIGC START
        author.textContent = comment.author || comment.ip || 'Anonymous';
        // AIGC END

        const time = document.createElement('span');
        time.className = 'comment-time';
        // AIGC START
        time.textContent = this.formatCommentTime(comment.commentTime || comment.time);
        // AIGC END

        header.appendChild(author);
        header.appendChild(time);

        const content = document.createElement('div');
        content.className = 'comment-content';
        content.textContent = comment.content;

        const footer = document.createElement('div');
        footer.className = 'comment-footer';

        const replyBtn = document.createElement('button');
        replyBtn.className = 'comment-reply-btn';
        replyBtn.textContent = '回复';
        replyBtn.onclick = () => this.toggleReplyForm(commentItem, comment.id, comment.elementId);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'comment-delete-btn';
        deleteBtn.textContent = '删除';
        deleteBtn.dataset.commentId = comment.id;
        deleteBtn.dataset.elementId = comment.elementId;

        footer.appendChild(replyBtn);
        footer.appendChild(deleteBtn);

        commentItem.appendChild(header);
        commentItem.appendChild(content);
        commentItem.appendChild(footer);

        return commentItem;
    }

    toggleReplyForm(commentItem, parentId, elementId) {
        let form = commentItem.querySelector('.reply-form');
        if (form) {
            form.classList.toggle('active');
            if (form.classList.contains('active')) {
                form.querySelector('textarea').focus();
            }
        } else {
            form = document.createElement('form');
            form.className = 'reply-form active';
            form.dataset.elementId = elementId;
            form.dataset.parentId = parentId;
            form.innerHTML = `
                <textarea name="content" placeholder="回复..." required></textarea>
                <div class="comment-actions">
                    <button type="submit" class="comment-submit-btn">确认</button>
                    <button type="button" class="comment-cancel-btn">取消</button>
                </div>
            `;
            // 插入到 footer 之后，但在 replies 之前
            const replies = commentItem.querySelector('.comment-replies');
            if (replies) {
                commentItem.insertBefore(form, replies);
            } else {
                commentItem.appendChild(form);
            }
            form.querySelector('textarea').focus();
        }
    }

    toggleComments(btn) {
        const elementId = btn.dataset.elementId;
        const container = document.querySelector(`.comments-container[data-element-id="${elementId}"]`);
        if (container) {
            container.classList.toggle('active');
        }
    }


    async handleCommentSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const elementId = form.dataset.elementId;
        let parentId = form.dataset.parentId;
        // 清洗 parentId
        if (parentId === 'undefined' || parentId === 'null' || parentId === '') {
            parentId = null;
        }

        const content = (formData.get('content') || '').toString().trim();

        if (!content) {
            this.showNotification('请填写评论内容');
            return;
        }

        if (!this.currentFile) {
            this.showNotification('未选择文件');
            return;
        }

        try {
            const response = await fetch(`/api/comments/${encodeURIComponent(this.currentFile.path)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ elementId, content, parentId })
            });

            const data = await response.json();
            if (data.success) {
                form.reset();
                
                // 如果是回复表单，隐藏它
                if (form.classList.contains('reply-form')) {
                    form.classList.remove('active');
                } else {
                    // 如果是主表单，关闭容器
                    const container = document.querySelector(`.comments-container[data-element-id="${elementId}"]`);
                    if (container) {
                        container.classList.remove('active');
                    }
                }
                
                // 重新加载该元素的评论
                await this.loadComments(this.currentFile.path);
                this.updateCommentStats();
                this.showNotification('评论已发布');
            } else {
                this.showNotification(data.error || '发布失败');
            }
        } catch (error) {
            console.error('Error submitting comment:', error);
            this.showNotification('发布失败');
        }
    }

    handleCommentCancel(e) {
        const form = e.target.closest('form');
        if (form) {
            form.reset();
            if (form.classList.contains('reply-form')) {
                form.classList.remove('active');
            } else {
                const container = form.closest('.comments-container');
                if (container) {
                    container.classList.remove('active');
                }
            }
        }
    }

    async handleCommentDelete(e) {
        if (!confirm('确定要删除这条评论吗？')) {
            return;
        }

        const btn = e.target;
        const commentId = btn.dataset.commentId;
        const elementId = btn.dataset.elementId;

        if (!this.currentFile) {
            this.showNotification('未选择文件');
            return;
        }

        try {
            const response = await fetch(`/api/comments/${encodeURIComponent(this.currentFile.path)}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ elementId, commentId })
            });

            const data = await response.json();
            if (data.success) {
                // 重新加载该元素的评论
                await this.loadComments(this.currentFile.path);
                this.updateCommentStats();
                this.showNotification('评论已删除');
            } else {
                this.showNotification(data.error || '删除失败');
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            this.showNotification('删除失败');
        }
    }

    formatCommentTime(isoString) {
        try {
            const date = new Date(isoString);
            const now = new Date();
            const diff = now - date;

            // 小于 1 分钟
            if (diff < 60000) {
                return '刚刚';
            }
            // 小于 1 小时
            if (diff < 3600000) {
                return `${Math.floor(diff / 60000)} 分钟前`;
            }
            // 小于 1 天
            if (diff < 86400000) {
                return `${Math.floor(diff / 3600000)} 小时前`;
            }
            // 小于 7 天
            if (diff < 604800000) {
                return `${Math.floor(diff / 86400000)} 天前`;
            }
            // 其他情况显示完整日期
            return date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return isoString;
        }
    }

    showNotification(message) {
        const existing = document.querySelector('.comment-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = 'comment-notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.markdownViewer = new MarkdownViewerApp();
});
