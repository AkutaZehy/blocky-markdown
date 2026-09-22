// Tests for MarkdownUtils.parseImport block splitting
import test from 'node:test';
import assert from 'node:assert/strict';
import { MarkdownUtils } from '../js/utils/markdown.js';

function parse (markdown) {
    return MarkdownUtils.parseImport(markdown).map((b) => [b.type, b.content]);
}

test('paragraph followed directly by a list keeps both blocks', () => {
    assert.deepEqual(parse('Some text\n- item 1\n- item 2\n'), [
        ['paragraph', 'Some text'],
        ['list', '- item 1\n- item 2']
    ]);
});

test('paragraph followed directly by a table keeps both blocks', () => {
    assert.deepEqual(
        parse('Intro text\n| A | B |\n| --- | --- |\n| 1 | 2 |\n'),
        [
            ['paragraph', 'Intro text'],
            ['table', '| A | B |\n| --- | --- |\n| 1 | 2 |']
        ]
    );
});

test('paragraph followed directly by a quote keeps both blocks', () => {
    assert.deepEqual(parse('Intro\n> quoted\n'), [
        ['paragraph', 'Intro'],
        ['quote', '> quoted']
    ]);
});

test('paragraph followed directly by an html block keeps both blocks', () => {
    assert.deepEqual(parse('Intro\n<div>\nhi\n</div>\n'), [
        ['paragraph', 'Intro'],
        ['html', '<div>\nhi\n</div>']
    ]);
});

test('paragraph followed directly by a code fence keeps both blocks', () => {
    assert.deepEqual(parse('Intro\n```js\nconst a = 1;\n```\n'), [
        ['paragraph', 'Intro'],
        ['code', '```js\nconst a = 1;\n```']
    ]);
});

test('heading splits surrounding paragraphs and keeps order', () => {
    assert.deepEqual(parse('text\n# Title\nmore\n'), [
        ['paragraph', 'text'],
        ['heading', '# Title'],
        ['paragraph', 'more']
    ]);
});

test('horizontal rule flushes a pending paragraph', () => {
    assert.deepEqual(parse('text\n---\nmore\n'), [
        ['paragraph', 'text'],
        ['hr', '---'],
        ['paragraph', 'more']
    ]);
});

test('multi-line html block is kept whole', () => {
    assert.deepEqual(parse('<div>\nhello\n</div>'), [
        ['html', '<div>\nhello\n</div>']
    ]);
});

test('unterminated code fence is not lost at end of input', () => {
    assert.deepEqual(parse('pre\n```\ncode'), [
        ['paragraph', 'pre'],
        ['code', '```\ncode']
    ]);
});

test('unterminated mermaid fence becomes a mermaid block', () => {
    assert.deepEqual(parse('```mermaid\ngraph TD;'), [
        ['mermaid', '```mermaid\ngraph TD;']
    ]);
});

test('frontmatter is extracted as its own block', () => {
    assert.deepEqual(parse('---\ntitle: x\n---\n\nbody\n'), [
        ['frontmatter', '---\ntitle: x\n---'],
        ['paragraph', 'body']
    ]);
});

test('consecutive paragraphs merge into one block', () => {
    assert.deepEqual(parse('text1\n\ntext2\n'), [['paragraph', 'text1\ntext2']]);
});

test('blank line separates list blocks', () => {
    assert.deepEqual(parse('- a\n\n- b\n'), [
        ['list', '- a'],
        ['list', '- b']
    ]);
});

test('mermaid fence with content is a mermaid block', () => {
    assert.deepEqual(parse('```mermaid\ngraph TD;\n  A-->B;\n```'), [
        ['mermaid', '```mermaid\ngraph TD;\n  A-->B;\n```']
    ]);
});
