// Tests for the fallback markdown parser used when marked.js is unavailable
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// The parser is an IIFE that writes to window.marked when no marked global
// exists; emulate that environment.
globalThis.window = {};
require('node:fs');
const fs = require('node:fs');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '..', 'markdown-parser.js'), 'utf8');
new Function('window', src)(globalThis.window);

const parse = globalThis.window.marked.parse;

test('image renders as <img>, not a stray anchor', () => {
    const html = parse('![alt](http://x/y.png)');
    assert.ok(html.includes('<img src="http://x/y.png" alt="alt">'), html);
    assert.ok(!html.includes('<a '), html);
});

test('image with title keeps its title', () => {
    const html = parse('![alt](http://x/y.png "the title")');
    assert.ok(html.includes('title="the title"'), html);
});

test('plain link still renders as <a>', () => {
    const html = parse('[text](http://a.b)');
    assert.ok(html.includes('<a href="http://a.b">text</a>'), html);
});

test('image and link in the same input both render', () => {
    const html = parse('![pic](http://x/1.png) and [text](http://a.b)');
    assert.ok(html.includes('<img src="http://x/1.png"'), html);
    assert.ok(html.includes('<a href="http://a.b">text</a>'), html);
});
