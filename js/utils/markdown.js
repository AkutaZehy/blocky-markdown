// Markdown utility functions
class MarkdownUtils {
    static parseImport (markdown) {
        const blocks = [];

        // Parse frontmatter first
        const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n/);
        if (frontmatterMatch) {
            blocks.push({ type: 'frontmatter', content: frontmatterMatch[0].trim() });
            markdown = markdown.substring(frontmatterMatch[0].length);
        }

        const lines = markdown.split('\n');
        let currentBlock = null;
        let inCodeBlock = false;
        let codeBlockContent = '';
        let inMermaidBlock = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Code blocks
            if (line.startsWith('```')) {
                if (!inCodeBlock && !inMermaidBlock) {
                    inCodeBlock = true;
                    codeBlockContent = line;
                    if (line.includes('mermaid')) {
                        inMermaidBlock = true;
                        inCodeBlock = false;
                    }
                } else {
                    codeBlockContent += '\n' + line;
                    if (inMermaidBlock) {
                        blocks.push({ type: 'mermaid', content: codeBlockContent });
                        inMermaidBlock = false;
                    } else {
                        blocks.push({ type: 'code', content: codeBlockContent });
                        inCodeBlock = false;
                    }
                    codeBlockContent = '';
                }
                continue;
            }

            if (inCodeBlock || inMermaidBlock) {
                codeBlockContent += '\n' + line;
                continue;
            }

            // Horizontal rules
            if (line.match(/^[-*_]{3,}$/)) {
                blocks.push({ type: 'hr', content: '---' });
                continue;
            }

            // Headings
            if (line.match(/^#{1,6}\s/)) {
                blocks.push({ type: 'heading', content: line });
                continue;
            }

            // Tables
            if (line.trim().startsWith('|')) {
                if (!currentBlock || currentBlock.type !== 'table') {
                    currentBlock = { type: 'table', content: '' };
                }
                currentBlock.content += line + '\n';
                continue;
            } else if (currentBlock && currentBlock.type === 'table') {
                blocks.push({ type: 'table', content: currentBlock.content.trim() });
                currentBlock = null;
            }

            // Lists
            if (line.match(/^[\s]*[-*+]\s/) || line.match(/^[\s]*\d+\.\s/)) {
                if (!currentBlock || currentBlock.type !== 'list') {
                    currentBlock = { type: 'list', content: '' };
                }
                currentBlock.content += line + '\n';
                continue;
            } else if (currentBlock && currentBlock.type === 'list') {
                blocks.push({ type: 'list', content: currentBlock.content.trim() });
                currentBlock = null;
            }

            // Quotes
            if (line.startsWith('>')) {
                if (!currentBlock || currentBlock.type !== 'quote') {
                    currentBlock = { type: 'quote', content: '' };
                }
                currentBlock.content += line + '\n';
                continue;
            } else if (currentBlock && currentBlock.type === 'quote') {
                blocks.push({ type: 'quote', content: currentBlock.content.trim() });
                currentBlock = null;
            }

            // HTML blocks
            if (line.match(/^<[a-z]+/i)) {
                if (!currentBlock || currentBlock.type !== 'html') {
                    currentBlock = { type: 'html', content: '' };
                }
                currentBlock.content += line + '\n';
                continue;
            } else if (currentBlock && currentBlock.type === 'html' && line.match(/<\/[a-z]+>/i)) {
                currentBlock.content += line + '\n';
                blocks.push({ type: 'html', content: currentBlock.content.trim() });
                currentBlock = null;
                continue;
            }

            // Line breaks
            if (line.trim() === '') {
                if (currentBlock && currentBlock.type === 'paragraph') {
                    blocks.push({ type: 'paragraph', content: currentBlock.content.trim() });
                    currentBlock = null;
                }
                continue;
            }

            // Paragraphs - multiple consecutive lines form one paragraph
            if (!currentBlock || currentBlock.type !== 'paragraph') {
                currentBlock = { type: 'paragraph', content: '' };
            }
            currentBlock.content += (currentBlock.content ? '\n' : '') + line;
        }

        // Add any remaining block
        if (currentBlock) {
            blocks.push({ type: currentBlock.type, content: currentBlock.content.trim() });
        }

        // Merge consecutive paragraph blocks
        const merged = [];
        for (let i = 0; i < blocks.length; i++) {
            const blk = blocks[i];
            if (blk.type === 'paragraph' && merged.length > 0 && merged[merged.length - 1].type === 'paragraph') {
                merged[merged.length - 1].content += '\n' + blk.content;
            } else {
                merged.push(blk);
            }
        }

        return merged;
    }

    static exportBlocks (blocks) {
        return blocks.map(block => {
            if (block.type === 'hr') {
                return '---';
            } else if (block.type === 'br') {
                return '';
            } else {
                return block.content;
            }
        }).join('\n\n');
    }

    static extractLinkAtCursor (text, cursorPos) {
        // Pattern for markdown link: [text](url "title")
        const linkPattern = /\[([^\]]+)\]\(([^)]+?)(?:\s+"([^"]+)")?\)/g;
        let match;

        while ((match = linkPattern.exec(text)) !== null) {
            const start = match.index;
            const end = match.index + match[0].length;

            if (cursorPos >= start && cursorPos <= end) {
                return {
                    found: true,
                    start: start,
                    end: end,
                    text: match[1],
                    url: match[2],
                    title: match[3] || ''
                };
            }
        }

        return { found: false };
    }
}
