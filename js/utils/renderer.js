// Block rendering utility
class BlockRenderer {
    static getBlockTypeLabel (type) {
        const labels = {
            'frontmatter': '[frontmatter]',
            'paragraph': '[p]',
            'heading': '[h]',
            'list': '[list]',
            'code': '[code]',
            'table': '[table]',
            'quote': '[quote]',
            'hr': '[hr]',
            'br': '[br]',
            'html': '[html]',
            'mermaid': '[mermaid]'
        };
        return labels[type] || `[${type}]`;
    }

    static getBlockOutlineText (block) {
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

    static createPreviewElement (block) {
        const div = document.createElement('div');
        div.className = 'block-preview';
        div.style.padding = '10px';
        div.style.background = 'var(--bg-secondary)';
        div.style.borderRadius = '4px';
        div.style.border = '1px solid var(--border-color)';
        div.style.cursor = 'pointer';
        div.style.minHeight = '40px';

        if (block.content) {
            // Show preview based on type
            if (block.type === 'hr') {
                div.innerHTML = '<hr style="border: 1px solid var(--border-color);">';
            } else if (block.type === 'br') {
                div.innerHTML = '<p style="color: var(--secondary-color); font-size: 0.85rem;">Line break</p>';
            } else if (block.type === 'table') {
                div.innerHTML = '<p style="color: var(--secondary-color);">Table (click Edit to modify)</p>';
            } else {
                const preview = block.content.substring(0, 100);
                div.textContent = preview + (block.content.length > 100 ? '...' : '');
            }
        } else {
            div.innerHTML = '<p style="color: var(--secondary-color); font-style: italic;">Click Edit to add content</p>';
        }

        return div;
    }
}
