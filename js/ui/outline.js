// Outline management with hierarchy and collapse
class OutlineManager {
    constructor(blockyMarkdown) {
        this.app = blockyMarkdown;
    }

    update () {
        const outlineContent = document.getElementById('outlineContent');
        outlineContent.innerHTML = '';
        const totalCount = this.app.workspaceBlocks.length;
        const countDiv = document.createElement('div');
        countDiv.className = 'outline-count';
        countDiv.textContent = `Workspace blocks: ${totalCount}`;
        outlineContent.appendChild(countDiv);

        // Collect heading info
        const headings = [];
        this.app.workspaceBlocks.forEach((block, index) => {
            if (block.type !== 'heading') return;
            const match = block.content.match(/^(#{1,6})\s(.+)/);
            if (match) {
                headings.push({
                    block,
                    level: match[1].length,
                    text: match[2],
                    index
                });
            }
        });

        // Determine if a heading has child (deeper level before same/less)
        headings.forEach((h, i) => {
            let hasChild = false;
            for (let j = i + 1; j < headings.length; j++) {
                if (headings[j].level > h.level) {
                    hasChild = true;
                    break;
                }
                if (headings[j].level <= h.level) break;
            }
            h.hasChild = hasChild;
        });

        const headingStack = [];
        headings.forEach((h) => {
            const { block, level, text, index, hasChild } = h;

            while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
                headingStack.pop();
            }

            let isVisible = true;
            for (const parent of headingStack) {
                if (this.app.collapsedHeadings.has(parent.id)) {
                    isVisible = false;
                    break;
                }
            }

            if (isVisible) {
                const item = this.createOutlineItem(block, level, text, index, true, hasChild);
                outlineContent.appendChild(item);
            }

            headingStack.push({ level, id: block.id });
        });
    }

    createOutlineItem (block, level, text, index, isHeading, hasChild = false) {
        const item = document.createElement('div');
        item.className = 'outline-item';
        item.dataset.blockId = block.id;
        item.style.paddingLeft = '0px';
        item.dataset.level = level;
        const blockIndex = block.index || (index + 1);
        item.title = `[h${level}] #${blockIndex} ${text}`;

        // Add toggle for headings only if they have children
        if (isHeading && hasChild) {
            const toggle = document.createElement('span');
            toggle.className = 'outline-item-toggle';
            toggle.textContent = this.app.collapsedHeadings.has(block.id) ? '▶' : '▼';
            toggle.classList.add(`toggle-level-${level}`);
            item.appendChild(toggle);
        } else {
            const spacer = document.createElement('span');
            spacer.style.display = 'inline-block';
            spacer.style.width = '16px';
            item.appendChild(spacer);
        }

        const tag = document.createElement('span');
        tag.className = 'outline-item-tag';
        tag.textContent = `[h${level}]`;

        const levelSpan = document.createElement('span');
        levelSpan.className = 'outline-heading-level';
        levelSpan.textContent = '';

        const textSpan = document.createElement('span');
        textSpan.className = 'outline-item-text';
        textSpan.textContent = text;

        const indexSpan = document.createElement('span');
        indexSpan.className = 'outline-item-index';
        indexSpan.textContent = `#${blockIndex}`;

        item.appendChild(indexSpan);
        item.appendChild(tag);
        if (isHeading) {
            item.appendChild(levelSpan);
            item.appendChild(textSpan);
        }

        item.addEventListener('mouseenter', () => {
            if (this.app.setTip) this.app.setTip(item.title);
        });
        item.addEventListener('mouseleave', () => {
            if (this.app.setTip) this.app.setTip(this.app.defaultTip);
        });

        item.onclick = () => {
            if (isHeading && hasChild) {
                this.toggleCollapse(block.id);
                const toggleEl = item.querySelector('.outline-item-toggle');
                if (toggleEl) {
                    toggleEl.textContent = this.app.collapsedHeadings.has(block.id) ? '▶' : '▼';
                }
            }
            const blockElement = document.querySelector(`.blocks-container [data-block-id="${block.id}"], .cache-container [data-block-id="${block.id}"]`);
            if (blockElement) {
                blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                blockElement.style.boxShadow = '0 0 0 3px var(--primary-color)';
                setTimeout(() => {
                    blockElement.style.boxShadow = '';
                }, 1000);
            }
            if (this.app.setTip) {
                this.app.setTip(item.title);
            }
        };

        return item;
    }

    toggleCollapse (headingId) {
        if (this.app.collapsedHeadings.has(headingId)) {
            this.app.collapsedHeadings.delete(headingId);
        } else {
            this.app.collapsedHeadings.add(headingId);
        }
        this.update();
        this.app.saveToLocalStorage();
    }
}
