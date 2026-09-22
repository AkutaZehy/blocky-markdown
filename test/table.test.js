// Tests for the table editor's pure parsing/serialisation helpers
import test from 'node:test';
import assert from 'node:assert/strict';
import { TableEditorManager } from '../js/ui/tableeditor.js';

test('splitTableRow keeps empty cells so columns stay aligned', () => {
    assert.deepEqual(
        TableEditorManager.splitTableRow('| a |   | c |'),
        ['a', '', 'c']
    );
});

test('splitTableRow unescapes escaped pipes', () => {
    assert.deepEqual(
        TableEditorManager.splitTableRow('| a \\| b | c |'),
        ['a | b', 'c']
    );
});

test('splitTableRow handles rows without outer pipes', () => {
    assert.deepEqual(TableEditorManager.splitTableRow('a | b'), ['a', 'b']);
});

test('parseTableGrid reads cells, skips the separator and extracts alignments', () => {
    const grid = TableEditorManager.parseTableGrid(
        '| a |   | c |\n| :-- | --: | :-: |\n| 1 | 2 | 3 |'
    );
    assert.deepEqual(grid.rows, [['a', '', 'c'], ['1', '2', '3']]);
    assert.deepEqual(grid.alignments, [':---', '---:', ':---:']);
});

test('parseTableGrid treats a table without separator as all data rows', () => {
    const grid = TableEditorManager.parseTableGrid('| a | b |\n| 1 | 2 |');
    assert.deepEqual(grid.rows, [['a', 'b'], ['1', '2']]);
    assert.deepEqual(grid.alignments, []);
});

test('parseTableGrid returns null when there are no table rows', () => {
    assert.equal(TableEditorManager.parseTableGrid('just text'), null);
});

test('buildTableMarkdown emits alignment markers for each column', () => {
    const md = TableEditorManager.buildTableMarkdown(
        [['h1', 'h2'], ['a', 'b']],
        [':---', '---:']
    );
    assert.equal(md, '| h1 | h2 |\n| :--- | ---: |\n| a | b |');
});

test('buildTableMarkdown escapes pipes inside cell values', () => {
    const md = TableEditorManager.buildTableMarkdown([['a | b', 'c'], ['1', '2']]);
    assert.equal(md, '| a \\| b | c |\n| --- | --- |\n| 1 | 2 |');
});

test('buildTableMarkdown pads short rows to the widest row', () => {
    const md = TableEditorManager.buildTableMarkdown([['a', 'b', 'c'], ['1']]);
    assert.equal(md, '| a | b | c |\n| --- | --- | --- |\n| 1 |  |  |');
});

test('parse(build(x)) round-trips cells and alignments', () => {
    const rows = [['a', '', 'c | d'], ['1', '2', '']];
    const alignments = [':---:', '---', '---:'];
    const grid = TableEditorManager.parseTableGrid(
        TableEditorManager.buildTableMarkdown(rows, alignments)
    );
    assert.deepEqual(grid.rows, rows);
    assert.deepEqual(grid.alignments, alignments);
});
