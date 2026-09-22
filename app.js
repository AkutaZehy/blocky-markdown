// Main Blocky Markdown Editor Application
import { Storage } from "./js/utils/storage.js";
import { MarkdownUtils } from "./js/utils/markdown.js";
import { BlockRenderer } from "./js/utils/renderer.js";
import { OutlineManager } from "./js/ui/outline.js";
import { DragDropManager } from "./js/ui/dragdrop.js";
import { LinkEditorManager } from "./js/ui/linkeditor.js";
import { TableEditorManager } from "./js/ui/tableeditor.js";
import { BlockFactory } from "./js/blocks/factory.js";

export class BlockyMarkdown {
    constructor() {
        this.workspaceBlocks = [];
        this.cacheBlocks = [];
        this.currentBlockId = 0;
        this.blockElements = new Map();
        this.currentTheme = "daytime";
        this.collapsedHeadings = new Set();
        this.addPosition = "end";
        this.history = [];
        this.redoStack = [];
        this.maxHistory = 100;
        this.isRestoringHistory = false;
        this.contentEditOpen = false;
        this.contentEditTimer = null;
        this.persistTimer = null;
        this.mermaidLoading = null;
        this.previewMode = false;
        this.defaultTip = "Blocky Markdown";

        // Initialize managers
        this.outlineManager = new OutlineManager(this);
        this.dragDropManager = new DragDropManager(this);
        this.linkEditor = new LinkEditorManager(this);
        this.tableEditor = new TableEditorManager(this);
        this.blockFactory = new BlockFactory(this);

        this.init();
    }

    init () {
        this.setupEventListeners();
        this.loadFromLocalStorage();
        this.loadTheme();
        this.setupResizers();
        this.renumberBlocks("workspace");
        this.renumberBlocks("cache");
        this.recordHistory();

        // Initialize managers
        this.dragDropManager.setup();
        this.linkEditor.setup();
        this.tableEditor.setup();
        this.updateAddPositionUI();
        this.updatePreviewUI();
        this.setTip(this.defaultTip);

        // If no blocks exist, add a welcome block
        if (this.workspaceBlocks.length === 0) {
            this.addBlock("paragraph", "", "workspace");
        }

        this.outlineManager.update();

        // A pending debounced save must land before the page goes away
        window.addEventListener("beforeunload", () => this.flushPersist());
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") this.flushPersist();
        });
    }

    setupEventListeners () {
        // Theme toggle
        document
            .getElementById("themeToggle")
            .addEventListener("click", () => this.toggleTheme());
        document
            .getElementById("undoBtn")
            .addEventListener("click", () => this.undo());
        document
            .getElementById("redoBtn")
            .addEventListener("click", () => this.redo());
        document
            .getElementById("historyLimitBtn")
            .addEventListener("click", () => {
                const value = prompt(
                    "Set max history steps (default 100)",
                    this.maxHistory.toString()
                );
                const num = parseInt(value, 10);
                if (!isNaN(num) && num > 0) {
                    this.maxHistory = num;
                    this.trimHistory();
                }
            });

        document
            .getElementById("previewToggle")
            .addEventListener("click", () => {
                this.previewMode = !this.previewMode;
                this.updatePreviewUI();
            });

        // Add block buttons
        document.querySelectorAll(".btn-add").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                const type = e.target.closest("button").dataset.type;
                const position = this.addPosition === "start" ? 0 : -1;
                this.addBlock(type, "", "workspace", position);
            });
        });

        // Add position toggle
        document
            .getElementById("addPosToggle")
            .addEventListener("click", () => {
                this.addPosition = this.addPosition === "start" ? "end" : "start";
                this.updateAddPositionUI();
            });

        // Import/Export buttons
        document
            .getElementById("importBtn")
            .addEventListener("click", () => this.showImportModal());
        document
            .getElementById("exportBtn")
            .addEventListener("click", () => this.showExportModal());

        this.registerTip("#undoBtn", "Click to undo (Ctrl+Z)");
        this.registerTip("#redoBtn", "Click to redo (Ctrl+Y)");
        this.registerTip("#historyLimitBtn", "Set history steps");
        this.registerTip("#themeToggle", "Toggle theme");
        this.registerTip("#importBtn", "Import markdown");
        this.registerTip("#exportBtn", "Export markdown (Ctrl+S)");
        this.registerTip("#previewToggle", "Toggle preview/edit");
        this.registerTip("#addPosToggle", "Click to toggle add position");

        // Modal controls
        document.querySelectorAll(".modal-close").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.target.closest(".modal").classList.remove("active");
            });
        });

        // Import confirm
        document
            .getElementById("importConfirm")
            .addEventListener("click", () => this.importMarkdown());

        // Export controls
        document
            .getElementById("copyBtn")
            .addEventListener("click", () => this.copyToClipboard());
        document
            .getElementById("downloadBtn")
            .addEventListener("click", () => this.downloadMarkdown());

        // Clear cache
        document
            .getElementById("clearCacheBtn")
            .addEventListener("click", () => {
                this.recordHistory();
                this.cacheBlocks = [];
                this.renumberBlocks("cache");
                this.renderBlocks();
                this.saveToLocalStorage();
            });

        // Clear workspace
        document
            .getElementById("clearWorkspaceBtn")
            .addEventListener("click", () => {
                this.recordHistory();
                this.workspaceBlocks = [];
                this.renumberBlocks("workspace");
                this.renderBlocks();
                this.outlineManager.update();
                this.saveToLocalStorage();
            });

        document.addEventListener("keydown", (e) => {
            if (e.ctrlKey && e.key.toLowerCase() === "z") {
                e.preventDefault();
                this.undo();
            } else if (e.ctrlKey && e.key.toLowerCase() === "y") {
                e.preventDefault();
                this.redo();
            } else if (e.ctrlKey && e.key.toLowerCase() === "s") {
                e.preventDefault();
                this.showExportModal();
            } else if (e.key === "Escape") {
                const activeModals = document.querySelectorAll(".modal.active");
                if (activeModals.length > 0) {
                    const topModal = activeModals[activeModals.length - 1];
                    const cancelBtn = topModal.querySelector(".modal-close");
                    if (cancelBtn) {
                        cancelBtn.click();
                    }
                }
            }
        });

        // Close modal on background click (only if data-backdrop-close is not "false")
        document.querySelectorAll(".modal").forEach((modal) => {
            modal.addEventListener("click", (e) => {
                if (e.target === modal && modal.dataset.backdropClose !== "false") {
                    modal.classList.remove("active");
                }
            });
        });

        // Close edit mode when clicking outside
        document.addEventListener("click", (e) => {
            if (!e.target.closest(".block") && !e.target.closest(".modal")) {
                this.closeAllEditModes();
            }
        });
    }

    setupResizers () {
        const outlineResizer = document.getElementById("outlineResizer");
        const cacheResizer = document.getElementById("cacheResizer");
        const outlineSidebar = document.getElementById("outlineSidebar");
        const cacheSidebar = document.getElementById("cacheSidebar");

        this.setupResizer(outlineResizer, outlineSidebar, "left");
        this.setupResizer(cacheResizer, cacheSidebar, "right");
    }

    updateAddPositionUI () {
        const toggleBtn = document.getElementById("addPosToggle");
        if (toggleBtn) {
            const isStart = this.addPosition === "start";
            toggleBtn.textContent = isStart ? "Add → Start" : "Add → End";
            toggleBtn.title = "Click to toggle";
        }
    }

    // Lazy-load mermaid.js (only when a preview actually contains a
    // mermaid block). Resolves null when the library is unavailable, so
    // callers can keep the fenced code block as fallback.
    loadMermaid () {
        if (this.mermaidLoading) return this.mermaidLoading;
        if (window.mermaid && typeof window.mermaid.run === "function") {
            return Promise.resolve(window.mermaid);
        }
        this.mermaidLoading = new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "https://unpkg.com/mermaid@11/dist/mermaid.min.js";
            script.onload = () => {
                const mermaid = window.mermaid;
                if (mermaid && typeof mermaid.run === "function") {
                    try {
                        mermaid.initialize({
                            startOnLoad: false,
                            suppressErrorRendering: true,
                        });
                    } catch (e) {
                        // keep library defaults on initialize failure
                    }
                    resolve(mermaid);
                } else {
                    this.mermaidLoading = null;
                    resolve(null);
                }
            };
            script.onerror = () => {
                this.mermaidLoading = null;
                resolve(null);
            };
            document.head.appendChild(script);
        });
        return this.mermaidLoading;
    }

    renderMermaidPreview (container) {
        const codeBlocks = container.querySelectorAll("pre code.language-mermaid");
        if (codeBlocks.length === 0) return;

        this.loadMermaid().then((mermaid) => {
            if (!mermaid) return;
            const nodes = [];
            codeBlocks.forEach((codeEl) => {
                const pre = codeEl.closest("pre");
                if (!pre || !pre.isConnected) return;
                const div = document.createElement("div");
                div.className = "mermaid";
                div.textContent = codeEl.textContent;
                pre.replaceWith(div);
                nodes.push(div);
            });
            if (nodes.length === 0) return;
            mermaid.run({ nodes }).catch(() => {
                // invalid diagram source stays visible as text
            });
        });
    }

    updatePreviewUI () {
        const previewContainer = document.getElementById("previewContainer");
        const blocksContainer = document.getElementById("blocksContainer");
        const btn = document.getElementById("previewToggle");
        if (!previewContainer || !blocksContainer || !btn) return;

        if (this.previewMode) {
            const markdown = MarkdownUtils.exportBlocks(this.workspaceBlocks);
            const html = BlockRenderer.renderSanitized(markdown);
            if (html !== null) {
                previewContainer.innerHTML = html;
            } else {
                // Never inject untrusted HTML without a sanitizer
                previewContainer.textContent = markdown;
            }
            this.renderMermaidPreview(previewContainer);
            previewContainer.style.display = "block";
            blocksContainer.style.display = "none";
            btn.textContent = "Edit";
            btn.title = "Switch to edit mode";
        } else {
            previewContainer.style.display = "none";
            blocksContainer.style.display = "block";
            btn.textContent = "Preview";
            btn.title = "Toggle preview/edit";
        }
        this.setTip(this.defaultTip);
    }

    setupResizer (resizer, panel, side) {
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        resizer.addEventListener("mousedown", (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = panel.offsetWidth;
            resizer.classList.add("resizing");
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";

            e.preventDefault();
        });

        document.addEventListener("mousemove", (e) => {
            if (!isResizing) return;

            const delta =
                side === "left" ? e.clientX - startX : startX - e.clientX;
            const newWidth = Math.max(150, Math.min(500, startWidth + delta));
            panel.style.width = newWidth + "px";
        });

        document.addEventListener("mouseup", () => {
            if (isResizing) {
                isResizing = false;
                resizer.classList.remove("resizing");
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
            }
        });
    }

    toggleTheme () {
        this.currentTheme =
            this.currentTheme === "daytime" ? "nightcore" : "daytime";
        document.body.dataset.theme = this.currentTheme;
        Storage.save("blockyMarkdownTheme", this.currentTheme);

        // Update theme button
        const themeBtn = document.getElementById("themeToggle");
        themeBtn.textContent =
            this.currentTheme === "daytime" ? "☀ Theme" : "🌙 Theme";
    }

    loadTheme () {
        const savedTheme = Storage.load("blockyMarkdownTheme");
        if (
            savedTheme &&
            (savedTheme === "daytime" || savedTheme === "nightcore")
        ) {
            this.currentTheme = savedTheme;
            document.body.dataset.theme = this.currentTheme;

            const themeBtn = document.getElementById("themeToggle");
            themeBtn.textContent =
                this.currentTheme === "daytime" ? "☀ Theme" : "🌙 Theme";
        }
    }

    setTip (text) {
        const el = document.getElementById("tipsText");
        if (el) {
            el.textContent = text || this.defaultTip;
        }
    }

    registerTip (selector, text) {
        document.querySelectorAll(selector).forEach((el) => {
            el.dataset.tipRegistered = "true";
            el.addEventListener("mouseenter", () => this.setTip(text));
            el.addEventListener("mouseleave", () =>
                this.setTip(this.defaultTip)
            );
        });
    }

    registerTipFromElements (selector) {
        document.querySelectorAll(selector).forEach((el) => {
            if (el.dataset.tipRegistered === "true") {
                return;
            }
            el.dataset.tipRegistered = "true";

            const text =
                el.title || el.getAttribute("aria-label") || el.textContent.trim();
            el.addEventListener("mouseenter", () => this.setTip(text));
            el.addEventListener("mouseleave", () =>
                this.setTip(this.defaultTip)
            );
        });
    }

    closeContentEdit () {
        this.contentEditOpen = false;
        if (this.contentEditTimer) {
            clearTimeout(this.contentEditTimer);
            this.contentEditTimer = null;
        }
    }

    // Rebuilding the outline and serializing the whole document on every
    // keystroke makes large documents lag; batch both behind a short
    // trailing debounce instead. Structural actions still save
    // synchronously, and unload flushes so the last burst is never lost.
    schedulePersist () {
        clearTimeout(this.persistTimer);
        this.persistTimer = setTimeout(() => {
            this.persistTimer = null;
            this.outlineManager.update();
            this.saveToLocalStorage();
        }, 300);
    }

    flushPersist () {
        if (this.persistTimer === null) return;
        clearTimeout(this.persistTimer);
        this.persistTimer = null;
        this.outlineManager.update();
        this.saveToLocalStorage();
    }

    snapshot () {
        return {
            workspaceBlocks: JSON.parse(JSON.stringify(this.workspaceBlocks)),
            cacheBlocks: JSON.parse(JSON.stringify(this.cacheBlocks)),
            currentBlockId: this.currentBlockId,
            collapsedHeadings: Array.from(this.collapsedHeadings),
        };
    }

    recordHistory () {
        if (this.isRestoringHistory) return;
        this.closeContentEdit();
        this.history.push(this.snapshot());
        this.trimHistory();
        this.redoStack = [];
    }

    trimHistory () {
        while (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    applyState (state) {
        this.isRestoringHistory = true;
        this.closeContentEdit();
        // Deep-copy: assigning the snapshot arrays directly would make the
        // live lists share references with the history entry, so later
        // edits would mutate stored snapshots.
        this.workspaceBlocks = JSON.parse(
            JSON.stringify(state.workspaceBlocks || [])
        );
        this.cacheBlocks = JSON.parse(
            JSON.stringify(state.cacheBlocks || [])
        );
        this.currentBlockId = state.currentBlockId || 0;
        this.collapsedHeadings = new Set(state.collapsedHeadings || []);
        // The restored blocks are new objects; close inline editors that
        // still reference the pre-restore versions.
        this.blockFactory.forcePreviewAll();
        this.renumberBlocks("workspace");
        this.renumberBlocks("cache");
        this.renderBlocks();
        this.outlineManager.update();
        this.saveToLocalStorage();
        this.isRestoringHistory = false;
    }

    undo () {
        if (this.history.length === 0) return;
        // History entries are pre-action states: the top entry is exactly
        // where this undo lands, and popping it leaves the next entry as
        // the target for the following undo. The live state (never in
        // history) goes to the redo stack so redo can return to it.
        this.redoStack.push(this.snapshot());
        const prev = this.history.pop();
        this.applyState(prev);
    }

    redo () {
        if (this.redoStack.length === 0) return;
        // Mirror undo: park the current live state as a pre-action entry
        // (before applyState replaces it), then replay the saved state.
        this.history.push(this.snapshot());
        this.trimHistory();
        const next = this.redoStack.pop();
        this.applyState(next);
    }

    getList (zone) {
        return zone === "cache" ? this.cacheBlocks : this.workspaceBlocks;
    }

    setList (zone, list) {
        if (zone === "cache") {
            this.cacheBlocks = list;
        } else {
            this.workspaceBlocks = list;
        }
    }

    // Array order is the model; index is a derived 1-based display number.
    // The sort only matters for documents saved by old versions whose
    // persisted order could disagree with their stored index values.
    renumberBlocks (zone) {
        const list = this.getList(zone);
        list.sort(
            (a, b) =>
                (a.index || list.indexOf(a) + 1) - (b.index || list.indexOf(b) + 1)
        );
        list.forEach((block, idx) => {
            block.index = idx + 1;
        });
    }

    removeBlockById (blockId) {
        let block = null;
        let zone = "workspace";
        let list = this.workspaceBlocks;
        let index = list.findIndex((b) => b.id === blockId);
        if (index !== -1) {
            block = list.splice(index, 1)[0];
        } else {
            list = this.cacheBlocks;
            index = list.findIndex((b) => b.id === blockId);
            if (index !== -1) {
                block = list.splice(index, 1)[0];
                zone = "cache";
            }
        }
        if (block) {
            this.renumberBlocks(zone);
        }
        return { block, zone };
    }

    insertBlockRelative (block, targetZone, targetBlockId, position) {
        const list = this.getList(targetZone);
        block.zone = targetZone;
        // If block already exists in list, remove to reinsert
        const existingIndex = list.findIndex((b) => b.id === block.id);
        if (existingIndex !== -1) {
            list.splice(existingIndex, 1);
        }

        let insertAt = list.length;
        if (targetBlockId !== null && targetBlockId !== undefined) {
            const targetIdx = list.findIndex((b) => b.id === targetBlockId);
            if (targetIdx !== -1) {
                insertAt = position === "after" ? targetIdx + 1 : targetIdx;
            }
        }

        list.splice(insertAt, 0, block);
        this.renumberBlocks(targetZone);
    }

    moveBlockToIndex (blockId, zone, targetIndex) {
        const exists =
            this.workspaceBlocks.some((b) => b.id === blockId) ||
            this.cacheBlocks.some((b) => b.id === blockId);
        if (!exists) {
            console.error("moveBlockToIndex: block not found", {
                blockId,
                zone,
                targetIndex,
            });
            return;
        }
        this.recordHistory();
        const { block } = this.removeBlockById(blockId);
        if (!block) {
            return;
        }
        block.zone = zone;
        const list = this.getList(zone);
        // targetIndex is 1-based (1 = top); the block itself is already
        // removed, so the insertion slot is targetIndex - 1 in the shorter
        // list.
        const insertAt = Math.max(0, Math.min(targetIndex - 1, list.length));
        list.splice(insertAt, 0, block);
        this.renumberBlocks(zone);
    }

    addBlock (type, content = "", zone = "workspace", position = -1) {
        this.recordHistory();
        const blockId = this.currentBlockId++;
        const block = {
            id: blockId,
            type: type,
            content: content,
            zone: zone,
            index: 0,
        };

        if (zone === "workspace") {
            if (position === -1) {
                block.index = this.workspaceBlocks.length + 1;
                this.workspaceBlocks.push(block);
            } else {
                const insertAt = Math.max(
                    0,
                    Math.min(position, this.workspaceBlocks.length)
                );
                this.workspaceBlocks.splice(insertAt, 0, block);
            }
            this.renumberBlocks("workspace");
        } else {
            block.index = this.cacheBlocks.length + 1;
            this.cacheBlocks.push(block);
            this.renumberBlocks("cache");
        }

        this.renderBlocks();
        this.outlineManager.update();
        this.saveToLocalStorage();
    }

    moveBlock (blockId, direction) {
        const blocks = this.workspaceBlocks;
        const index = blocks.findIndex((b) => b.id === blockId);
        if (index === -1) return;

        const targetPos = direction === "up" ? index : index + 2;
        this.moveBlockToIndex(blockId, "workspace", targetPos);
        this.renderBlocks();
        this.outlineManager.update();
        this.saveToLocalStorage();
    }

    moveBlockToCache (blockId) {
        this.dragDropManager.moveBlockToZone(blockId, "cache");
    }

    restoreFromCache (blockId) {
        this.dragDropManager.moveBlockToZone(blockId, "workspace");
    }

    permanentlyDeleteBlock (blockId) {
        this.recordHistory();
        let index = this.cacheBlocks.findIndex((b) => b.id === blockId);
        if (index !== -1) {
            this.cacheBlocks.splice(index, 1);
            this.renumberBlocks("cache");
            this.renderBlocks();
            this.saveToLocalStorage();
        }
    }

    updateBlockContent (blockId, content) {
        // Open one history entry per typing burst so content edits are
        // undoable: the pre-edit state is recorded once, then the burst is
        // kept open until input goes idle (or a structural action records
        // its own entry).
        if (!this.contentEditOpen) {
            this.recordHistory();
            this.contentEditOpen = true;
        }
        clearTimeout(this.contentEditTimer);
        this.contentEditTimer = setTimeout(() => {
            this.contentEditOpen = false;
            this.contentEditTimer = null;
        }, 3000);

        let block = this.workspaceBlocks.find((b) => b.id === blockId);
        if (!block) {
            block = this.cacheBlocks.find((b) => b.id === blockId);
        }

        if (block) {
            block.content = content;
            this.schedulePersist();
        }
    }

    getBlockById (blockId) {
        return (
            this.workspaceBlocks.find((b) => b.id === blockId) ||
            this.cacheBlocks.find((b) => b.id === blockId)
        );
    }

    renderBlocks () {
        this.renumberBlocks("workspace");
        this.renumberBlocks("cache");
        const workspaceContainer = document.getElementById("blocksContainer");
        const cacheContainer = document.getElementById("cacheContainer");

        // Drop elements whose blocks no longer exist in either zone
        const liveIds = new Set([
            ...this.workspaceBlocks.map((b) => b.id),
            ...this.cacheBlocks.map((b) => b.id),
        ]);
        for (const [id, el] of this.blockElements) {
            if (!liveIds.has(id)) {
                el.remove();
                this.blockElements.delete(id);
            }
        }

        this.renderZone("workspace", workspaceContainer);
        this.renderZone("cache", cacheContainer);
        this.updatePreviewUI();
        this.registerTipFromElements(".btn, .block-btn, .btn-add");
    }

    // Keyed render: reuse a block's element across renders (moving it into
    // place with appendChild) instead of wiping both containers. This keeps
    // drag listeners attached once and lets unchanged blocks skip work.
    renderZone (zone, container) {
        const list = this.getList(zone);
        list.forEach((block, index) => {
            let el = this.blockElements.get(block.id);
            if (!el) {
                el = this.blockFactory.createBlock(block, index, zone);
                this.blockElements.set(block.id, el);
            } else {
                this.blockFactory.refreshBlock(el, block, index, zone);
            }
            container.appendChild(el);
        });
    }

    closeAllEditModes () {
        document
            .querySelectorAll('.block[data-editing="true"]')
            .forEach((blockElement) => {
                if (blockElement.dataset.editMode === "focus") return;
                const blockId = parseInt(blockElement.dataset.blockId);
                this.blockFactory.toggleEditMode(blockId);
            });
    }

    // Import/Export
    showImportModal () {
        document.getElementById("importTextarea").value = "";
        document.getElementById("importModal").classList.add("active");
    }

    showExportModal () {
        const markdown = MarkdownUtils.exportBlocks(this.workspaceBlocks);
        document.getElementById("exportTextarea").value = markdown;
        document.getElementById("exportModal").classList.add("active");
    }

    importMarkdown () {
        const markdown = document.getElementById("importTextarea").value;
        if (!markdown.trim()) {
            alert("Please paste some markdown content");
            return;
        }

        if (this.workspaceBlocks.length > 0) {
            if (!confirm("This will replace all existing blocks. Continue?")) {
                return;
            }
        }

        this.recordHistory();

        this.workspaceBlocks = [];
        this.cacheBlocks = [];
        this.currentBlockId = 0;

        // Build all blocks in one pass; addBlock would re-render, snapshot
        // history and refresh the outline once per block
        const parsed = MarkdownUtils.parseImport(markdown);
        this.workspaceBlocks = parsed.map((blockData) => ({
            id: this.currentBlockId++,
            type: blockData.type,
            content: blockData.content,
            zone: "workspace",
            index: 0,
        }));

        // Imported ids restart at 0 and may collide with elements still in
        // the reuse map from the previous document.
        for (const el of this.blockElements.values()) {
            el.remove();
        }
        this.blockElements.clear();
        this.renumberBlocks("workspace");
        this.renderBlocks();
        this.outlineManager.update();
        this.saveToLocalStorage();
        document.getElementById("importModal").classList.remove("active");
    }

    copyToClipboard () {
        const textarea = document.getElementById("exportTextarea");
        textarea.select();
        document.execCommand("copy");

        const btn = document.getElementById("copyBtn");
        const originalText = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }

    downloadMarkdown () {
        const markdown = MarkdownUtils.exportBlocks(this.workspaceBlocks);
        const blob = new Blob([markdown], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "document.md";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Local Storage
    saveToLocalStorage () {
        Storage.save("blockyMarkdownWorkspace", this.workspaceBlocks);
        Storage.save("blockyMarkdownCache", this.cacheBlocks);
        Storage.save("blockyMarkdownCurrentId", this.currentBlockId);
        Storage.save(
            "blockyMarkdownCollapsedHeadings",
            Array.from(this.collapsedHeadings)
        );
    }

    loadFromLocalStorage () {
        const savedWorkspace = Storage.load("blockyMarkdownWorkspace");
        const savedCache = Storage.load("blockyMarkdownCache");
        const savedId = Storage.load("blockyMarkdownCurrentId");
        const savedCollapsed = Storage.load("blockyMarkdownCollapsedHeadings");

        // Older versions persisted prevId/nextId on every block; array
        // order is the model now, so shed the dead fields on load.
        const stripLinkFields = (list) => {
            list.forEach((b) => {
                delete b.prevId;
                delete b.nextId;
            });
        };

        if (savedWorkspace) {
            this.workspaceBlocks = savedWorkspace;
            stripLinkFields(this.workspaceBlocks);
            this.renumberBlocks("workspace");
        }

        if (savedCache) {
            this.cacheBlocks = savedCache;
            stripLinkFields(this.cacheBlocks);
            this.renumberBlocks("cache");
        }

        if (savedId) {
            this.currentBlockId = savedId;
        }

        if (savedCollapsed) {
            this.collapsedHeadings = new Set(savedCollapsed);
        }

        this.renderBlocks();
    }
}

// Initialize the application when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    window.blockyMarkdown = new BlockyMarkdown();
});
