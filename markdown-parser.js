// Simple Markdown Parser - Fallback for when Marked.js is not available
(function () {
    // Check if marked is already loaded
    if (typeof marked !== 'undefined') {
        return;
    }

    const PLACEHOLDER = '\u0000';

    // Create a simple markdown parser
    window.marked = {
        parse: function (markdown) {
            let html = markdown;

            // Hide code blocks/spans behind placeholders before the global
            // escape pass: their content is escaped exactly once here, and
            // the inline passes never treat generated HTML as input.
            const codeBlocks = [];
            html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function (match, lang, code) {
                codeBlocks.push('<pre><code class="language-' + escapeHtml(lang) + '">' + escapeHtml(code.trim()) + '</code></pre>');
                return PLACEHOLDER + 'CB' + (codeBlocks.length - 1) + PLACEHOLDER;
            });

            const codeSpans = [];
            html = html.replace(/`([^`]+)`/g, function (match, code) {
                codeSpans.push('<code>' + escapeHtml(code) + '</code>');
                return PLACEHOLDER + 'CS' + (codeSpans.length - 1) + PLACEHOLDER;
            });

            // Ordered lists: wrapped in <ol> and hidden before the generic
            // <li> sweep would fold them into a <ul>.
            const olBlocks = [];
            html = html.replace(/(?:^\d+\. .*(?:\n|$))+/gim, function (block) {
                const items = block.trim().split('\n')
                    .map((line) => '<li>' + line.replace(/^\s*\d+\.\s*/, '') + '</li>')
                    .join('\n');
                olBlocks.push('<ol>\n' + items + '\n</ol>');
                return PLACEHOLDER + 'OL' + (olBlocks.length - 1) + PLACEHOLDER;
            });

            // Escape all remaining text once, up front: every replacement
            // below only inserts tags from fixed templates, so every captured
            // group is already escaped and cannot break out into markup.
            html = escapeHtml(html);

            // Headers
            html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
            html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
            html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
            html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
            html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
            html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');

            // Bold
            html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

            // Italic
            html = html.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
            html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

            // Images (must run before links, or the inner [alt](url) of
            // ![alt](url) would be converted to an anchor first). Text is
            // already escaped here, so titles use &quot; for quotes.
            html = html.replace(/!\[([^\]]*)\]\(([^)]+?)(?:\s+&quot;([^&]*)&quot;)?\)/g, function (match, alt, url, title) {
                const src = safeUrl(url);
                if (title) {
                    return '<img src="' + src + '" alt="' + alt + '" title="' + title + '">';
                }
                return '<img src="' + src + '" alt="' + alt + '">';
            });

            // Links
            html = html.replace(/\[([^\]]+)\]\(([^)]+?)(?:\s+&quot;([^&]*)&quot;)?\)/g, function (match, text, url, title) {
                const href = safeUrl(url);
                if (title) {
                    return '<a href="' + href + '" title="' + title + '">' + text + '</a>';
                }
                return '<a href="' + href + '">' + text + '</a>';
            });

            // Tables
            html = html.replace(/\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)*)/g, function (match, header, rows) {
                let table = '<table>';

                // Header
                table += '<thead><tr>';
                const headerCells = header.split('|');
                headerCells.forEach((cell, idx) => {
                    // Skip first and last empty cells from split
                    if (idx === 0 || idx === headerCells.length - 1) {
                        if (cell.trim()) {
                            table += '<th>' + cell.trim() + '</th>';
                        }
                    } else {
                        table += '<th>' + cell.trim() + '</th>';
                    }
                });
                table += '</tr></thead>';

                // Body
                table += '<tbody>';
                rows.trim().split('\n').forEach(row => {
                    if (row.trim()) {
                        table += '<tr>';
                        const cells = row.split('|');
                        cells.forEach((cell, idx) => {
                            // Skip first and last empty cells from split
                            if (idx === 0 || idx === cells.length - 1) {
                                if (cell.trim()) {
                                    table += '<td>' + cell.trim() + '</td>';
                                }
                            } else {
                                table += '<td>' + cell.trim() + '</td>';
                            }
                        });
                        table += '</tr>';
                    }
                });
                table += '</tbody></table>';

                return table;
            });

            // Blockquotes
            html = html.replace(/^\> (.+)$/gim, '<blockquote>$1</blockquote>');

            // Horizontal rule
            html = html.replace(/^---$/gim, '<hr>');
            html = html.replace(/^\*\*\*$/gim, '<hr>');

            // Unordered lists
            html = html.replace(/^\* (.+)$/gim, '<li>$1</li>');
            html = html.replace(/^- (.+)$/gim, '<li>$1</li>');
            html = html.replace(/^\+ (.+)$/gim, '<li>$1</li>');

            // Wrap consecutive list items in ul
            html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

            // Line breaks
            html = html.replace(/\n\n/g, '</p><p>');
            html = html.replace(/\n/g, '<br>');

            // Wrap in paragraphs if not already wrapped
            if (!html.match(/^<[^>]+>/)) {
                html = '<p>' + html + '</p>';
            }

            // Restore protected blocks
            html = html.replace(new RegExp(PLACEHOLDER + 'OL(\\d+)' + PLACEHOLDER, 'g'), (m, i) => olBlocks[+i]);
            html = html.replace(new RegExp(PLACEHOLDER + 'CB(\\d+)' + PLACEHOLDER, 'g'), (m, i) => codeBlocks[+i]);
            html = html.replace(new RegExp(PLACEHOLDER + 'CS(\\d+)' + PLACEHOLDER, 'g'), (m, i) => codeSpans[+i]);

            return html;
        }
    };

    // URLs are attribute-escaped by the global pass already; this only keeps
    // schemes that cannot execute script out of href/src.
    function safeUrl (url) {
        if (/^\s*(javascript|data|vbscript)\s*:/i.test(url)) return '#';
        return url;
    }

    function escapeHtml (text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
})();
