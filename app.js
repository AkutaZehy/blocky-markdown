// Blocky Markdown Editor - Redesigned Version
class BlockyMarkdown {
    constructor() {
        this.workspaceBlocks = [];
        this.cacheBlocks = [];
        this.currentBlockId = 0;
        this.currentTheme = 'minimal';
        this.currentEditingTableBlockId = null;
        this.selectedTableCell = null;
        this.draggedBlock = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadFromLocalStorage();
        this.loadTheme();
        
        // If no blocks exist, add a welcome block
        if (this.workspaceBlocks.length === 0) {
            this.addBlock('paragraph', '', 'workspace');
        }
        
        this.updateOutline();
    }
    
    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // Add block buttons
        document.querySelectorAll('.btn-add').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                this.addBlock(type, '', 'workspace');
            });
        });
        
        // Import/Export buttons
        document.getElementById('importBtn').addEventListener('click', () => this.showImportModal());
        document.getElementById('exportBtn').addEventListener('click', () => this.showExportModal());
        
        // Modal controls
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.remove('active');
            });
        });
        
        // Import confirm
        document.getElementById('importConfirm').addEventListener('click', () => this.importMarkdown());
        
        // Export controls
        document.getElementById('copyBtn').addEventListener('click', () => this.copyToClipboard());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadMarkdown());
        
        // Table editor controls
        document.getElementById('addRowBtn').addEventListener('click', () => this.addTableRow());
        document.getElementById('removeRowBtn').addEventListener('click', () => this.removeTableRow());
        document.getElementById('addColBtn').addEventListener('click', () => this.addTableColumn());
        document.getElementById('removeColBtn').addEventListener('click', () => this.removeTableColumn());
        document.getElementById('tableConfirm').addEventListener('click', () => this.confirmTable());
        
        // Cell content editor
        document.getElementById('cellContentEditor').addEventListener('input', (e) => {
            if (this.selectedTableCell) {
                const input = this.selectedTableCell.querySelector('input');
                if (input) {
                    input.value = e.target.value;
                }
            }
        });
        
        // Close modal on background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
        
        // Setup drag and drop
        this.setupDragAndDrop();
    }
    
    setupDragAndDrop() {
        const workspaceContainer = document.getElementById('blocksContainer');
        const cacheContainer = document.getElementById('cacheContainer');
        
        [workspaceContainer, cacheContainer].forEach(container => {
            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                container.classList.add('drag-over');
            });
            
            container.addEventListener('dragleave', () => {
                container.classList.remove('drag-over');
            });
            
            container.addEventListener('drop', (e) => {
                e.preventDefault();
                container.classList.remove('drag-over');
                
                if (this.draggedBlock) {
                    const targetZone = container.dataset.dropZone;
                    this.moveBlockToZone(this.draggedBlock, targetZone);
                }
            });
        });
    }
    
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'minimal' ? 'aero' : 'minimal';
        document.body.dataset.theme = this.currentTheme;
        localStorage.setItem('blockyMarkdownTheme', this.currentTheme);
    }
    
    loadTheme() {
        const savedTheme = localStorage.getItem('blockyMarkdownTheme');
        if (savedTheme) {
            this.currentTheme = savedTheme;
            document.body.dataset.theme = this.currentTheme;
        }
    }
    
    addBlock(type, content = '', zone = 'workspace', position = -1) {
        const blockId = this.currentBlockId++;
        const block = {
            id: blockId,
            type: type,
            content: content,
            zone: zone
        };
        
        if (zone === 'workspace') {
            if (position === -1) {
                this.workspaceBlocks.push(block);
            } else {
                this.workspaceBlocks.splice(position, 0, block);
            }
        } else {
            this.cacheBlocks.push(block);
        }
        
        this.renderBlocks();
        this.updateOutline();
        this.saveToLocalStorage();
        
        // Focus on the new block
        setTimeout(() => {
            const blockElement = document.querySelector(`[data-block-id="${blockId}"]`);
            if (blockElement) {
                const input = blockElement.querySelector('textarea, input');
                if (input) input.focus();
            }
        }, 100);
    }
    
    moveBlockToZone(blockId, targetZone) {
        let block = null;
        let sourceZone = null;
        
        // Find the block
        let index = this.workspaceBlocks.findIndex(b => b.id === blockId);
        if (index !== -1) {
            block = this.workspaceBlocks.splice(index, 1)[0];
            sourceZone = 'workspace';
        } else {
            index = this.cacheBlocks.findIndex(b => b.id === blockId);
            if (index !== -1) {
                block = this.cacheBlocks.splice(index, 1)[0];
                sourceZone = 'cache';
            }
        }
        
        if (block && sourceZone !== targetZone) {
            block.zone = targetZone;
            if (targetZone === 'workspace') {
                this.workspaceBlocks.push(block);
            } else {
                this.cacheBlocks.push(block);
            }
            
            this.renderBlocks();
            this.updateOutline();
            this.saveToLocalStorage();
        }
    }
    
    deleteBlock(blockId) {
        // Move to cache instead of deleting
        this.moveBlockToZone(blockId, 'cache');
    }
    
    permanentlyDeleteBlock(blockId) {
        let index = this.cacheBlocks.findIndex(b => b.id === blockId);
        if (index !== -1) {
            if (confirm('Permanently delete this block? This cannot be undone.')) {
                this.cacheBlocks.splice(index, 1);
                this.renderBlocks();
                this.saveToLocalStorage();
            }
        }
    }
    
    moveBlock(blockId, direction) {
        const blocks = this.workspaceBlocks;
        const index = blocks.findIndex(b => b.id === blockId);
        if (index === -1) return;
        
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= blocks.length) return;
        
        const block = blocks[index];
        blocks.splice(index, 1);
        blocks.splice(newIndex, 0, block);
        
        this.renderBlocks();
        this.updateOutline();
        this.saveToLocalStorage();
    }
    
    updateBlockContent(blockId, content) {
        let block = this.workspaceBlocks.find(b => b.id === blockId);
        if (!block) {
            block = this.cacheBlocks.find(b => b.id === blockId);
        }
        
        if (block) {
            block.content = content;
            this.updateOutline();
            this.saveToLocalStorage();
        }
    }
    
    renderBlocks() {
        const workspaceContainer = document.getElementById('blocksContainer');
        const cacheContainer = document.getElementById('cacheContainer');
        
        workspaceContainer.innerHTML = '';
        cacheContainer.innerHTML = '';
        
        this.workspaceBlocks.forEach((block, index) => {
            const blockElement = this.createBlockElement(block, index, 'workspace');
            workspaceContainer.appendChild(blockElement);
        });
        
        this.cacheBlocks.forEach((block, index) => {
            const blockElement = this.createBlockElement(block, index, 'cache');
            cacheContainer.appendChild(blockElement);
        });
        
        if (this.cacheBlocks.length === 0) {
            cacheContainer.innerHTML = '<p style="color: var(--secondary-color); text-align: center; padding: 20px;">Drag blocks here to cache them</p>';
        }
    }
    
    createBlockElement(block, index, zone) {
        const div = document.createElement('div');
        div.className = 'block';
        div.dataset.blockId = block.id;
        div.draggable = true;
        
        div.addEventListener('dragstart', (e) => {
            this.draggedBlock = block.id;
            div.classList.add('dragging');
        });
        
        div.addEventListener('dragend', () => {
            this.draggedBlock = null;
            div.classList.remove('dragging');
        });
        
        // Block header
        const header = document.createElement('div');
        header.className = 'block-header';
        
        const typeLabel = document.createElement('span');
        typeLabel.className = 'block-type';
        typeLabel.textContent = this.getBlockTypeLabel(block.type);
        
        const controls = document.createElement('div');
        controls.className = 'block-controls';
        
        if (zone === 'workspace') {
            if (index > 0) {
                const upBtn = document.createElement('button');
                upBtn.className = 'block-btn';
                upBtn.textContent = '↑';
                upBtn.onclick = () => this.moveBlock(block.id, 'up');
                controls.appendChild(upBtn);
            }
            
            if (index < this.workspaceBlocks.length - 1) {
                const downBtn = document.createElement('button');
                downBtn.className = 'block-btn';
                downBtn.textContent = '↓';
                downBtn.onclick = () => this.moveBlock(block.id, 'down');
                controls.appendChild(downBtn);
            }
        }
        
        if (block.type === 'table') {
            const editBtn = document.createElement('button');
            editBtn.className = 'block-btn';
            editBtn.textContent = '✏️';
            editBtn.onclick = () => this.editTable(block.id);
            controls.appendChild(editBtn);
        }
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'block-btn';
        deleteBtn.textContent = zone === 'workspace' ? '📦' : '🗑️';
        deleteBtn.title = zone === 'workspace' ? 'Move to cache' : 'Delete permanently';
        deleteBtn.onclick = () => {
            if (zone === 'workspace') {
                this.deleteBlock(block.id);
            } else {
                this.permanentlyDeleteBlock(block.id);
            }
        };
        controls.appendChild(deleteBtn);
        
        header.appendChild(typeLabel);
        header.appendChild(controls);
        
        // Block content
        const content = document.createElement('div');
        content.className = 'block-content';
        content.appendChild(this.createBlockInput(block));
        
        div.appendChild(header);
        div.appendChild(content);
        
        return div;
    }
    
    createBlockInput(block) {
        switch (block.type) {
            case 'frontmatter':
                const fmContainer = document.createElement('div');
                const fmTextarea = this.createTextarea(block, '---\ntitle: My Post\ndate: 2024-01-01\n---');
                fmTextarea.style.fontFamily = "'SF Mono', 'Monaco', 'Consolas', monospace";
                fmContainer.appendChild(fmTextarea);
                return fmContainer;
                
            case 'paragraph':
                return this.createTextarea(block, 'Write your paragraph here...');
                
            case 'heading':
                const headingContainer = document.createElement('div');
                const select = document.createElement('select');
                select.style.marginBottom = '10px';
                for (let i = 1; i <= 6; i++) {
                    const option = document.createElement('option');
                    option.value = i;
                    option.textContent = `H${i}`;
                    select.appendChild(option);
                }
                
                const match = block.content.match(/^(#{1,6})\s/);
                if (match) {
                    select.value = match[1].length;
                }
                
                select.onchange = () => {
                    const textarea = headingContainer.querySelector('textarea');
                    const text = textarea.value.replace(/^#{1,6}\s/, '');
                    textarea.value = '#'.repeat(select.value) + ' ' + text;
                    this.updateBlockContent(block.id, textarea.value);
                };
                
                const textarea = this.createTextarea(block, 'Heading text...');
                textarea.oninput = (e) => {
                    const level = select.value;
                    const text = e.target.value.replace(/^#{1,6}\s/, '');
                    e.target.value = '#'.repeat(level) + ' ' + text;
                    this.updateBlockContent(block.id, e.target.value);
                };
                
                headingContainer.appendChild(select);
                headingContainer.appendChild(textarea);
                return headingContainer;
                
            case 'list':
                return this.createTextarea(block, '- Item 1\n- Item 2\n- Item 3');
                
            case 'code':
                const codeContainer = document.createElement('div');
                const langInput = document.createElement('input');
                langInput.type = 'text';
                langInput.placeholder = 'Language (e.g., javascript)';
                langInput.style.marginBottom = '10px';
                
                const codeMatch = block.content.match(/^```(\w+)?/);
                if (codeMatch) {
                    langInput.value = codeMatch[1] || '';
                }
                
                langInput.oninput = () => {
                    const codeTextarea = codeContainer.querySelector('textarea');
                    const code = codeTextarea.value.replace(/^```\w*\n/, '').replace(/\n```$/, '');
                    const lang = langInput.value;
                    codeTextarea.value = '```' + lang + '\n' + code + '\n```';
                    this.updateBlockContent(block.id, codeTextarea.value);
                };
                
                const codeTextarea = this.createTextarea(block, 'Your code here...');
                codeTextarea.style.fontFamily = "'SF Mono', 'Monaco', 'Consolas', monospace";
                codeTextarea.oninput = (e) => {
                    this.updateBlockContent(block.id, e.target.value);
                };
                
                codeContainer.appendChild(langInput);
                codeContainer.appendChild(codeTextarea);
                return codeContainer;
                
            case 'table':
                return this.createRenderView(block);
                
            case 'quote':
                return this.createTextarea(block, '> Your quote here...');
                
            case 'hr':
                const hrDiv = document.createElement('div');
                hrDiv.innerHTML = '<hr style="border: 1px solid var(--border-color); margin: 10px 0;">';
                hrDiv.innerHTML += '<p style="color: var(--secondary-color); font-size: 0.85rem; margin-top: 8px;">Horizontal rule (---)</p>';
                return hrDiv;
                
            case 'br':
                const brDiv = document.createElement('div');
                brDiv.innerHTML = '<p style="color: var(--secondary-color); font-size: 0.85rem;">Line break</p>';
                return brDiv;
                
            case 'html':
                return this.createTextarea(block, '<div>\n  <!-- Your HTML here -->\n</div>');
                
            case 'mermaid':
                const mermaidContainer = document.createElement('div');
                const mermaidTextarea = this.createTextarea(block, '```mermaid\ngraph TD;\n  A-->B;\n  A-->C;\n  B-->D;\n  C-->D;\n```');
                mermaidTextarea.style.fontFamily = "'SF Mono', 'Monaco', 'Consolas', monospace";
                mermaidContainer.appendChild(mermaidTextarea);
                return mermaidContainer;
                
            default:
                return this.createTextarea(block, 'Content...');
        }
    }
    
    createTextarea(block, placeholder) {
        const textarea = document.createElement('textarea');
        textarea.value = block.content || '';
        textarea.placeholder = placeholder;
        textarea.oninput = (e) => {
            this.updateBlockContent(block.id, e.target.value);
        };
        return textarea;
    }
    
    createRenderView(block) {
        const div = document.createElement('div');
        div.style.padding = '10px';
        div.style.background = 'var(--bg-color)';
        div.style.borderRadius = '4px';
        div.style.border = '1px solid var(--border-color)';
        
        if (block.content) {
            div.innerHTML = marked.parse(block.content);
        } else {
            div.innerHTML = '<p style="color: var(--secondary-color);">No content yet. Click edit button to add content.</p>';
        }
        
        return div;
    }
    
    getBlockTypeLabel(type) {
        const labels = {
            'frontmatter': '⚙️ Frontmatter',
            'paragraph': '📝 Paragraph',
            'heading': '📌 Heading',
            'list': '📋 List',
            'code': '💻 Code',
            'table': '📊 Table',
            'quote': '💬 Quote',
            'hr': '➖ HR',
            'br': '⏎ BR',
            'html': '🌐 HTML',
            'mermaid': '📊 Mermaid'
        };
        return labels[type] || type;
    }
    
    // Table Editor Methods
    editTable(blockId) {
        this.currentEditingTableBlockId = blockId;
        let block = this.workspaceBlocks.find(b => b.id === blockId);
        if (!block) {
            block = this.cacheBlocks.find(b => b.id === blockId);
        }
        
        if (block.content) {
            this.parseTableContent(block.content);
        } else {
            this.generateTableEditor(3, 3);
        }
        
        document.getElementById('tableModal').classList.add('active');
    }
    
    parseTableContent(markdown) {
        const lines = markdown.trim().split('\n');
        const rows = lines.filter(line => line.trim().startsWith('|'));
        
        if (rows.length > 0) {
            const headerRow = rows[0].split('|').filter(cell => cell.trim());
            const cols = headerRow.length;
            const dataRows = rows.filter((_, idx) => idx !== 1);
            
            this.generateTableEditor(dataRows.length, cols);
            
            const table = document.querySelector('#tableEditor table');
            dataRows.forEach((row, rowIdx) => {
                const cells = row.split('|').filter(cell => cell.trim());
                cells.forEach((cell, colIdx) => {
                    const input = table.rows[rowIdx]?.cells[colIdx]?.querySelector('input');
                    if (input) {
                        input.value = cell.trim();
                    }
                });
            });
        }
    }
    
    generateTableEditor(rows = 3, cols = 3) {
        const editor = document.getElementById('tableEditor');
        editor.innerHTML = '';
        
        const table = document.createElement('table');
        
        for (let i = 0; i < rows; i++) {
            const tr = document.createElement('tr');
            for (let j = 0; j < cols; j++) {
                const td = document.createElement('td');
                td.dataset.row = i;
                td.dataset.col = j;
                
                const input = document.createElement('input');
                input.type = 'text';
                input.placeholder = i === 0 ? `Header ${j + 1}` : `R${i}C${j + 1}`;
                
                td.onclick = () => this.selectTableCell(td, input.value);
                input.onclick = (e) => e.stopPropagation();
                input.onfocus = () => this.selectTableCell(td, input.value);
                
                td.appendChild(input);
                tr.appendChild(td);
            }
            table.appendChild(tr);
        }
        
        editor.appendChild(table);
    }
    
    selectTableCell(cell, content) {
        // Remove previous selection
        document.querySelectorAll('#tableEditor td').forEach(td => {
            td.classList.remove('selected');
        });
        
        // Select this cell
        cell.classList.add('selected');
        this.selectedTableCell = cell;
        
        // Update cell editor
        const row = parseInt(cell.dataset.row) + 1;
        const col = parseInt(cell.dataset.col) + 1;
        document.getElementById('selectedCellLabel').textContent = `Row ${row}, Column ${col}`;
        document.getElementById('cellContentEditor').value = content;
    }
    
    addTableRow() {
        const table = document.querySelector('#tableEditor table');
        if (!table) return;
        
        const cols = table.rows[0]?.cells.length || 3;
        const tr = document.createElement('tr');
        const newRowIndex = table.rows.length;
        
        for (let j = 0; j < cols; j++) {
            const td = document.createElement('td');
            td.dataset.row = newRowIndex;
            td.dataset.col = j;
            
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `R${newRowIndex + 1}C${j + 1}`;
            
            td.onclick = () => this.selectTableCell(td, input.value);
            input.onclick = (e) => e.stopPropagation();
            input.onfocus = () => this.selectTableCell(td, input.value);
            
            td.appendChild(input);
            tr.appendChild(td);
        }
        
        table.appendChild(tr);
    }
    
    removeTableRow() {
        const table = document.querySelector('#tableEditor table');
        if (!table || table.rows.length <= 1) {
            alert('Cannot remove header row');
            return;
        }
        
        table.deleteRow(table.rows.length - 1);
    }
    
    addTableColumn() {
        const table = document.querySelector('#tableEditor table');
        if (!table) return;
        
        Array.from(table.rows).forEach((row, rowIndex) => {
            const newColIndex = row.cells.length;
            const td = document.createElement('td');
            td.dataset.row = rowIndex;
            td.dataset.col = newColIndex;
            
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = rowIndex === 0 ? `Header ${newColIndex + 1}` : `R${rowIndex + 1}C${newColIndex + 1}`;
            
            td.onclick = () => this.selectTableCell(td, input.value);
            input.onclick = (e) => e.stopPropagation();
            input.onfocus = () => this.selectTableCell(td, input.value);
            
            td.appendChild(input);
            row.appendChild(td);
        });
    }
    
    removeTableColumn() {
        const table = document.querySelector('#tableEditor table');
        if (!table) return;
        
        const cols = table.rows[0]?.cells.length || 0;
        if (cols <= 1) {
            alert('Table must have at least one column');
            return;
        }
        
        Array.from(table.rows).forEach(row => {
            if (row.cells.length > 0) {
                row.deleteCell(row.cells.length - 1);
            }
        });
    }
    
    confirmTable() {
        const table = document.querySelector('#tableEditor table');
        if (!table) return;
        
        const rows = table.rows.length;
        const cols = table.rows[0]?.cells.length || 0;
        
        let markdown = '';
        
        // Header row
        let headerRow = '|';
        for (let j = 0; j < cols; j++) {
            const input = table.rows[0].cells[j].querySelector('input');
            headerRow += ' ' + (input.value || `Col ${j + 1}`) + ' |';
        }
        markdown += headerRow + '\n';
        
        // Separator row
        let separator = '|';
        for (let j = 0; j < cols; j++) {
            separator += ' --- |';
        }
        markdown += separator + '\n';
        
        // Data rows
        for (let i = 1; i < rows; i++) {
            let dataRow = '|';
            for (let j = 0; j < cols; j++) {
                const input = table.rows[i].cells[j].querySelector('input');
                dataRow += ' ' + (input.value || '') + ' |';
            }
            markdown += dataRow + '\n';
        }
        
        if (this.currentEditingTableBlockId !== null) {
            this.updateBlockContent(this.currentEditingTableBlockId, markdown.trim());
            this.renderBlocks();
        }
        
        document.getElementById('tableModal').classList.remove('active');
        this.currentEditingTableBlockId = null;
        this.selectedTableCell = null;
    }
    
    // Outline Management
    updateOutline() {
        const outlineContent = document.getElementById('outlineContent');
        outlineContent.innerHTML = '';
        
        this.workspaceBlocks.forEach((block, index) => {
            const item = document.createElement('div');
            item.className = 'outline-item';
            item.dataset.blockId = block.id;
            
            const icon = document.createElement('span');
            icon.className = 'outline-item-icon';
            icon.textContent = this.getBlockIcon(block.type);
            
            const text = document.createElement('span');
            text.className = 'outline-item-text';
            text.textContent = this.getBlockOutlineText(block);
            
            item.appendChild(icon);
            item.appendChild(text);
            
            item.onclick = () => {
                const blockElement = document.querySelector(`[data-block-id="${block.id}"]`);
                if (blockElement) {
                    blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    blockElement.style.boxShadow = '0 0 0 3px var(--primary-color)';
                    setTimeout(() => {
                        blockElement.style.boxShadow = '';
                    }, 1000);
                }
            };
            
            outlineContent.appendChild(item);
        });
    }
    
    getBlockIcon(type) {
        const icons = {
            'frontmatter': '⚙️',
            'paragraph': '📝',
            'heading': '📌',
            'list': '📋',
            'code': '💻',
            'table': '📊',
            'quote': '💬',
            'hr': '➖',
            'br': '⏎',
            'html': '🌐',
            'mermaid': '📊'
        };
        return icons[type] || '📄';
    }
    
    getBlockOutlineText(block) {
        if (!block.content) {
            return `[Empty ${block.type}]`;
        }
        
        switch (block.type) {
            case 'heading':
                const headingText = block.content.replace(/^#{1,6}\s/, '');
                return headingText.substring(0, 40) || '[Empty heading]';
            
            case 'paragraph':
                return block.content.substring(0, 40) + (block.content.length > 40 ? '...' : '');
            
            case 'code':
                const match = block.content.match(/^```(\w+)?/);
                return match && match[1] ? `Code (${match[1]})` : 'Code block';
            
            case 'table':
                const lines = block.content.split('\n').filter(l => l.trim().startsWith('|'));
                return `Table (${lines.length > 2 ? lines.length - 2 : 0} rows)`;
            
            case 'list':
                const items = block.content.split('\n').filter(l => l.trim());
                return `List (${items.length} items)`;
            
            case 'frontmatter':
                return 'Frontmatter';
            
            case 'hr':
                return 'Horizontal rule';
            
            case 'br':
                return 'Line break';
            
            case 'html':
                return 'HTML block';
            
            case 'mermaid':
                return 'Mermaid diagram';
            
            default:
                return block.type;
        }
    }
    
    // Import/Export
    showImportModal() {
        document.getElementById('importTextarea').value = '';
        document.getElementById('importModal').classList.add('active');
    }
    
    showExportModal() {
        const markdown = this.exportToMarkdown();
        document.getElementById('exportTextarea').value = markdown;
        document.getElementById('exportModal').classList.add('active');
    }
    
    importMarkdown() {
        const markdown = document.getElementById('importTextarea').value;
        if (!markdown.trim()) {
            alert('Please paste some markdown content');
            return;
        }
        
        if (this.workspaceBlocks.length > 0) {
            if (!confirm('This will replace all existing blocks. Continue?')) {
                return;
            }
        }
        
        this.workspaceBlocks = [];
        this.cacheBlocks = [];
        this.currentBlockId = 0;
        
        // Parse frontmatter first
        let content = markdown;
        const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n/);
        if (frontmatterMatch) {
            this.addBlock('frontmatter', frontmatterMatch[0].trim(), 'workspace');
            content = markdown.substring(frontmatterMatch[0].length);
        }
        
        // Parse markdown into blocks
        const lines = content.split('\n');
        let currentBlock = null;
        let inCodeBlock = false;
        let codeBlockContent = '';
        let inMermaidBlock = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Code blocks
            if (line.startsWith('```')) {
                if (!inCodeBlock && !inMermaidBlock) {
                    inCodeBlock = true;
                    codeBlockContent = line;
                    // Check if it's a mermaid block
                    if (line.includes('mermaid')) {
                        inMermaidBlock = true;
                        inCodeBlock = false;
                    }
                } else {
                    codeBlockContent += '\n' + line;
                    if (inMermaidBlock) {
                        this.addBlock('mermaid', codeBlockContent, 'workspace');
                        inMermaidBlock = false;
                    } else {
                        this.addBlock('code', codeBlockContent, 'workspace');
                        inCodeBlock = false;
                    }
                    codeBlockContent = '';
                }
                continue;
            }
            
            if (inCodeBlock || inMermaidBlock) {
                codeBlockContent += '\n' + line;
                continue;
            }
            
            // Horizontal rules
            if (line.match(/^[-*_]{3,}$/)) {
                this.addBlock('hr', '---', 'workspace');
                continue;
            }
            
            // Headings
            if (line.match(/^#{1,6}\s/)) {
                this.addBlock('heading', line, 'workspace');
                continue;
            }
            
            // Tables
            if (line.trim().startsWith('|')) {
                if (!currentBlock || currentBlock.type !== 'table') {
                    currentBlock = { type: 'table', content: '' };
                }
                currentBlock.content += line + '\n';
                continue;
            } else if (currentBlock && currentBlock.type === 'table') {
                this.addBlock('table', currentBlock.content.trim(), 'workspace');
                currentBlock = null;
            }
            
            // Lists
            if (line.match(/^[\s]*[-*+]\s/) || line.match(/^[\s]*\d+\.\s/)) {
                if (!currentBlock || currentBlock.type !== 'list') {
                    currentBlock = { type: 'list', content: '' };
                }
                currentBlock.content += line + '\n';
                continue;
            } else if (currentBlock && currentBlock.type === 'list') {
                this.addBlock('list', currentBlock.content.trim(), 'workspace');
                currentBlock = null;
            }
            
            // Quotes
            if (line.startsWith('>')) {
                if (!currentBlock || currentBlock.type !== 'quote') {
                    currentBlock = { type: 'quote', content: '' };
                }
                currentBlock.content += line + '\n';
                continue;
            } else if (currentBlock && currentBlock.type === 'quote') {
                this.addBlock('quote', currentBlock.content.trim(), 'workspace');
                currentBlock = null;
            }
            
            // HTML blocks
            if (line.match(/^<[a-z]+/i)) {
                if (!currentBlock || currentBlock.type !== 'html') {
                    currentBlock = { type: 'html', content: '' };
                }
                currentBlock.content += line + '\n';
                continue;
            } else if (currentBlock && currentBlock.type === 'html' && line.match(/<\/[a-z]+>/i)) {
                currentBlock.content += line + '\n';
                this.addBlock('html', currentBlock.content.trim(), 'workspace');
                currentBlock = null;
                continue;
            }
            
            // Line breaks
            if (line.trim() === '') {
                if (currentBlock && currentBlock.type === 'paragraph') {
                    this.addBlock('paragraph', currentBlock.content.trim(), 'workspace');
                    currentBlock = null;
                }
                continue;
            }
            
            // Paragraphs
            if (!currentBlock || currentBlock.type !== 'paragraph') {
                currentBlock = { type: 'paragraph', content: '' };
            }
            currentBlock.content += line + '\n';
        }
        
        // Add any remaining block
        if (currentBlock) {
            this.addBlock(currentBlock.type, currentBlock.content.trim(), 'workspace');
        }
        
        this.renderBlocks();
        this.updateOutline();
        this.saveToLocalStorage();
        document.getElementById('importModal').classList.remove('active');
    }
    
    exportToMarkdown() {
        return this.workspaceBlocks.map(block => {
            if (block.type === 'hr') {
                return '---';
            } else if (block.type === 'br') {
                return '';
            } else {
                return block.content;
            }
        }).join('\n\n');
    }
    
    copyToClipboard() {
        const textarea = document.getElementById('exportTextarea');
        textarea.select();
        document.execCommand('copy');
        
        const btn = document.getElementById('copyBtn');
        const originalText = btn.textContent;
        btn.textContent = '✅ Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }
    
    downloadMarkdown() {
        const markdown = this.exportToMarkdown();
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'document.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Local Storage
    saveToLocalStorage() {
        try {
            localStorage.setItem('blockyMarkdownWorkspace', JSON.stringify(this.workspaceBlocks));
            localStorage.setItem('blockyMarkdownCache', JSON.stringify(this.cacheBlocks));
            localStorage.setItem('blockyMarkdownCurrentId', this.currentBlockId.toString());
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
        }
    }
    
    loadFromLocalStorage() {
        try {
            const savedWorkspace = localStorage.getItem('blockyMarkdownWorkspace');
            const savedCache = localStorage.getItem('blockyMarkdownCache');
            const savedId = localStorage.getItem('blockyMarkdownCurrentId');
            
            if (savedWorkspace) {
                this.workspaceBlocks = JSON.parse(savedWorkspace);
            }
            
            if (savedCache) {
                this.cacheBlocks = JSON.parse(savedCache);
            }
            
            if (savedId) {
                this.currentBlockId = parseInt(savedId);
            }
            
            this.renderBlocks();
        } catch (e) {
            console.error('Failed to load from localStorage:', e);
        }
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.blockyMarkdown = new BlockyMarkdown();
});
