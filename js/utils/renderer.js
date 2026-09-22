// Block rendering utility
export class BlockRenderer {
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

    // Renders markdown through marked + DOMPurify, the same pipeline as the
    // global preview. Returns null when either library is missing so callers
    // can fall back to plain text instead of injecting unsanitized HTML.
    static renderSanitized (markdown) {
        if (
            typeof window === 'undefined' ||
            typeof window.marked === 'undefined' ||
            typeof window.DOMPurify === 'undefined'
        ) {
            return null;
        }
        return window.DOMPurify.sanitize(window.marked.parse(markdown));
    }

    static createPreviewElement (block) {
        const div = document.createElement('div');
        div.className = 'block-preview';

        const hint = (text) => {
            const p = document.createElement('p');
            p.className = 'block-preview-hint';
            p.textContent = text;
            div.appendChild(p);
            return div;
        };

        if (block.type === 'br') {
            return hint('Line break');
        }

        if (!block.content) {
            return hint('Click Edit to add content');
        }

        if (block.type === 'frontmatter') {
            // YAML frontmatter reads best as source, not rendered markdown
            const pre = document.createElement('pre');
            pre.textContent = block.content;
            div.appendChild(pre);
            return div;
        }

        const html = BlockRenderer.renderSanitized(block.content);
        if (html !== null) {
            div.innerHTML = html;
        } else {
            // No marked/DOMPurify: show truncated text, never raw HTML
            const preview = block.content.substring(0, 100);
            div.textContent = preview + (block.content.length > 100 ? '...' : '');
        }

        return div;
    }
}
