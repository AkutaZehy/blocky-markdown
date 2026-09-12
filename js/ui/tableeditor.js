// Table editor with split view
class TableEditorManager {
    constructor(blockyMarkdown) {
        this.app = blockyMarkdown;
        this.currentEditingTableBlockId = null;
        this.selectedTableCell = null;
        this.currentAlignments = null;
    }

    // Split a markdown table row into cell values. Empty cells are kept
    // (they define column positions) and escaped pipes (\|) are unescaped.
    static splitTableRow (line) {
        let s = line.trim();
        if (s.startsWith('|')) s = s.slice(1);
        if (s.endsWith('|')) s = s.slice(0, -1);
        return s.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'));
    }

    static isSeparatorRow (line) {
        const cells = TableEditorManager.splitTableRow(line);
        return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell));
    }

    // Parse markdown into a grid of cell values plus per-column alignments
    // taken from the separator row. Returns null when no table rows exist.
    static parseTableGrid (markdown) {
        const lines = markdown.trim().split('\n')
            .filter((line) => line.trim().startsWith('|'));
        if (lines.length === 0) return null;

        const rows = [];
        const alignments = [];
        lines.forEach((line, idx) => {
            if (idx === 1 && TableEditorManager.isSeparatorRow(line)) {
                TableEditorManager.splitTableRow(line).forEach((cell, colIdx) => {
                    const left = cell.startsWith(':');
                    const right = cell.endsWith(':');
                    alignments[colIdx] = left && right ? ':---:' : right ? '---:' : left ? ':---' : '---';
                });
                return;
            }
            rows.push(TableEditorManager.splitTableRow(line));
        });
        return { rows, alignments };
    }

    static buildTableMarkdown (rows, alignments = []) {
        if (rows.length === 0) return '';
        const cols = rows.reduce((max, row) => Math.max(max, row.length), 0);
        const escapeCell = (value) => (value || '').replace(/\|/g, '\\|');
        const renderRow = (cells) => {
            const padded = cells.slice();
            while (padded.length < cols) padded.push('');
            return '| ' + padded.map((cell) => escapeCell(cell.trim())).join(' | ') + ' |';
        };
        const separator = '| ' + Array.from({ length: cols }, (_, j) => alignments[j] || '---').join(' | ') + ' |';
        const lines = [renderRow(rows[0]), separator];
        for (let i = 1; i < rows.length; i++) {
            lines.push(renderRow(rows[i]));
        }
        return lines.join('\n');
    }

    setup () {
        document.getElementById('addRowBtn').addEventListener('click', () => this.addRow());
        document.getElementById('removeRowBtn').addEventListener('click', () => this.removeRow());
        document.getElementById('addColBtn').addEventListener('click', () => this.addColumn());
        document.getElementById('removeColBtn').addEventListener('click', () => this.removeColumn());
        document.getElementById('tableConfirm').addEventListener('click', () => this.confirm());
        document.getElementById('insertLinkInCell').addEventListener('click', () => {
            this.app.linkEditor.show(this.currentEditingTableBlockId, 'cell');
        });

        // Cell content editor
        document.getElementById('cellContentEditor').addEventListener('input', (e) => {
            if (this.selectedTableCell) {
                const input = this.selectedTableCell.querySelector('input');
                if (input) {
                    input.value = e.target.value;
                }
            }
        });
    }

    edit (blockId) {
        this.currentEditingTableBlockId = blockId;
        let block = this.app.workspaceBlocks.find(b => b.id === blockId);
        if (!block) {
            block = this.app.cacheBlocks.find(b => b.id === blockId);
        }

        if (block.content) {
            this.parseTableContent(block.content);
        } else {
            this.currentAlignments = [];
            this.generateTableEditor(3, 3);
        }

        document.getElementById('tableModal').classList.add('active');
    }

    parseTableContent (markdown) {
        const grid = TableEditorManager.parseTableGrid(markdown);
        if (!grid || grid.rows.length === 0) {
            this.currentAlignments = [];
            this.generateTableEditor(3, 3);
            return;
        }

        const rows = grid.rows;
        const cols = rows.reduce((max, row) => Math.max(max, row.length), 0);
        this.currentAlignments = grid.alignments;
        this.generateTableEditor(rows.length, cols);

        const table = document.querySelector('#tableEditor table');
        rows.forEach((cells, rowIdx) => {
            cells.forEach((cell, colIdx) => {
                const input = table.rows[rowIdx]?.cells[colIdx]?.querySelector('input');
                if (input) {
                    input.value = cell;
                }
            });
        });
    }

    generateTableEditor (rows = 3, cols = 3) {
        const editor = document.getElementById('tableEditor');
        editor.innerHTML = '';

        const table = document.createElement('table');

        for (let i = 0; i < rows; i++) {
            const tr = document.createElement('tr');
            for (let j = 0; j < cols; j++) {
                const td = document.createElement('td');
                td.dataset.row = i;
                td.dataset.col = j;

                const input = document.createElement('input');
                input.type = 'text';
                input.placeholder = i === 0 ? `Header ${j + 1}` : `R${i}C${j + 1}`;

                td.onclick = () => this.selectCell(td, input.value);
                input.onclick = (e) => e.stopPropagation();
                input.onfocus = () => this.selectCell(td, input.value);
                input.oninput = (e) => {
                    if (this.selectedTableCell === td) {
                        document.getElementById('cellContentEditor').value = e.target.value;
                    }
                };

                td.appendChild(input);
                tr.appendChild(td);
            }
            table.appendChild(tr);
        }

        editor.appendChild(table);
    }

    selectCell (cell, content) {
        // Remove previous selection
        document.querySelectorAll('#tableEditor td').forEach(td => {
            td.classList.remove('selected');
        });

        // Select this cell
        cell.classList.add('selected');
        this.selectedTableCell = cell;

        // Update cell editor
        const row = parseInt(cell.dataset.row) + 1;
        const col = parseInt(cell.dataset.col) + 1;
        document.getElementById('selectedCellLabel').textContent = `Row ${row}, Column ${col}`;
        document.getElementById('cellContentEditor').value = content;
    }

    addRow () {
        const table = document.querySelector('#tableEditor table');
        if (!table) return;

        const cols = table.rows[0]?.cells.length || 3;
        const tr = document.createElement('tr');
        const newRowIndex = table.rows.length;

        for (let j = 0; j < cols; j++) {
            const td = document.createElement('td');
            td.dataset.row = newRowIndex;
            td.dataset.col = j;

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `R${newRowIndex + 1}C${j + 1}`;

            td.onclick = () => this.selectCell(td, input.value);
            input.onclick = (e) => e.stopPropagation();
            input.onfocus = () => this.selectCell(td, input.value);
            input.oninput = (e) => {
                if (this.selectedTableCell === td) {
                    document.getElementById('cellContentEditor').value = e.target.value;
                }
            };

            td.appendChild(input);
            tr.appendChild(td);
        }

        table.appendChild(tr);
    }

    removeRow () {
        const table = document.querySelector('#tableEditor table');
        if (!table || table.rows.length <= 1) {
            alert('Cannot remove header row');
            return;
        }

        table.deleteRow(table.rows.length - 1);
    }

    addColumn () {
        const table = document.querySelector('#tableEditor table');
        if (!table) return;

        Array.from(table.rows).forEach((row, rowIndex) => {
            const newColIndex = row.cells.length;
            const td = document.createElement('td');
            td.dataset.row = rowIndex;
            td.dataset.col = newColIndex;

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = rowIndex === 0 ? `Header ${newColIndex + 1}` : `R${rowIndex + 1}C${newColIndex + 1}`;

            td.onclick = () => this.selectCell(td, input.value);
            input.onclick = (e) => e.stopPropagation();
            input.onfocus = () => this.selectCell(td, input.value);
            input.oninput = (e) => {
                if (this.selectedTableCell === td) {
                    document.getElementById('cellContentEditor').value = e.target.value;
                }
            };

            td.appendChild(input);
            row.appendChild(td);
        });
    }

    removeColumn () {
        const table = document.querySelector('#tableEditor table');
        if (!table) return;

        const cols = table.rows[0]?.cells.length || 0;
        if (cols <= 1) {
            alert('Table must have at least one column');
            return;
        }

        Array.from(table.rows).forEach(row => {
            if (row.cells.length > 0) {
                row.deleteCell(row.cells.length - 1);
            }
        });
    }

    confirm () {
        const table = document.querySelector('#tableEditor table');
        if (!table) return;

        const rows = [];
        Array.from(table.rows).forEach((tr) => {
            const row = Array.from(tr.cells).map((td) => {
                const input = td.querySelector('input');
                return input ? input.value : '';
            });
            rows.push(row);
        });
        // Keep the original default naming for empty header cells
        if (rows.length > 0) {
            rows[0] = rows[0].map((value, j) => value || `Col ${j + 1}`);
        }

        const markdown = TableEditorManager.buildTableMarkdown(rows, this.currentAlignments || []);

        if (this.currentEditingTableBlockId !== null) {
            this.app.updateBlockContent(this.currentEditingTableBlockId, markdown.trim());
            this.app.renderBlocks();
        }

        document.getElementById('tableModal').classList.remove('active');
        this.currentEditingTableBlockId = null;
        this.selectedTableCell = null;
        this.currentAlignments = null;
    }
}
