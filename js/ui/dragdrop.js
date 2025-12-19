// Drag and drop management
class DragDropManager {
    constructor(blockyMarkdown) {
        this.app = blockyMarkdown;
        this.draggedBlock = null;
        this.draggedOverBlock = null;
        this.draggedOverZone = null;
        this.draggedOverPosition = 'before';
        this.autoscrollThreshold = 60;
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
            document.querySelectorAll('.block').forEach(b => b.classList.remove('drag-over', 'drag-over-after', 'drag-over-before'));
        });
        
        blockElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (this.draggedBlock !== blockId) {
                this.draggedOverBlock = blockId;
                const rect = blockElement.getBoundingClientRect();
                this.draggedOverPosition = (e.clientY - rect.top) < rect.height / 2 ? 'before' : 'after';
                blockElement.classList.add('drag-over');
                blockElement.classList.toggle('drag-over-after', this.draggedOverPosition === 'after');
                blockElement.classList.toggle('drag-over-before', this.draggedOverPosition === 'before');
            }
        });
        
        blockElement.addEventListener('dragleave', () => {
            blockElement.classList.remove('drag-over', 'drag-over-after', 'drag-over-before');
        });
        
        blockElement.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            blockElement.classList.remove('drag-over', 'drag-over-after', 'drag-over-before');
            
            if (this.draggedBlock && this.draggedBlock !== blockId) {
                // Get the zone from the container
                const zone = blockElement.closest('[data-drop-zone]').dataset.dropZone;
                this.moveBlockToPosition(this.draggedBlock, blockId, zone, this.draggedOverPosition);
            }
        });
        
        // Auto-scroll on window edges
        document.addEventListener('dragover', (e) => {
            const { clientY } = e;
            const vh = window.innerHeight;
            if (clientY < this.autoscrollThreshold) {
                window.scrollBy(0, -20);
            } else if (clientY > vh - this.autoscrollThreshold) {
                window.scrollBy(0, 20);
            }
        });
    }
    
    moveBlockToZone(blockId, targetZone) {
        const { block } = this.app.removeBlockById(blockId);
        if (!block) return;
        block.zone = targetZone;
        this.app.insertBlockRelative(block, targetZone, null, 'after');
        this.app.renderBlocks();
        this.app.outlineManager.update();
        this.app.saveToLocalStorage();
    }
    
    moveBlockToPosition(draggedBlockId, targetBlockId, targetZone, position) {
        const { block } = this.app.removeBlockById(draggedBlockId);
        if (!block) {
            console.error('Block not found:', draggedBlockId);
            return;
        }
        block.zone = targetZone;
        this.app.insertBlockRelative(block, targetZone, targetBlockId, position || 'before');
        this.app.renderBlocks();
        this.app.outlineManager.update();
        this.app.saveToLocalStorage();
    }
}
