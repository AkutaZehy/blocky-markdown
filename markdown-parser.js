// Simple Markdown Parser - Fallback for when Marked.js is not available
(function() {
    // Check if marked is already loaded
    if (typeof marked !== 'undefined') {
        return;
    }
    
    // Create a simple markdown parser
    window.marked = {
        parse: function(markdown) {
            let html = markdown;
            
            // Code blocks (before other processing)
            html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function(match, lang, code) {
                return '<pre><code class="language-' + lang + '">' + escapeHtml(code.trim()) + '</code></pre>';
            });
            
            // Inline code
            html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
            
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
            
            // Links
            html = html.replace(/\[([^\]]+)\]\(([^)"]+)(?:\s+"([^"]+)")?\)/g, function(match, text, url, title) {
                if (title) {
                    return '<a href="' + url + '" title="' + title + '">' + text + '</a>';
                }
                return '<a href="' + url + '">' + text + '</a>';
            });
            
            // Images
            html = html.replace(/!\[([^\]]*)\]\(([^)"]+)(?:\s+"([^"]+)")?\)/g, function(match, alt, url, title) {
                if (title) {
                    return '<img src="' + url + '" alt="' + alt + '" title="' + title + '">';
                }
                return '<img src="' + url + '" alt="' + alt + '">';
            });
            
            // Tables
            html = html.replace(/\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)*)/g, function(match, header, rows) {
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
            
            // Ordered lists
            html = html.replace(/^\d+\. (.+)$/gim, '<li>$1</li>');
            
            // Line breaks
            html = html.replace(/\n\n/g, '</p><p>');
            html = html.replace(/\n/g, '<br>');
            
            // Wrap in paragraphs if not already wrapped
            if (!html.match(/^<[^>]+>/)) {
                html = '<p>' + html + '</p>';
            }
            
            return html;
        }
    };
    
    function escapeHtml(text) {
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
