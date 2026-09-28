---
title: Blocky Markdown Demo
author: blocky-markdown
---

# Blocky Markdown Demo

Every block type on one page. Import this file (↓ Import), edit it block by block, then export it back out — what you see is round-trippable Markdown.

## Blocks you can compose

Paragraphs are ordinary text. Inline markup like **bold**, *italic*, `inline code`, and a [link](https://github.com "blocky-markdown repo") works inside them.

### Lists

- Drag a block onto another to reorder
- Use the arrow buttons to nudge it up or down
- Click the #N badge to set its position directly

1. Import some Markdown
2. Edit block by block
3. Export when done

### Quote

> Blocks move to the Cache instead of being deleted — nothing is lost by accident.

---

### Tables

| Block type | Editable | Round-trip |
| ---------- | -------- | ---------- |
| Paragraph  | Yes      | Yes        |
| Table      | Yes      | Yes        |
| Mermaid    | Yes      | Yes        |

### Code

```javascript
// Blocks are plain objects in an array — no framework, no build step
const block = { id: 'b1', type: 'code', content: '...' };
console.log(`Hello from the ${block.type} block!`);
```

### Diagrams

```mermaid
graph LR
  A[Markdown in] --> B{Parse}
  B --> C[Blocks]
  C --> D[Edit]
  D --> E[Markdown out]
```

That's the whole tour — press ↑ Export (Ctrl+S) any time.

### Raw HTML

<p>Raw HTML blocks are sanitized by <b>DOMPurify</b> before rendering.</p>
