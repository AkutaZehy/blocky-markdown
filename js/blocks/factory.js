// Block factory for creating block elements with edit/preview modes
import { BlockRenderer } from "../utils/renderer.js";

export class BlockFactory {
    constructor(blockyMarkdown) {
        this.app = blockyMarkdown;
    }

    createBlock (block, index, zone) {
        const div = document.createElement('div');
        div.className = 'block';
        div.dataset.blockId = block.id;
        div.dataset.editing = 'false';
        div.dataset.editMode = '';
        div.dataset.zone = zone;
        // Resolve the block at event time: undo/redo and import replace the
        // block objects while the element itself is reused across renders.
        div.addEventListener('mouseenter', () => {
            const current = this.app.getBlockById(block.id);
            if (this.app.setTip && current) {
                this.app.setTip(`Current block: #${current.index} [${current.type}]`);
            }
        });
        div.addEventListener('mouseleave', () => {
            if (this.app.setTip) {
                this.app.setTip(this.app.defaultTip);
            }
        });

        // Block header
        const header = this.createBlockHeader(block, index, zone);
        div.appendChild(header);
        div._headerSig = this.headerSignature(block, index, zone);

        // Block content (preview by default)
        const content = document.createElement('div');
        content.className = 'block-content';
        content.addEventListener('click', (e) => {
            const current = this.app.getBlockById(block.id);
            if (!current || current.type === 'hr' || current.type === 'br') return;
            if (div.dataset.editMode === 'focus') return;
            if (div.dataset.editing === 'false') {
                this.toggleEditMode(block.id, 'inline');
            }
            e.stopPropagation();
        });
        content.appendChild(this.createPreviewContent(block));
        div._previewSig = this.previewSignature(block);

        div.appendChild(content);

        // Setup drag only in preview mode
        this.app.dragDropManager.setupBlockDrag(div, block.id);

        return div;
    }

    headerSignature (block, index, zone) {
        const len =
            zone === 'workspace'
                ? this.app.workspaceBlocks.length
                : this.app.cacheBlocks.length;
        return `${zone}|${index}|${len}|${block.type}`;
    }

    previewSignature (block) {
        return `${block.type} ${block.content}`;
    }

    // Minimal-diff refresh for a reused block element: rebuild the header
    // only when position/zone/type changed, and the preview only when the
    // content actually changed. Never touches the DOM while the block is
    // being edited inline — the textarea owns focus there.
    refreshBlock (el, block, index, zone) {
        const headerSig = this.headerSignature(block, index, zone);
        if (el._headerSig !== headerSig) {
            const header = el.querySelector('.block-header');
            if (header) {
                el.replaceChild(this.createBlockHeader(block, index, zone), header);
            }
            el._headerSig = headerSig;
        }
        el.dataset.zone = zone;

        if (el.dataset.editing === 'true') return;
        const previewSig = this.previewSignature(block);
        if (el._previewSig !== previewSig) {
            const contentDiv = el.querySelector('.block-content');
            if (contentDiv) {
                contentDiv.innerHTML = '';
                contentDiv.appendChild(this.createPreviewContent(block));
            }
            el._previewSig = previewSig;
        }
    }

    // Undo/redo and import replace the block objects wholesale, which would
    // leave any open inline editor holding stale text. Force every editing
    // element back to a preview of its current block before the next render.
    forcePreviewAll () {
        for (const el of this.app.blockElements.values()) {
            if (el.dataset.editing !== 'true') continue;
            const block = this.app.getBlockById(parseInt(el.dataset.blockId, 10));
            el.dataset.editing = 'false';
            el.dataset.editMode = '';
            el.draggable = true;
            const contentDiv = el.querySelector('.block-content');
            if (contentDiv && block) {
                contentDiv.innerHTML = '';
                contentDiv.appendChild(this.createPreviewContent(block));
                el._previewSig = this.previewSignature(block);
            }
        }
    }

    createBlockHeader (block, index, zone) {
        const header = document.createElement('div');
        header.className = 'block-header';

        const meta = document.createElement('div');
        meta.className = 'block-meta';

        const indexLabel = document.createElement('span');
        indexLabel.className = 'block-index';
        indexLabel.textContent = `#${block.index || index + 1}`;
        indexLabel.title = 'Set index (integer)';
        indexLabel.onclick = (e) => {
            e.stopPropagation();
            const current = block.index || index + 1;
            const value = prompt('Set index (integer)', current.toString());
            if (value === null) return;
            const num = parseInt(value, 10);
            if (!isNaN(num)) {
                this.app.moveBlockToIndex(block.id, zone, num);
                this.app.renderBlocks();
                this.app.outlineManager.update();
                this.app.saveToLocalStorage();
            }
        };
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

    createPreviewContent (block) {
        const el = BlockRenderer.createPreviewElement(block);
        if (block.type === 'mermaid') {
            this.app.renderMermaidPreview(el);
        }
        return el;
    }

    createEditContent (block) {
        const container = document.createElement('div');
        container.className = 'block-edit';

        switch (block.type) {
            case 'frontmatter':
                const fmTextarea = this.createTextarea(block, '---\ntitle: My Post\ndate: 2024-01-01\n---');
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

                const hTextarea = this.createTextarea(block, 'Heading text...');

                // Rewrite the "## " prefix only when it has drifted (level
                // changed, hashes deleted). Assigning .value on every input
                // would fling the caret to the end of the textarea, so when a
                // rewrite is needed the caret is restored at the same offset
                // within the heading body.
                const syncHeadingPrefix = () => {
                    if (hTextarea.value === '') return '';
                    const prefix = '#'.repeat(Number(select.value)) + ' ';
                    const body = hTextarea.value.replace(/^#{1,6}\s?/, '');
                    const next = prefix + body;
                    if (next !== hTextarea.value) {
                        const pos = hTextarea.selectionStart;
                        const bodyOffset = Math.max(
                            0,
                            pos - (hTextarea.value.length - body.length)
                        );
                        hTextarea.value = next;
                        const newPos = Math.min(next.length, prefix.length + bodyOffset);
                        hTextarea.setSelectionRange(newPos, newPos);
                    }
                    return next;
                };

                select.onchange = () => {
                    const value = syncHeadingPrefix();
                    this.app.updateBlockContent(block.id, value);
                };

                hTextarea.oninput = () => {
                    const value = syncHeadingPrefix();
                    this.app.updateBlockContent(block.id, value);
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

    createTextarea (block, placeholder) {
        const textarea = document.createElement('textarea');
        textarea.value = block.content || '';
        textarea.placeholder = placeholder;
        textarea.oninput = (e) => {
            this.app.updateBlockContent(block.id, e.target.value);
        };
        return textarea;
    }

    createDoneButton (blockId) {
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

    toggleEditMode (blockId, mode = 'inline') {
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
            blockElement._previewSig = this.previewSignature(block);
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
