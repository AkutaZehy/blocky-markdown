// Main Blocky Markdown Editor Application
class BlockyMarkdown {
    constructor() {
        this.workspaceBlocks = [];
        this.cacheBlocks = [];
        this.currentBlockId = 0;
        this.currentTheme = 'daytime';
        this.collapsedHeadings = new Set();
        this.addPosition = 'end';
        this.history = [];
        this.redoStack = [];
        this.maxHistory = 100;
        this.isRestoringHistory = false;
        this.previewMode = false;
        this.defaultTip = 'Blocky Markdown';
        
        // Initialize managers
        this.outlineManager = new OutlineManager(this);
        this.dragDropManager = new DragDropManager(this);
        this.linkEditor = new LinkEditorManager(this);
        this.tableEditor = new TableEditorManager(this);
        this.blockFactory = new BlockFactory(this);
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadFromLocalStorage();
        this.loadTheme();
        this.setupResizers();
        this.rebuildLinkedList('workspace');
        this.rebuildLinkedList('cache');
        this.recordHistory();
        
        // Initialize managers
        this.dragDropManager.setup();
        this.linkEditor.setup();
        this.tableEditor.setup();
        this.updateAddPositionUI();
        this.updatePreviewUI();
        this.setTip(this.defaultTip);
        this.updatePreviewUI();
        
        // If no blocks exist, add a welcome block
        if (this.workspaceBlocks.length === 0) {
            this.addBlock('paragraph', '', 'workspace');
        }
        
        this.outlineManager.update();
    }
    
    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        document.getElementById('historyLimitBtn').addEventListener('click', () => {
            const value = prompt('Set max history steps (default 100)', this.maxHistory.toString());
            const num = parseInt(value, 10);
            if (!isNaN(num) && num > 0) {
                this.maxHistory = num;
                this.trimHistory();
            }
        });
        
        document.getElementById('previewToggle').addEventListener('click', () => {
            this.previewMode = !this.previewMode;
            this.updatePreviewUI();
        });
        
        // Add block buttons
        document.querySelectorAll('.btn-add').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const type = e.target.closest('button').dataset.type;
                const position = this.addPosition === 'start' ? 0 : -1;
                console.debug('addBlock click', { type, addPosition: this.addPosition, insertPosition: position });
                this.addBlock(type, '', 'workspace', position);
            });
        });
        
        // Add position toggle
        document.getElementById('addPosToggle').addEventListener('click', () => {
            this.addPosition = this.addPosition === 'start' ? 'end' : 'start';
            this.updateAddPositionUI();
        });
        
        // Import/Export buttons
        document.getElementById('importBtn').addEventListener('click', () => this.showImportModal());
        document.getElementById('exportBtn').addEventListener('click', () => this.showExportModal());
        
        this.registerTip('#undoBtn', 'Click to undo (Ctrl+Z)');
        this.registerTip('#redoBtn', 'Click to redo (Ctrl+Y)');
        this.registerTip('#historyLimitBtn', 'Set history steps');
        this.registerTip('#themeToggle', 'Toggle theme');
        this.registerTip('#importBtn', 'Import markdown');
        this.registerTip('#exportBtn', 'Export markdown (Ctrl+S)');
        this.registerTip('#previewToggle', 'Toggle preview/edit');
        this.registerTip('#addPosToggle', 'Click to toggle add position');
        
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
        
        // Clear cache
        document.getElementById('clearCacheBtn').addEventListener('click', () => {
            this.recordHistory();
            this.cacheBlocks = [];
            this.rebuildLinkedList('cache');
            this.renderBlocks();
            this.saveToLocalStorage();
        });
        
        // Clear workspace
        document.getElementById('clearWorkspaceBtn').addEventListener('click', () => {
            this.recordHistory();
            this.workspaceBlocks = [];
            this.rebuildLinkedList('workspace');
            this.renderBlocks();
            this.outlineManager.update();
            this.saveToLocalStorage();
        });

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                this.undo();
            } else if (e.ctrlKey && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                this.redo();
            } else if (e.ctrlKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                this.showExportModal();
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
        
        // Close edit mode when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.block') && !e.target.closest('.modal')) {
                this.closeAllEditModes();
            }
        });
    }
    
    setupResizers() {
        const outlineResizer = document.getElementById('outlineResizer');
        const cacheResizer = document.getElementById('cacheResizer');
        const outlineSidebar = document.getElementById('outlineSidebar');
        const cacheSidebar = document.getElementById('cacheSidebar');
        
        this.setupResizer(outlineResizer, outlineSidebar, 'left');
        this.setupResizer(cacheResizer, cacheSidebar, 'right');
    }
    
    updateAddPositionUI() {
        const toggleBtn = document.getElementById('addPosToggle');
        if (toggleBtn) {
            const isStart = this.addPosition === 'start';
            toggleBtn.textContent = isStart ? 'Add → Start' : 'Add → End';
            toggleBtn.title = 'Click to toggle';
        }
    }
    
    updatePreviewUI() {
        const previewContainer = document.getElementById('previewContainer');
        const blocksContainer = document.getElementById('blocksContainer');
        const btn = document.getElementById('previewToggle');
        if (!previewContainer || !blocksContainer || !btn) return;
        
        if (this.previewMode) {
            const markdown = MarkdownUtils.exportBlocks(this.workspaceBlocks);
            if (typeof marked !== 'undefined') {
                previewContainer.innerHTML = marked.parse(markdown);
            } else {
                previewContainer.textContent = markdown;
            }
            previewContainer.style.display = 'block';
            blocksContainer.style.display = 'none';
            btn.textContent = 'Edit';
            btn.title = 'Switch to edit mode';
        } else {
            previewContainer.style.display = 'none';
            blocksContainer.style.display = 'block';
            btn.textContent = 'Preview';
            btn.title = 'Toggle preview/edit';
        }
        this.setTip(this.defaultTip);
    }
    
    setupResizer(resizer, panel, side) {
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        
        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = panel.offsetWidth;
            resizer.classList.add('resizing');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const delta = side === 'left' ? e.clientX - startX : startX - e.clientX;
            const newWidth = Math.max(150, Math.min(500, startWidth + delta));
            panel.style.width = newWidth + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                resizer.classList.remove('resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }
    
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'daytime' ? 'nightcore' : 'daytime';
        document.body.dataset.theme = this.currentTheme;
        Storage.save('blockyMarkdownTheme', this.currentTheme);
        
        // Update theme button
        const themeBtn = document.getElementById('themeToggle');
        themeBtn.textContent = this.currentTheme === 'daytime' ? '☀ Theme' : '🌙 Theme';
    }
    
    loadTheme() {
        const savedTheme = Storage.load('blockyMarkdownTheme');
        if (savedTheme && (savedTheme === 'daytime' || savedTheme === 'nightcore')) {
            this.currentTheme = savedTheme;
            document.body.dataset.theme = this.currentTheme;
            
            const themeBtn = document.getElementById('themeToggle');
            themeBtn.textContent = this.currentTheme === 'daytime' ? '☀ Theme' : '🌙 Theme';
        }
    }
    
    setTip(text) {
        const el = document.getElementById('tipsText');
        if (el) {
            el.textContent = text || this.defaultTip;
        }
    }
    
    registerTip(selector, text) {
        document.querySelectorAll(selector).forEach(el => {
            el.addEventListener('mouseenter', () => this.setTip(text));
            el.addEventListener('mouseleave', () => this.setTip(this.defaultTip));
        });
    }
    
    recordHistory() {
        if (this.isRestoringHistory) return;
        const snapshot = {
            workspaceBlocks: JSON.parse(JSON.stringify(this.workspaceBlocks)),
            cacheBlocks: JSON.parse(JSON.stringify(this.cacheBlocks)),
            currentBlockId: this.currentBlockId,
            collapsedHeadings: Array.from(this.collapsedHeadings)
        };
        this.history.push(snapshot);
        this.trimHistory();
        this.redoStack = [];
    }
    
    trimHistory() {
        while (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }
    
    applyState(state) {
        this.isRestoringHistory = true;
        this.workspaceBlocks = state.workspaceBlocks || [];
        this.cacheBlocks = state.cacheBlocks || [];
        this.currentBlockId = state.currentBlockId || 0;
        this.collapsedHeadings = new Set(state.collapsedHeadings || []);
        this.rebuildLinkedList('workspace');
        this.rebuildLinkedList('cache');
        this.renderBlocks();
        this.outlineManager.update();
        this.saveToLocalStorage();
        this.isRestoringHistory = false;
    }
    
    undo() {
        if (this.history.length < 2) return;
        const current = this.history.pop();
        this.redoStack.push(current);
        const prev = this.history[this.history.length - 1];
        this.applyState(prev);
    }
    
    redo() {
        if (this.redoStack.length === 0) return;
        const next = this.redoStack.pop();
        this.history.push(next);
        this.applyState(next);
    }
    
    getList(zone) {
        return zone === 'cache' ? this.cacheBlocks : this.workspaceBlocks;
    }
    
    setList(zone, list) {
        if (zone === 'cache') {
            this.cacheBlocks = list;
        } else {
            this.workspaceBlocks = list;
        }
    }
    
    rebuildLinkedList(zone) {
        const list = this.getList(zone);
        list.sort((a, b) => (a.index || (list.indexOf(a) + 1)) - (b.index || (list.indexOf(b) + 1)));
        let prevId = null;
        list.forEach((block, idx) => {
            block.index = idx + 1;
            block.prevId = prevId;
            block.nextId = null;
            if (prevId !== null) {
                const prevBlock = list[idx - 1];
                prevBlock.nextId = block.id;
            }
            prevId = block.id;
        });
    }
    
    removeBlockById(blockId) {
        let block = null;
        let zone = 'workspace';
        let list = this.workspaceBlocks;
        let index = list.findIndex(b => b.id === blockId);
        if (index !== -1) {
            block = list.splice(index, 1)[0];
        } else {
            list = this.cacheBlocks;
            index = list.findIndex(b => b.id === blockId);
            if (index !== -1) {
                block = list.splice(index, 1)[0];
                zone = 'cache';
            }
        }
        if (block) {
            this.rebuildLinkedList(zone);
        }
        return { block, zone };
    }
    
    insertBlockRelative(block, targetZone, targetBlockId, position) {
        const list = this.getList(targetZone);
        block.zone = targetZone;
        // If block already exists in list, remove to reinsert
        const existingIndex = list.findIndex(b => b.id === block.id);
        if (existingIndex !== -1) {
            list.splice(existingIndex, 1);
        }
        
        let targetBlock = list.find(b => b.id === targetBlockId);
        let tempIndex;
        if (targetBlock) {
            tempIndex = (targetBlock.index || list.indexOf(targetBlock) + 1) + (position === 'after' ? 0.5 : -0.5);
        } else {
            tempIndex = list.length + 1;
        }
        
        block.index = tempIndex;
        list.push(block);
        list.sort((a, b) => (a.index) - (b.index));
        console.debug('insertBlockRelative', { blockId: block.id, targetZone, targetBlockId, position, tempIndex, listOrder: list.map(b => ({ id: b.id, index: b.index })) });
        this.rebuildLinkedList(targetZone);
    }
    
    moveBlockToIndex(blockId, zone, targetIndex) {
        this.recordHistory();
        const { block } = this.removeBlockById(blockId);
        if (!block) {
            console.error('moveBlockToIndex: block not found', { blockId, zone, targetIndex });
            return;
        }
        block.zone = zone;
        const list = this.getList(zone);
        const clamped = Math.max(1, Math.min(targetIndex, list.length + 1));
        const targetBlock = list[clamped - 1] || null;
        const position = targetBlock ? 'before' : 'after';
        const targetId = targetBlock ? targetBlock.id : null;
        console.debug('moveBlockToIndex', { blockId, zone, requested: targetIndex, clamped, targetId, position });
        this.insertBlockRelative(block, zone, targetId, position);
    }
    
    addBlock(type, content = '', zone = 'workspace', position = -1) {
        this.recordHistory();
        const blockId = this.currentBlockId++;
        const block = {
            id: blockId,
            type: type,
            content: content,
            zone: zone,
            index: 0,
            prevId: null,
            nextId: null
        };
        
        if (zone === 'workspace') {
            if (position === -1) {
                block.index = this.workspaceBlocks.length + 1;
                this.workspaceBlocks.push(block);
            } else {
                const insertAt = Math.max(0, Math.min(position, this.workspaceBlocks.length));
                this.workspaceBlocks.splice(insertAt, 0, block);
            }
            this.rebuildLinkedList('workspace');
        } else {
            block.index = this.cacheBlocks.length + 1;
            this.cacheBlocks.push(block);
            this.rebuildLinkedList('cache');
        }
        
        this.renderBlocks();
        this.outlineManager.update();
        this.saveToLocalStorage();
    }
    
    moveBlock(blockId, direction) {
        const blocks = this.workspaceBlocks;
        const index = blocks.findIndex(b => b.id === blockId);
        if (index === -1) return;
        
        const targetPos = direction === 'up' ? index : index + 2;
        console.debug('moveBlock click', { blockId, direction, fromIndex: index + 1, targetPos });
        this.moveBlockToIndex(blockId, 'workspace', targetPos);
        this.renderBlocks();
        this.outlineManager.update();
        this.saveToLocalStorage();
        this.recordHistory();
    }
    
    moveBlockToCache(blockId) {
        this.dragDropManager.moveBlockToZone(blockId, 'cache');
    }
    
    restoreFromCache(blockId) {
        this.dragDropManager.moveBlockToZone(blockId, 'workspace');
    }
    
    permanentlyDeleteBlock(blockId) {
        this.recordHistory();
        let index = this.cacheBlocks.findIndex(b => b.id === blockId);
        if (index !== -1) {
            this.cacheBlocks.splice(index, 1);
            this.rebuildLinkedList('cache');
            this.renderBlocks();
            this.saveToLocalStorage();
        }
    }
    
    updateBlockContent(blockId, content) {
        let block = this.workspaceBlocks.find(b => b.id === blockId);
        if (!block) {
            block = this.cacheBlocks.find(b => b.id === blockId);
        }
        
        if (block) {
            block.content = content;
            this.outlineManager.update();
            this.saveToLocalStorage();
        }
    }
    
    renderBlocks() {
        this.rebuildLinkedList('workspace');
        this.rebuildLinkedList('cache');
        const workspaceContainer = document.getElementById('blocksContainer');
        const cacheContainer = document.getElementById('cacheContainer');
        
        workspaceContainer.innerHTML = '';
        cacheContainer.innerHTML = '';
        
        this.workspaceBlocks.forEach((block, index) => {
            const blockElement = this.blockFactory.createBlock(block, index, 'workspace');
            workspaceContainer.appendChild(blockElement);
        });
        
        this.cacheBlocks.forEach((block, index) => {
            const blockElement = this.blockFactory.createBlock(block, index, 'cache');
            cacheContainer.appendChild(blockElement);
        });
        this.updatePreviewUI();
    }
    
    closeAllEditModes() {
        document.querySelectorAll('.block[data-editing="true"]').forEach(blockElement => {
            if (blockElement.dataset.editMode === 'focus') return;
            const blockId = parseInt(blockElement.dataset.blockId);
            this.blockFactory.toggleEditMode(blockId);
        });
    }
    
    // Import/Export
    showImportModal() {
        document.getElementById('importTextarea').value = '';
        document.getElementById('importModal').classList.add('active');
    }
    
    showExportModal() {
        const markdown = MarkdownUtils.exportBlocks(this.workspaceBlocks);
        document.getElementById('exportTextarea').value = markdown;
        document.getElementById('exportModal').classList.add('active');
    }
    
    importMarkdown() {
        this.recordHistory();
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
        
        // Parse markdown into blocks
        const blocks = MarkdownUtils.parseImport(markdown);
        blocks.forEach(blockData => {
            this.addBlock(blockData.type, blockData.content, 'workspace');
        });
        
        this.rebuildLinkedList('workspace');
        this.renderBlocks();
        this.outlineManager.update();
        this.saveToLocalStorage();
        document.getElementById('importModal').classList.remove('active');
    }
    
    copyToClipboard() {
        const textarea = document.getElementById('exportTextarea');
        textarea.select();
        document.execCommand('copy');
        
        const btn = document.getElementById('copyBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }
    
    downloadMarkdown() {
        const markdown = MarkdownUtils.exportBlocks(this.workspaceBlocks);
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
        Storage.save('blockyMarkdownWorkspace', this.workspaceBlocks);
        Storage.save('blockyMarkdownCache', this.cacheBlocks);
        Storage.save('blockyMarkdownCurrentId', this.currentBlockId);
        Storage.save('blockyMarkdownCollapsedHeadings', Array.from(this.collapsedHeadings));
    }
    
    loadFromLocalStorage() {
        const savedWorkspace = Storage.load('blockyMarkdownWorkspace');
        const savedCache = Storage.load('blockyMarkdownCache');
        const savedId = Storage.load('blockyMarkdownCurrentId');
        const savedCollapsed = Storage.load('blockyMarkdownCollapsedHeadings');
        
        if (savedWorkspace) {
            this.workspaceBlocks = savedWorkspace;
            this.rebuildLinkedList('workspace');
        }
        
        if (savedCache) {
            this.cacheBlocks = savedCache;
            this.rebuildLinkedList('cache');
        }
        
        if (savedId) {
            this.currentBlockId = savedId;
        }
        
        if (savedCollapsed) {
            this.collapsedHeadings = new Set(savedCollapsed);
        }
        
        this.renderBlocks();
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.blockyMarkdown = new BlockyMarkdown();
});
