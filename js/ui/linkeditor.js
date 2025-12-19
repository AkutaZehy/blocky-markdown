// Link editor with existing link detection and editing
class LinkEditorManager {
    constructor(blockyMarkdown) {
        this.app = blockyMarkdown;
        this.currentEditingBlockId = null;
        this.currentContext = null;
        this.linkInfo = null;
    }

    setup () {
        document.getElementById('linkConfirm').addEventListener('click', () => this.confirm());
    }

    show (blockId, context) {
        this.currentEditingBlockId = blockId;
        this.currentContext = context;

        let textarea = null;
        let cursorPos = 0;

        if (context === 'cell') {
            // Table cell editor
            textarea = document.getElementById('cellContentEditor');
            cursorPos = textarea.selectionStart;
        } else {
            // Block textarea (paragraph or list)
            const blockElement = document.querySelector(`.blocks-container [data-block-id="${blockId}"], .cache-container [data-block-id="${blockId}"]`);
            textarea = blockElement?.querySelector('textarea');
            cursorPos = textarea ? textarea.selectionStart : 0;
        }

        if (!textarea) {
            console.error('No textarea found for link editing');
            return;
        }

        const text = textarea.value;
        const selectionStart = textarea.selectionStart;
        const selectionEnd = textarea.selectionEnd;

        // Check if cursor is within an existing link
        this.linkInfo = MarkdownUtils.extractLinkAtCursor(text, cursorPos);

        // Populate fields
        if (this.linkInfo.found) {
            // Editing existing link
            document.getElementById('linkText').value = this.linkInfo.text;
            document.getElementById('linkUrl').value = this.linkInfo.url;
            document.getElementById('linkTitle').value = this.linkInfo.title;
        } else {
            // Creating new link
            const selectedText = text.substring(selectionStart, selectionEnd);
            document.getElementById('linkText').value = selectedText;
            document.getElementById('linkUrl').value = '';
            document.getElementById('linkTitle').value = '';

            // Store selection info for new link insertion
            this.linkInfo = {
                found: false,
                start: selectionStart,
                end: selectionEnd
            };
        }

        document.getElementById('linkModal').classList.add('active');
    }

    confirm () {
        const text = document.getElementById('linkText').value;
        const url = document.getElementById('linkUrl').value;
        const title = document.getElementById('linkTitle').value;

        if (!text || !url) {
            alert('Please provide both link text and URL');
            return;
        }

        let linkMarkdown = `[${text}](${url}`;
        if (title) {
            linkMarkdown += ` "${title}"`;
        }
        linkMarkdown += ')';

        if (this.currentContext === 'cell') {
            this.insertIntoCell(linkMarkdown);
        } else {
            this.insertIntoBlock(linkMarkdown);
        }

        document.getElementById('linkModal').classList.remove('active');
        this.currentEditingBlockId = null;
        this.currentContext = null;
        this.linkInfo = null;
    }

    insertIntoCell (linkMarkdown) {
        const cellEditor = document.getElementById('cellContentEditor');
        const value = cellEditor.value;

        if (this.linkInfo.found) {
            // Replace existing link
            const newValue = value.substring(0, this.linkInfo.start) +
                linkMarkdown +
                value.substring(this.linkInfo.end);
            cellEditor.value = newValue;
        } else {
            // Insert new link
            const newValue = value.substring(0, this.linkInfo.start) +
                linkMarkdown +
                value.substring(this.linkInfo.end);
            cellEditor.value = newValue;
        }

        // Update the actual cell input
        if (this.app.tableEditor.selectedTableCell) {
            const input = this.app.tableEditor.selectedTableCell.querySelector('input');
            if (input) {
                input.value = cellEditor.value;
            }
        }
    }

    insertIntoBlock (linkMarkdown) {
        const block = this.app.workspaceBlocks.find(b => b.id === this.currentEditingBlockId) ||
            this.app.cacheBlocks.find(b => b.id === this.currentEditingBlockId);

        if (!block) {
            console.error('Block not found:', this.currentEditingBlockId);
            return;
        }

        const blockElement = document.querySelector(`.blocks-container [data-block-id="${this.currentEditingBlockId}"], .cache-container [data-block-id="${this.currentEditingBlockId}"]`);
        const textarea = blockElement?.querySelector('textarea');

        if (!textarea) {
            console.error('Textarea not found for block:', this.currentEditingBlockId);
            return;
        }

        const value = textarea.value;

        let newValue;
        if (this.linkInfo.found) {
            // Replace existing link
            newValue = value.substring(0, this.linkInfo.start) +
                linkMarkdown +
                value.substring(this.linkInfo.end);
        } else {
            // Insert new link at cursor/selection
            newValue = value.substring(0, this.linkInfo.start) +
                linkMarkdown +
                value.substring(this.linkInfo.end);
        }

        textarea.value = newValue;
        this.app.updateBlockContent(this.currentEditingBlockId, newValue);

        // Set cursor after inserted link
        const newCursorPos = this.linkInfo.start + linkMarkdown.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
    }
}
