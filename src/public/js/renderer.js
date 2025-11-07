class MarkdownRenderer {
    constructor() {
        this.setupMarked();
        this.setupMermaid();
    }

    setupMarked() {
        if (typeof marked === 'undefined') {
            console.error('marked.js is not loaded');
            return;
        }

        // 检查marked.js版本
        console.log('Marked version:', marked.version);

        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: true,
            mangle: false,
            sanitize: false,
            smartLists: true,
            smartypants: true,
            xhtml: false
        });

        const renderer = new marked.Renderer();
        
        // 自定义标题渲染，确保生成ID
        renderer.heading = (text, level, raw, slugger) => {
            console.log('Rendering heading:', text, 'Level:', level);
            const id = raw.toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            const headingId = `heading-${id}-${Date.now()}`;
            return `<h${level} id="${headingId}">${text}</h${level}>`;
        };
        
        renderer.code = (code, language) => {
            if (language === 'mermaid') {
                return `<div class="mermaid">${code}</div>`;
            } else if (language === 'plantuml') {
                return this.renderPlantUML(code);
            } else {
                const validLang = language && Prism.languages[language] ? language : 'text';
                const highlighted = Prism.highlight(code, Prism.languages[validLang], validLang);
                return `<pre><code class="language-${validLang}">${highlighted}</code></pre>`;
            }
        };

        renderer.table = (header, body) => {
            return `<div class="table-wrapper"><table class="table"><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
        };

        renderer.image = (href, title, text) => {
            const titleAttr = title ? ` title="${title}"` : '';
            return `<img src="${href}" alt="${text}"${titleAttr} loading="lazy">`;
        };

        renderer.link = (href, title, text) => {
            const isExternal = href.startsWith('http') && !href.includes(window.location.host);
            const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
            const titleAttr = title ? ` title="${title}"` : '';
            return `<a href="${href}"${titleAttr}${targetAttr}>${text}</a>`;
        };

        marked.use({ renderer });
    }

    setupMermaid() {
        if (typeof mermaid === 'undefined') {
            console.error('mermaid.js is not loaded');
            return;
        }

        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            themeVariables: {
                darkMode: false,
                primaryColor: '#007bff',
                primaryTextColor: '#ffffff',
                primaryBorderColor: '#0056b3',
                lineColor: '#6c757d'
            },
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true
            },
            sequence: {
                useMaxWidth: true
            },
            gantt: {
                useMaxWidth: true
            }
        });
    }

    renderPlantUML(code) {
        try {
            const encoded = this.encodePlantUML(code.trim());
            const plantUMLServer = 'https://www.plantuml.com/plantuml/svg/';
            const url = plantUMLServer + encoded;
            return `<div class="plantuml"><img src="${url}" alt="PlantUML Diagram" loading="lazy"></div>`;
        } catch (error) {
            console.error('PlantUML encoding error:', error);
            return `<pre><code class="language-plantuml">${code}</code></pre>`;
        }
    }

    encodePlantUML(text) {
        function encode6bit(b) {
            if (b < 10) return String.fromCharCode(48 + b);
            b -= 10;
            if (b < 26) return String.fromCharCode(65 + b);
            b -= 26;
            if (b < 26) return String.fromCharCode(97 + b);
            b -= 26;
            if (b === 0) return '-';
            if (b === 1) return '_';
            return '?';
        }

        function append3bytes(b1, b2, b3) {
            const c1 = b1 >> 2;
            const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
            const c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
            const c4 = b3 & 0x3F;
            
            let result = "";
            result += encode6bit(c1 & 0x3F);
            result += encode6bit(c2 & 0x3F);
            result += encode6bit(c3 & 0x3F);
            result += encode6bit(c4 & 0x3F);
            
            return result;
        }

        let result = "";
        for (let i = 0; i < text.length; i += 3) {
            const b1 = text.charCodeAt(i);
            const b2 = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
            const b3 = i + 2 < text.length ? text.charCodeAt(i + 2) : 0;
            result += append3bytes(b1, b2, b3);
        }
        
        return result;
    }

    async renderMarkdown(content) {
        if (typeof marked === 'undefined') {
            return '<p>Error: marked.js is not loaded</p>';
        }

        try {
            // 使用自定义渲染器
            const renderer = new marked.Renderer();
            
            // 自定义标题渲染，确保生成ID
            renderer.heading = (text, level, raw, slugger) => {
                console.log('Rendering heading:', text, 'Level:', level);
                const id = raw.toLowerCase()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');
                const headingId = `heading-${id}-${Date.now()}`;
                return `<h${level} id="${headingId}">${text}</h${level}>`;
            };
            
            const html = await marked.parse(content, { renderer });
            return html;
        } catch (error) {
            console.error('Markdown rendering error:', error);
            return `<p>Error rendering markdown: ${error.message}</p>`;
        }
    }

    async renderMermaidDiagrams() {
        if (typeof mermaid === 'undefined') {
            console.error('mermaid.js is not loaded');
            return;
        }

        const mermaidElements = document.querySelectorAll('.mermaid');
        for (const element of mermaidElements) {
            try {
                const graphDefinition = element.textContent;
                const { svg } = await mermaid.render('mermaid-' + Date.now(), graphDefinition);
                element.innerHTML = svg;
            } catch (error) {
                console.error('Mermaid rendering error:', error);
                element.innerHTML = `<div class="error">Error rendering mermaid diagram: ${error.message}</div>`;
            }
        }
    }

    async renderContent(content) {
        const html = await this.renderMarkdown(content);
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // 为所有标题添加ID
        const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach((heading, index) => {
            const text = heading.textContent;
            const id = text.toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            const headingId = `heading-${id}-${index}`;
            heading.id = headingId;
        });
        
        document.getElementById('content-body').innerHTML = '';
        document.getElementById('content-body').appendChild(tempDiv);
        
        await this.renderMermaidDiagrams();
        
        Prism.highlightAllUnder(tempDiv);
    }

    extractOutline(content) {
        const outline = [];
        const lines = content.split('\n');
        let headingIndex = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const match = line.match(/^(#{1,6})\s+(.+)$/);
            
            if (match) {
                const level = match[1].length;
                const text = match[2].trim();
                const id = text.toLowerCase()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');
                
                const headingId = `heading-${id}-${headingIndex}`;
                outline.push({ level, text, id: headingId });
                headingIndex++;
            }
        }
        
        return outline;
    }
}

window.MarkdownRenderer = MarkdownRenderer;