// Blocky Markdown Editor - Main Application
class BlockyMarkdown {
    constructor() {
        this.blocks = [];
        this.currentBlockId = 0;
        this.currentEditingTableBlockId = null;
        this.currentEditingLinkBlockId = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadFromLocalStorage();
        
        // If no blocks exist, add a welcome block
        if (this.blocks.length === 0) {
            this.addBlock('paragraph');
        }
    }
    
    setupEventListeners() {
        // Add block buttons
        document.querySelectorAll('.btn-add').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                this.addBlock(type);
            });
        });
        
        // Import/Export buttons
        document.getElementById('importBtn').addEventListener('click', () => this.showImportModal());
        document.getElementById('exportBtn').addEventListener('click', () => this.showExportModal());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearAll());
        
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
        
        // Table editor
        document.getElementById('generateTable').addEventListener('click', () => this.generateTableEditor());
        document.getElementById('tableConfirm').addEventListener('click', () => this.confirmTable());
        
        // Link editor
        document.getElementById('linkConfirm').addEventListener('click', () => this.confirmLink());
        
        // Close modal on background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }
    
    addBlock(type, content = '', position = -1) {
        const blockId = this.currentBlockId++;
        const block = {
            id: blockId,
            type: type,
            content: content
        };
        
        if (position === -1) {
            this.blocks.push(block);
        } else {
            this.blocks.splice(position, 0, block);
        }
        
        this.renderBlocks();
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
    
    deleteBlock(blockId) {
        const index = this.blocks.findIndex(b => b.id === blockId);
        if (index !== -1) {
            if (confirm('Delete this block?')) {
                this.blocks.splice(index, 1);
                this.renderBlocks();
                this.saveToLocalStorage();
            }
        }
    }
    
    moveBlock(blockId, direction) {
        const index = this.blocks.findIndex(b => b.id === blockId);
        if (index === -1) return;
        
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= this.blocks.length) return;
        
        const block = this.blocks[index];
        this.blocks.splice(index, 1);
        this.blocks.splice(newIndex, 0, block);
        
        this.renderBlocks();
        this.saveToLocalStorage();
    }
    
    updateBlockContent(blockId, content) {
        const block = this.blocks.find(b => b.id === blockId);
        if (block) {
            block.content = content;
            this.saveToLocalStorage();
        }
    }
    
    renderBlocks() {
        const container = document.getElementById('blocksContainer');
        container.innerHTML = '';
        
        this.blocks.forEach((block, index) => {
            const blockElement = this.createBlockElement(block, index);
            container.appendChild(blockElement);
        });
    }
    
    createBlockElement(block, index) {
        const div = document.createElement('div');
        div.className = 'block';
        div.dataset.blockId = block.id;
        
        // Block header
        const header = document.createElement('div');
        header.className = 'block-header';
        
        const typeLabel = document.createElement('span');
        typeLabel.className = 'block-type';
        typeLabel.textContent = this.getBlockTypeLabel(block.type);
        
        const controls = document.createElement('div');
        controls.className = 'block-controls';
        
        if (index > 0) {
            const upBtn = document.createElement('button');
            upBtn.className = 'block-btn';
            upBtn.textContent = '↑';
            upBtn.onclick = () => this.moveBlock(block.id, 'up');
            controls.appendChild(upBtn);
        }
        
        if (index < this.blocks.length - 1) {
            const downBtn = document.createElement('button');
            downBtn.className = 'block-btn';
            downBtn.textContent = '↓';
            downBtn.onclick = () => this.moveBlock(block.id, 'down');
            controls.appendChild(downBtn);
        }
        
        if (block.type === 'table') {
            const editBtn = document.createElement('button');
            editBtn.className = 'block-btn';
            editBtn.textContent = '✏️';
            editBtn.onclick = () => this.editTable(block.id);
            controls.appendChild(editBtn);
        }
        
        if (block.type === 'link') {
            const editBtn = document.createElement('button');
            editBtn.className = 'block-btn';
            editBtn.textContent = '✏️';
            editBtn.onclick = () => this.editLink(block.id);
            controls.appendChild(editBtn);
        }
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'block-btn';
        deleteBtn.textContent = '🗑️';
        deleteBtn.onclick = () => this.deleteBlock(block.id);
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
            case 'paragraph':
                return this.createTextarea(block, 'Write your paragraph here...');
                
            case 'heading':
                const headingContainer = document.createElement('div');
                const select = document.createElement('select');
                select.style.marginBottom = '10px';
                for (let i = 1; i <= 6; i++) {
                    const option = document.createElement('option');
                    option.value = i;
                    option.textContent = `Heading ${i}`;
                    select.appendChild(option);
                }
                
                // Parse existing heading level
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
                
                // Parse language from code block
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
                codeTextarea.style.fontFamily = "'Courier New', monospace";
                codeTextarea.oninput = (e) => {
                    this.updateBlockContent(block.id, e.target.value);
                };
                
                codeContainer.appendChild(langInput);
                codeContainer.appendChild(codeTextarea);
                return codeContainer;
                
            case 'table':
            case 'link':
                return this.createRenderView(block);
                
            case 'quote':
                return this.createTextarea(block, '> Your quote here...');
                
            default:
                return this.createTextarea(block, 'Content...');
        }
    }
    
    createTextarea(block, placeholder) {
        const textarea = document.createElement('textarea');
        textarea.value = block.content;
        textarea.placeholder = placeholder;
        textarea.oninput = (e) => {
            this.updateBlockContent(block.id, e.target.value);
        };
        return textarea;
    }
    
    createRenderView(block) {
        const div = document.createElement('div');
        div.className = 'block-render';
        
        if (block.content) {
            div.innerHTML = marked.parse(block.content);
        } else {
            div.innerHTML = '<p style="color: #888;">No content yet. Click edit button to add content.</p>';
        }
        
        return div;
    }
    
    getBlockTypeLabel(type) {
        const labels = {
            'paragraph': '📝 Paragraph',
            'heading': '📌 Heading',
            'list': '📋 List',
            'code': '💻 Code',
            'table': '📊 Table',
            'link': '🔗 Link',
            'quote': '💬 Quote'
        };
        return labels[type] || type;
    }
    
    // Table Editor
    editTable(blockId) {
        this.currentEditingTableBlockId = blockId;
        const block = this.blocks.find(b => b.id === blockId);
        
        // Parse existing table
        if (block.content) {
            this.parseTableContent(block.content);
        } else {
            document.getElementById('tableRows').value = 3;
            document.getElementById('tableCols').value = 3;
            this.generateTableEditor();
        }
        
        document.getElementById('tableModal').classList.add('active');
    }
    
    parseTableContent(markdown) {
        const lines = markdown.trim().split('\n');
        const rows = lines.filter(line => line.trim().startsWith('|'));
        
        if (rows.length > 0) {
            const cols = rows[0].split('|').filter(cell => cell.trim()).length;
            const dataRows = rows.filter((_, idx) => idx !== 1); // Skip separator line
            
            document.getElementById('tableRows').value = dataRows.length;
            document.getElementById('tableCols').value = cols;
            this.generateTableEditor();
            
            // Fill in existing values
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
    
    generateTableEditor() {
        const rows = parseInt(document.getElementById('tableRows').value) || 3;
        const cols = parseInt(document.getElementById('tableCols').value) || 3;
        
        const editor = document.getElementById('tableEditor');
        editor.innerHTML = '';
        
        const table = document.createElement('table');
        
        for (let i = 0; i < rows; i++) {
            const tr = document.createElement('tr');
            for (let j = 0; j < cols; j++) {
                const td = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'text';
                input.placeholder = i === 0 ? `Header ${j + 1}` : `Row ${i}, Col ${j + 1}`;
                td.appendChild(input);
                tr.appendChild(td);
            }
            table.appendChild(tr);
        }
        
        editor.appendChild(table);
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
    }
    
    // Link Editor
    editLink(blockId) {
        this.currentEditingLinkBlockId = blockId;
        const block = this.blocks.find(b => b.id === blockId);
        
        // Parse existing link
        if (block.content) {
            const match = block.content.match(/\[([^\]]+)\]\(([^)"]+)(?:\s+"([^"]+)")?\)/);
            if (match) {
                document.getElementById('linkText').value = match[1] || '';
                document.getElementById('linkUrl').value = match[2] || '';
                document.getElementById('linkTitle').value = match[3] || '';
            }
        } else {
            document.getElementById('linkText').value = '';
            document.getElementById('linkUrl').value = '';
            document.getElementById('linkTitle').value = '';
        }
        
        document.getElementById('linkModal').classList.add('active');
    }
    
    confirmLink() {
        const text = document.getElementById('linkText').value;
        const url = document.getElementById('linkUrl').value;
        const title = document.getElementById('linkTitle').value;
        
        if (!text || !url) {
            alert('Please provide both link text and URL');
            return;
        }
        
        let markdown = `[${text}](${url}`;
        if (title) {
            markdown += ` "${title}"`;
        }
        markdown += ')';
        
        if (this.currentEditingLinkBlockId !== null) {
            this.updateBlockContent(this.currentEditingLinkBlockId, markdown);
            this.renderBlocks();
        }
        
        document.getElementById('linkModal').classList.remove('active');
        this.currentEditingLinkBlockId = null;
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
        
        if (this.blocks.length > 0) {
            if (!confirm('This will replace all existing blocks. Continue?')) {
                return;
            }
        }
        
        this.blocks = [];
        this.currentBlockId = 0;
        
        // Parse markdown into blocks
        const lines = markdown.split('\n');
        let currentBlock = null;
        let inCodeBlock = false;
        let codeBlockContent = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Code blocks
            if (line.startsWith('```')) {
                if (!inCodeBlock) {
                    inCodeBlock = true;
                    codeBlockContent = line;
                } else {
                    codeBlockContent += '\n' + line;
                    this.addBlock('code', codeBlockContent);
                    inCodeBlock = false;
                    codeBlockContent = '';
                }
                continue;
            }
            
            if (inCodeBlock) {
                codeBlockContent += '\n' + line;
                continue;
            }
            
            // Headings
            if (line.match(/^#{1,6}\s/)) {
                this.addBlock('heading', line);
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
                this.addBlock('table', currentBlock.content.trim());
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
                this.addBlock('list', currentBlock.content.trim());
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
                this.addBlock('quote', currentBlock.content.trim());
                currentBlock = null;
            }
            
            // Links (standalone)
            if (line.match(/^\[([^\]]+)\]\(([^)]+)\)$/)) {
                this.addBlock('link', line);
                continue;
            }
            
            // Empty lines
            if (line.trim() === '') {
                if (currentBlock && currentBlock.type === 'paragraph') {
                    this.addBlock('paragraph', currentBlock.content.trim());
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
            this.addBlock(currentBlock.type, currentBlock.content.trim());
        }
        
        this.renderBlocks();
        this.saveToLocalStorage();
        document.getElementById('importModal').classList.remove('active');
    }
    
    exportToMarkdown() {
        return this.blocks.map(block => block.content).join('\n\n');
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
    
    clearAll() {
        if (confirm('Are you sure you want to clear all blocks? This cannot be undone.')) {
            this.blocks = [];
            this.currentBlockId = 0;
            this.renderBlocks();
            this.saveToLocalStorage();
            this.addBlock('paragraph');
        }
    }
    
    // Local Storage
    saveToLocalStorage() {
        try {
            localStorage.setItem('blockyMarkdownBlocks', JSON.stringify(this.blocks));
            localStorage.setItem('blockyMarkdownCurrentId', this.currentBlockId.toString());
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
        }
    }
    
    loadFromLocalStorage() {
        try {
            const savedBlocks = localStorage.getItem('blockyMarkdownBlocks');
            const savedId = localStorage.getItem('blockyMarkdownCurrentId');
            
            if (savedBlocks) {
                this.blocks = JSON.parse(savedBlocks);
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
