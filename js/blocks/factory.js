// Block factory for creating block elements with edit/preview modes
class BlockFactory {
    constructor(blockyMarkdown) {
        this.app = blockyMarkdown;
    }
    
    createBlock(block, index, zone) {
        const div = document.createElement('div');
        div.className = 'block';
        div.dataset.blockId = block.id;
        div.dataset.editing = 'false';
        div.dataset.editMode = '';
        
        // Block header
        const header = this.createBlockHeader(block, index, zone);
        div.appendChild(header);
        
        // Block content (preview by default)
        const content = document.createElement('div');
        content.className = 'block-content';
        content.addEventListener('click', (e) => {
            if (block.type === 'hr' || block.type === 'br') return;
            if (div.dataset.editMode === 'focus') return;
            if (div.dataset.editing === 'false') {
                this.toggleEditMode(block.id, 'inline');
            }
            e.stopPropagation();
        });
        
        if (block.type === 'hr' || block.type === 'br') {
            // These blocks don't need edit mode
            content.appendChild(this.createPreviewContent(block));
        } else {
            // Start in preview mode
            content.appendChild(this.createPreviewContent(block));
        }
        
        div.appendChild(content);
        
        // Setup drag only in preview mode
        this.app.dragDropManager.setupBlockDrag(div, block.id);
        
        return div;
    }
    
    createBlockHeader(block, index, zone) {
        const header = document.createElement('div');
        header.className = 'block-header';
        
        const meta = document.createElement('div');
        meta.className = 'block-meta';
        
        const indexLabel = document.createElement('span');
        indexLabel.className = 'block-index';
        indexLabel.textContent = `#${block.index || index + 1}`;
        meta.appendChild(indexLabel);
        
        const typeLabel = document.createElement('span');
        typeLabel.className = 'block-type';
        typeLabel.textContent = BlockRenderer.getBlockTypeLabel(block.type);
        meta.appendChild(typeLabel);
        
        const controls = document.createElement('div');
        controls.className = 'block-controls';
        
        // Add edit button for editable blocks
        if (block.type !== 'hr' && block.type !== 'br') {
            const editBtn = document.createElement('button');
            editBtn.className = 'block-btn';
            editBtn.textContent = 'Edit';
            editBtn.onclick = (e) => {
                e.stopPropagation();
                if (block.type === 'table') {
                    this.app.tableEditor.edit(block.id);
                } else {
                    this.toggleEditMode(block.id, 'focus');
                }
            };
            controls.appendChild(editBtn);
        }
        
        if (zone === 'workspace') {
            const toTopBtn = document.createElement('button');
            toTopBtn.className = 'block-btn';
            toTopBtn.textContent = '⤒';
            toTopBtn.title = 'Move to top';
            toTopBtn.onclick = (e) => {
                e.stopPropagation();
                this.app.moveBlockToIndex(block.id, 'workspace', 1);
                this.app.renderBlocks();
                this.app.outlineManager.update();
                this.app.saveToLocalStorage();
            };
            controls.appendChild(toTopBtn);
            
            if (index > 0) {
                const upBtn = document.createElement('button');
                upBtn.className = 'block-btn';
                upBtn.textContent = '▲';
                upBtn.title = 'Move up';
                upBtn.onclick = () => this.app.moveBlock(block.id, 'up');
                controls.appendChild(upBtn);
            }
            
            if (index < this.app.workspaceBlocks.length - 1) {
                const downBtn = document.createElement('button');
                downBtn.className = 'block-btn';
                downBtn.textContent = '▼';
                downBtn.title = 'Move down';
                downBtn.onclick = () => this.app.moveBlock(block.id, 'down');
                controls.appendChild(downBtn);
            }
            
            const toBottomBtn = document.createElement('button');
            toBottomBtn.className = 'block-btn';
            toBottomBtn.textContent = '⤓';
            toBottomBtn.title = 'Move to bottom';
            toBottomBtn.onclick = (e) => {
                e.stopPropagation();
                this.app.moveBlockToIndex(block.id, 'workspace', this.app.workspaceBlocks.length);
                this.app.renderBlocks();
                this.app.outlineManager.update();
                this.app.saveToLocalStorage();
            };
            controls.appendChild(toBottomBtn);
            
            const cacheBtn = document.createElement('button');
            cacheBtn.className = 'block-btn';
            cacheBtn.textContent = 'Cache';
            cacheBtn.onclick = () => this.app.moveBlockToCache(block.id);
            controls.appendChild(cacheBtn);
            
            const indexBtn = document.createElement('button');
            indexBtn.className = 'block-btn';
            indexBtn.textContent = `Index #${block.index || index + 1}`;
            indexBtn.title = 'Set index (integer)';
            indexBtn.onclick = (e) => {
                e.stopPropagation();
                const value = prompt('Set index (integer)', (block.index || index + 1).toString());
                if (value === null) return;
                const num = parseInt(value, 10);
                if (!isNaN(num)) {
                    console.debug('index prompt confirm', { blockId: block.id, fromIndex: block.index || index + 1, toIndex: num });
                    this.app.moveBlockToIndex(block.id, 'workspace', num);
                    this.app.renderBlocks();
                    this.app.outlineManager.update();
                    this.app.saveToLocalStorage();
                }
            };
            controls.appendChild(indexBtn);
        } else {
            // Cache zone
            const restoreEndBtn = document.createElement('button');
            restoreEndBtn.className = 'block-btn';
            restoreEndBtn.textContent = 'To WS';
            restoreEndBtn.title = 'Move to workspace end';
            restoreEndBtn.onclick = (e) => {
                e.stopPropagation();
                this.app.dragDropManager.moveBlockToZone(block.id, 'workspace');
            };
            controls.appendChild(restoreEndBtn);
            const restoreBtn = document.createElement('button');
            restoreBtn.className = 'block-btn';
            restoreBtn.textContent = 'Restore';
            restoreBtn.onclick = () => this.app.restoreFromCache(block.id);
            controls.appendChild(restoreBtn);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'block-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => this.app.permanentlyDeleteBlock(block.id);
            controls.appendChild(deleteBtn);
        }
        
        header.appendChild(meta);
        header.appendChild(controls);
        
        return header;
    }
    
    createPreviewContent(block) {
        return BlockRenderer.createPreviewElement(block);
    }
    
    createEditContent(block) {
        const container = document.createElement('div');
        container.className = 'block-edit';
        
        switch (block.type) {
            case 'frontmatter':
                const fmTextarea = this.createTextarea(block, '---\ntitle: My Post\ndate: 2024-01-01\n---');
                fmTextarea.style.fontFamily = "'SF Mono', 'Monaco', 'Consolas', monospace";
                container.appendChild(fmTextarea);
                container.appendChild(this.createDoneButton(block.id));
                return container;
                
            case 'paragraph':
                const pTextarea = this.createTextarea(block, 'Write your paragraph here...');
                container.appendChild(pTextarea);
                
                // Add link insertion button
                const linkBtn = document.createElement('button');
                linkBtn.className = 'block-link-btn';
                linkBtn.textContent = 'Insert Link';
                linkBtn.onclick = () => {
                    this.app.linkEditor.show(block.id, 'block');
                };
                container.appendChild(linkBtn);
                container.appendChild(this.createDoneButton(block.id));
                return container;
                
            case 'heading':
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
                    const textarea = container.querySelector('textarea');
                    const text = textarea.value.replace(/^#{1,6}\s/, '');
                    textarea.value = '#'.repeat(select.value) + ' ' + text;
                    this.app.updateBlockContent(block.id, textarea.value);
                };
                
                const hTextarea = this.createTextarea(block, 'Heading text...');
                hTextarea.oninput = (e) => {
                    const level = select.value;
                    const text = e.target.value.replace(/^#{1,6}\s/, '');
                    e.target.value = '#'.repeat(level) + ' ' + text;
                    this.app.updateBlockContent(block.id, e.target.value);
                };
                
                container.appendChild(select);
                container.appendChild(hTextarea);
                container.appendChild(this.createDoneButton(block.id));
                return container;
                
            case 'list':
                const lTextarea = this.createTextarea(block, '- Item 1\n- Item 2\n- Item 3');
                container.appendChild(lTextarea);
                
                const listLinkBtn = document.createElement('button');
                listLinkBtn.className = 'block-link-btn';
                listLinkBtn.textContent = 'Insert Link';
                listLinkBtn.onclick = () => {
                    this.app.linkEditor.show(block.id, 'block');
                };
                container.appendChild(listLinkBtn);
                container.appendChild(this.createDoneButton(block.id));
                return container;
                
            case 'code':
                const langInput = document.createElement('input');
                langInput.type = 'text';
                langInput.placeholder = 'Language (e.g., javascript)';
                langInput.style.marginBottom = '10px';
                
                const codeMatch = block.content.match(/^```(\w+)?/);
                if (codeMatch) {
                    langInput.value = codeMatch[1] || '';
                }
                
                langInput.oninput = () => {
                    const codeTextarea = container.querySelector('textarea');
                    const code = codeTextarea.value.replace(/^```\w*\n/, '').replace(/\n```$/, '');
                    const lang = langInput.value;
                    codeTextarea.value = '```' + lang + '\n' + code + '\n```';
                    this.app.updateBlockContent(block.id, codeTextarea.value);
                };
                
                const codeTextarea = this.createTextarea(block, 'Your code here...');
                codeTextarea.style.fontFamily = "'SF Mono', 'Monaco', 'Consolas', monospace";
                codeTextarea.oninput = (e) => {
                    this.app.updateBlockContent(block.id, e.target.value);
                };
                
                container.appendChild(langInput);
                container.appendChild(codeTextarea);
                container.appendChild(this.createDoneButton(block.id));
                return container;
                
            case 'quote':
                const qTextarea = this.createTextarea(block, '> Your quote here...');
                container.appendChild(qTextarea);
                container.appendChild(this.createDoneButton(block.id));
                return container;
                
            case 'html':
                const htmlTextarea = this.createTextarea(block, '<div>\n  <!-- Your HTML here -->\n</div>');
                container.appendChild(htmlTextarea);
                container.appendChild(this.createDoneButton(block.id));
                return container;
                
            case 'mermaid':
                const mermaidTextarea = this.createTextarea(block, '```mermaid\ngraph TD;\n  A-->B;\n  A-->C;\n  B-->D;\n  C-->D;\n```');
                mermaidTextarea.style.fontFamily = "'SF Mono', 'Monaco', 'Consolas', monospace";
                container.appendChild(mermaidTextarea);
                container.appendChild(this.createDoneButton(block.id));
                return container;
                
            default:
                const textarea = this.createTextarea(block, 'Content...');
                container.appendChild(textarea);
                container.appendChild(this.createDoneButton(block.id));
                return container;
        }
    }
    
    createTextarea(block, placeholder) {
        const textarea = document.createElement('textarea');
        textarea.value = block.content || '';
        textarea.placeholder = placeholder;
        textarea.oninput = (e) => {
            this.app.updateBlockContent(block.id, e.target.value);
        };
        return textarea;
    }
    
    createDoneButton(blockId) {
        const btn = document.createElement('button');
        btn.className = 'block-done-btn';
        btn.textContent = 'Done';
        btn.onclick = (e) => {
            e.stopPropagation();
            const el = document.querySelector(`.blocks-container [data-block-id="${blockId}"], .cache-container [data-block-id="${blockId}"]`);
            const mode = el?.dataset.editMode || 'inline';
            this.toggleEditMode(blockId, mode);
        };
        return btn;
    }
    
    toggleEditMode(blockId, mode = 'inline') {
        const blockElement = document.querySelector(`.blocks-container [data-block-id="${blockId}"], .cache-container [data-block-id="${blockId}"]`);
        if (!blockElement) {
            console.error('Block element not found:', blockId);
            return;
        }
        
        const isEditing = blockElement.dataset.editing === 'true';
        const block = this.app.workspaceBlocks.find(b => b.id === blockId) ||
                     this.app.cacheBlocks.find(b => b.id === blockId);
        
        if (!block) {
            console.error('Block data not found:', blockId);
            return;
        }
        
        const contentDiv = blockElement.querySelector('.block-content');
        if (!contentDiv) {
            console.error('Content div not found');
            return;
        }
        
        contentDiv.innerHTML = '';
        
        if (isEditing) {
            // Switch to preview
            blockElement.dataset.editing = 'false';
            blockElement.dataset.editMode = '';
            blockElement.draggable = true;
            contentDiv.appendChild(this.createPreviewContent(block));
        } else {
            // Switch to edit
            blockElement.dataset.editing = 'true';
            blockElement.dataset.editMode = mode;
            blockElement.draggable = false;
            contentDiv.appendChild(this.createEditContent(block));
            
            // Focus on textarea
            const textarea = contentDiv.querySelector('textarea');
            if (textarea) {
                textarea.focus();
            }
        }
    }
}
