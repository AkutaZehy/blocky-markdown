// Drag and drop management
class DragDropManager {
    constructor(blockyMarkdown) {
        this.app = blockyMarkdown;
        this.draggedBlock = null;
        this.draggedOverBlock = null;
        this.draggedOverZone = null;
    }
    
    setup() {
        const workspaceContainer = document.getElementById('blocksContainer');
        const cacheContainer = document.getElementById('cacheContainer');
        
        // Container drop zones
        [workspaceContainer, cacheContainer].forEach(container => {
            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                container.classList.add('drag-over');
                this.draggedOverZone = container.dataset.dropZone;
            });
            
            container.addEventListener('dragleave', (e) => {
                if (e.target === container) {
                    container.classList.remove('drag-over');
                }
            });
            
            container.addEventListener('drop', (e) => {
                e.preventDefault();
                container.classList.remove('drag-over');
                
                if (this.draggedBlock !== null) {
                    const targetZone = container.dataset.dropZone;
                    
                    // If dropping over a specific block, insert at that position
                    if (this.draggedOverBlock !== null) {
                        this.moveBlockToPosition(this.draggedBlock, this.draggedOverBlock, targetZone);
                    } else {
                        // Otherwise append to end of target zone
                        this.moveBlockToZone(this.draggedBlock, targetZone);
                    }
                    
                    this.draggedBlock = null;
                    this.draggedOverBlock = null;
                    this.draggedOverZone = null;
                }
            });
        });
    }
    
    setupBlockDrag(blockElement, blockId) {
        blockElement.draggable = true;
        
        blockElement.addEventListener('dragstart', (e) => {
            this.draggedBlock = blockId;
            blockElement.classList.add('dragging');
        });
        
        blockElement.addEventListener('dragend', () => {
            this.draggedBlock = null;
            this.draggedOverBlock = null;
            this.draggedOverZone = null;
            blockElement.classList.remove('dragging');
            document.querySelectorAll('.block').forEach(b => b.classList.remove('drag-over'));
        });
        
        blockElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (this.draggedBlock !== blockId) {
                this.draggedOverBlock = blockId;
                blockElement.classList.add('drag-over');
            }
        });
        
        blockElement.addEventListener('dragleave', () => {
            blockElement.classList.remove('drag-over');
        });
        
        blockElement.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            blockElement.classList.remove('drag-over');
            
            if (this.draggedBlock && this.draggedBlock !== blockId) {
                // Get the zone from the container
                const zone = blockElement.closest('[data-drop-zone]').dataset.dropZone;
                this.moveBlockToPosition(this.draggedBlock, blockId, zone);
            }
        });
    }
    
    moveBlockToZone(blockId, targetZone) {
        let block = null;
        
        // Find and remove the block
        let index = this.app.workspaceBlocks.findIndex(b => b.id === blockId);
        if (index !== -1) {
            block = this.app.workspaceBlocks.splice(index, 1)[0];
        } else {
            index = this.app.cacheBlocks.findIndex(b => b.id === blockId);
            if (index !== -1) {
                block = this.app.cacheBlocks.splice(index, 1)[0];
            }
        }
        
        if (block) {
            block.zone = targetZone;
            if (targetZone === 'workspace') {
                this.app.workspaceBlocks.push(block);
            } else {
                this.app.cacheBlocks.push(block);
            }
            
            this.app.renderBlocks();
            this.app.outlineManager.update();
            this.app.saveToLocalStorage();
        }
    }
    
    moveBlockToPosition(draggedBlockId, targetBlockId, targetZone) {
        // Find and remove dragged block
        let block = null;
        let index = this.app.workspaceBlocks.findIndex(b => b.id === draggedBlockId);
        if (index !== -1) {
            block = this.app.workspaceBlocks.splice(index, 1)[0];
        } else {
            index = this.app.cacheBlocks.findIndex(b => b.id === draggedBlockId);
            if (index !== -1) {
                block = this.app.cacheBlocks.splice(index, 1)[0];
            }
        }
        
        if (!block) {
            console.error('Block not found:', draggedBlockId);
            return;
        }
        
        block.zone = targetZone;
        
        // Find target position
        const targetBlocks = targetZone === 'workspace' ? this.app.workspaceBlocks : this.app.cacheBlocks;
        const targetIndex = targetBlocks.findIndex(b => b.id === targetBlockId);
        
        if (targetIndex !== -1) {
            // Insert before the target block
            targetBlocks.splice(targetIndex, 0, block);
        } else {
            // If target not found, append to end
            targetBlocks.push(block);
        }
        
        this.app.renderBlocks();
        this.app.outlineManager.update();
        this.app.saveToLocalStorage();
    }
}
