// Outline management with hierarchy and collapse
class OutlineManager {
    constructor(blockyMarkdown) {
        this.app = blockyMarkdown;
    }
    
    update() {
        const outlineContent = document.getElementById('outlineContent');
        outlineContent.innerHTML = '';
        
        let headingStack = [];
        const visibleBlocks = new Set();
        
        this.app.workspaceBlocks.forEach((block, index) => {
            if (block.type === 'heading') {
                const match = block.content.match(/^(#{1,6})\s(.+)/);
                if (match) {
                    const level = match[1].length;
                    const text = match[2];
                    
                    // Update heading stack
                    while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
                        headingStack.pop();
                    }
                    
                    // Check if parent is collapsed
                    let isVisible = true;
                    for (const parent of headingStack) {
                        if (this.app.collapsedHeadings.has(parent.id)) {
                            isVisible = false;
                            break;
                        }
                    }
                    
                    if (isVisible) {
                        const item = this.createOutlineItem(block, level, text, index, true);
                        outlineContent.appendChild(item);
                        visibleBlocks.add(block.id);
                    }
                    
                    headingStack.push({ level, id: block.id });
                }
            } else {
                // Non-heading blocks
                const text = BlockRenderer.getBlockOutlineText(block);
                
                // Check if under a collapsed heading
                let isVisible = true;
                for (const parent of headingStack) {
                    if (this.app.collapsedHeadings.has(parent.id)) {
                        isVisible = false;
                        break;
                    }
                }
                
                if (isVisible) {
                    const level = headingStack.length > 0 ? headingStack[headingStack.length - 1].level + 1 : 0;
                    const item = this.createOutlineItem(block, level, text, index, false);
                    outlineContent.appendChild(item);
                    visibleBlocks.add(block.id);
                }
            }
        });
    }
    
    createOutlineItem(block, level, text, index, isHeading) {
        const item = document.createElement('div');
        item.className = 'outline-item';
        item.dataset.blockId = block.id;
        item.style.paddingLeft = (level * 20) + 'px';
        
        // Add toggle for headings
        if (isHeading) {
            const toggle = document.createElement('span');
            toggle.className = 'outline-item-toggle';
            toggle.textContent = this.app.collapsedHeadings.has(block.id) ? '▶' : '▼';
            toggle.onclick = (e) => {
                e.stopPropagation();
                this.toggleCollapse(block.id);
            };
            item.appendChild(toggle);
        } else {
            // Add spacer for non-headings
            const spacer = document.createElement('span');
            spacer.style.display = 'inline-block';
            spacer.style.width = '20px';
            item.appendChild(spacer);
        }
        
        const tag = document.createElement('span');
        tag.className = 'outline-item-tag';
        tag.textContent = BlockRenderer.getBlockTypeLabel(block.type);
        
        const textSpan = document.createElement('span');
        textSpan.className = 'outline-item-text';
        textSpan.textContent = text;
        
        item.appendChild(tag);
        item.appendChild(textSpan);
        
        item.onclick = () => {
            const blockElement = document.querySelector(`.blocks-container [data-block-id="${block.id}"], .cache-container [data-block-id="${block.id}"]`);
            if (blockElement) {
                blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                blockElement.style.boxShadow = '0 0 0 3px var(--primary-color)';
                setTimeout(() => {
                    blockElement.style.boxShadow = '';
                }, 1000);
            }
        };
        
        return item;
    }
    
    toggleCollapse(headingId) {
        if (this.app.collapsedHeadings.has(headingId)) {
            this.app.collapsedHeadings.delete(headingId);
        } else {
            this.app.collapsedHeadings.add(headingId);
        }
        this.update();
        this.app.saveToLocalStorage();
    }
}
