# blocky-markdown

A minimalist, framework-free markdown editor with a block-based interface inspired by WordPress.

## Features

- 🎨 **Dual Theme System** - Minimalist (default) or Frutiger Aero aesthetic
- 📝 **Block-Based Editing** - WordPress-like block system for organizing content
- 📊 **Enhanced Table Editor** - Split view with grid navigation and dedicated cell editor
- 🔗 **Smart Content Management** - Outline sidebar and cache area for better organization
- 💾 **Import/Export** - Read and export markdown files with frontmatter support
- 🔄 **Auto-Save** - Automatic saving to browser localStorage
- 🚀 **No Build Required** - Pure HTML, CSS, and JavaScript

## Theme System

### Minimalist Theme (Default)
- Black and white color scheme
- Monospace fonts for clean readability
- No decorative elements
- Distraction-free writing experience

### Frutiger Aero Theme
- Modern blue color palette
- Soft gradients and shadows
- Professional, polished interface

Toggle between themes using the 🎨 Theme button in the header.

## Supported Block Types

- ⚙️ **Frontmatter** - Jekyll/Hugo YAML front matter
- 📝 **Paragraph** - Regular text content
- 📌 **Heading** - H1-H6 headings with level selector
- 📋 **List** - Ordered and unordered lists
- 💻 **Code** - Code blocks with language tags
- 📊 **Table** - Interactive table editor with visual interface
- 💬 **Quote** - Blockquotes
- ➖ **HR** - Horizontal rule
- ⏎ **BR** - Line break
- 🌐 **HTML** - Raw HTML blocks
- 📊 **Mermaid** - Mermaid diagram support

## Enhanced Features

### Outline Sidebar
- Real-time document structure view
- Click any item to jump to that block
- Shows block type icons and preview text
- Automatically updates as you edit

### Cache Area
- Drag blocks to cache for temporary storage
- Safer than immediate deletion
- Edit blocks in cache or workspace
- Permanent delete only available in cache

### Table Editor Improvements
- **Split View**: Grid navigation (left) + content editor (right)
- **Add/Remove Rows**: Dynamic row management without data loss
- **Add/Remove Columns**: Adjust table width on the fly
- **Cell Selection**: Click cells to edit long content comfortably
- **Link Support**: Easily edit markdown links in table cells

## Usage

1. **Open the Editor**
   - Open `index.html` in your web browser
   - No server or build process required

2. **Choose Your Theme**
   - Click 🎨 Theme to switch between minimalist and Frutiger Aero styles
   - Your preference is saved automatically

3. **Adding Blocks**
   - Click block type buttons at the bottom of the workspace
   - Use the outline sidebar to navigate your document

4. **Editing Content**
   - Type directly in text blocks
   - Use ✏️ button for tables to open the enhanced editor
   - Drag blocks up/down or use ↑↓ buttons to reorder

5. **Managing Blocks**
   - Drag blocks to cache area (📦 button)
   - Drag back to workspace when needed
   - Permanently delete from cache area only

6. **Import/Export**
   - Click "📥 Import" to paste existing markdown
   - Click "📤 Export" to copy or download your markdown
   - Supports Jekyll frontmatter

7. **Table Editing**
   - Click ✏️ on table blocks
   - Use +/- Row/Col buttons to adjust size
   - Select cells to edit long content in dedicated editor
   - Click Confirm to save changes

## Technologies Used

- **HTML5** - Structure
- **CSS3** - Dual theme system with CSS variables
- **JavaScript (ES6+)** - Application logic
- **Marked.js** - Markdown parsing and rendering

## Browser Compatibility

Works in all modern browsers that support:
- ES6 JavaScript
- CSS Grid and Flexbox
- CSS Custom Properties
- LocalStorage API
- Drag and Drop API

## Design Philosophy

**Minimalist First**: The default theme prioritizes clarity and focus, using only black, white, and grays with monospace fonts. Perfect for distraction-free writing.

**Professional Alternative**: The Frutiger Aero theme provides a modern, polished look with subtle colors and gradients for users who prefer more visual richness.

## License

MIT License - See LICENSE file for details

## About

A local markdown editor designed for writers who want block-based editing without the complexity of modern frameworks. Just open and start writing!
