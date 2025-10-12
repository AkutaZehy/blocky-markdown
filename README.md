# blocky-markdown

A local, framework-free markdown editor with a block-based interface inspired by WordPress, featuring a Y2K design aesthetic.

## Features

- 🎨 **Y2K Design Style** - Retro aesthetics with neon colors, gradients, and shadows
- 📝 **Block-Based Editing** - WordPress-like block system for organizing content
- 📊 **Enhanced Table Editor** - Interactive table creation and editing interface
- 🔗 **Smart Link Editor** - Easy-to-use interface for creating markdown links
- 💾 **Import/Export** - Read and export markdown files
- 🔄 **Auto-Save** - Automatic saving to browser localStorage
- 🚀 **No Build Required** - Pure HTML, CSS, and JavaScript

## Supported Block Types

- 📝 **Paragraph** - Regular text content
- 📌 **Heading** - H1-H6 headings with level selector
- 📋 **List** - Ordered and unordered lists
- 💻 **Code** - Code blocks with syntax highlighting
- 📊 **Table** - Interactive table editor with visual interface
- 🔗 **Link** - Hyperlinks with text, URL, and optional title
- 💬 **Quote** - Blockquotes

## Quick Start

1. **Open the Editor**
   - Simply open `index.html` in your web browser
   - No server or build process required

2. **Try the Example**
   - Click "📥 Import MD" button
   - Copy the content from `example.md` and paste it
   - Explore the different block types and features

3. **Adding Blocks**
   - Click on any block type button at the bottom of the editor
   - Each block can be edited, moved, or deleted independently

3. **Editing Content**
   - Type directly in paragraph, heading, list, quote, and code blocks
   - Use the edit button (✏️) for tables and links to open specialized editors

4. **Managing Blocks**
   - Use ↑↓ buttons to reorder blocks
   - Use 🗑️ button to delete blocks
   - Blocks are automatically saved to localStorage

5. **Import/Export**
   - Click "📥 Import MD" to paste existing markdown
   - Click "📤 Export MD" to copy or download your markdown
   - Use "📋 Copy to Clipboard" or "💾 Download" in the export modal

6. **Table Editor**
   - Specify rows and columns
   - Click "Generate" to create the table structure
   - Fill in cells directly
   - Click "Confirm" to add to your document

7. **Link Editor**
   - Enter link text, URL, and optional title
   - Click "Confirm" to insert the formatted link

## Technologies Used

- **HTML5** - Structure
- **CSS3** - Y2K styling with gradients, animations, and neon effects
- **JavaScript (ES6+)** - Application logic
- **Marked.js** - Markdown parsing and rendering

## Browser Compatibility

Works in all modern browsers that support:
- ES6 JavaScript
- CSS Grid and Flexbox
- LocalStorage API

## License

MIT License - See LICENSE file for details

## About

Created as a local tool for markdown editing with an intuitive block-based interface, requiring no frameworks or complex setup. Just open and start writing!