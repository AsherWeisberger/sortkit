import { create } from "zustand";
import {
  blankThumbUrl,
  getPageCount,
  initPdfjs,
  renderPageThumb,
  yieldPaint,
} from "./engine/pdf";
import { rebuildPdf, rebuildSinglePage } from "./engine/rebuild";
import {
  decodePayload,
  deleteSession,
  encodePayload,
  getSession,
  listSessions,
  saveSession,
} from "./engine/history";
import { zipBlobs } from "./engine/zip";
import {
  SOURCE_COLORS,
  type PageModel,
  type SessionRow,
  type Sheet,
  type SourceFile,
  type Status,
} from "./types";

export const ACCEPT = "application/pdf,.pdf";

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 2500);
}

let toastTimer = 0;
function ping(set: (p: Partial<Kit>) => void, msg: string) {
  window.clearTimeout(toastTimer);
  set({ toast: msg });
  toastTimer = window.setTimeout(() => set({ toast: "" }), 2400);
}

type Kit = {
  ready: boolean;
  status: Status;
  statusLabel: string;
  toast: string;
  sheet: Sheet;
  sources: SourceFile[];
  pages: PageModel[];
  selected: string[];
  over: boolean;
  pageNumbers: boolean;
  pageNumberStart: number;
  pageNumberColor: "cream" | "ink";
  sessions: SessionRow[];
  colorIdx: number;
  boot: () => Promise<void>;
  addFiles: (files: FileList | File[]) => Promise<void>;
  addSample: () => Promise<void>;
  setOver: (v: boolean) => void;
  setSheet: (s: Sheet) => void;
  toggleSelect: (id: string, additive?: boolean) => void;
  selectAll: () => void;
  invertSelection: () => void;
  clearSelection: () => void;
  selectOnly: (ids: string[]) => void;
  reorder: (from: number, to: number) => void;
  moveSelected: (dir: -1 | 1) => void;
  rotateSelected: (deg?: number) => Promise<void>;
  duplicateSelected: () => Promise<void>;
  deleteSelected: () => void;
  insertBlank: () => Promise<void>;
  setPageNumbers: (v: boolean) => void;
  setPageNumberStart: (n: number) => void;
  setPageNumberColor: (c: "cream" | "ink") => void;
  exportPdf: () => Promise<Blob | void>;
  extractZip: () => Promise<void>;
  extractPdf: () => Promise<void>;
  clear: () => void;
  refreshSessions: () => Promise<void>;
  saveCurrentSession: (name?: string) => Promise<void>;
  recallSession: (id: string) => Promise<void>;
  removeSession: (id: string) => Promise<void>;
  renderThumbs: (ids?: string[]) => Promise<void>;
};

async function thumbFor(page: PageModel, sources: SourceFile[]): Promise<string> {
  if (page.pageIndex < 0) return blankThumbUrl();
  const src = sources.find((s) => s.id === page.sourceId);
  if (!src) return blankThumbUrl();
  const r = await renderPageThumb(src.bytes, page.pageIndex + 1, 160, page.rotation);
  return r.url;
}

export const useKit = create<Kit>((set, get) => ({
  ready: false,
  status: "booting",
  statusLabel: "Warming the desk",
  toast: "",
  sheet: "none",
  sources: [],
  pages: [],
  selected: [],
  over: false,
  pageNumbers: false,
  pageNumberStart: 1,
  pageNumberColor: "ink",
  sessions: [],
  colorIdx: 0,

  boot: async () => {
    set({ status: "booting", statusLabel: "Warming the desk" });
    try {
      initPdfjs();
    } catch {
      /* ok */
    }
    try {
      const sessions = await listSessions();
      set({ sessions });
    } catch {
      /* idb optional */
    }
    set({ ready: true, status: "idle", statusLabel: "" });
  },

  addFiles: async (list) => {
    const incoming = Array.from(list).filter(
      (f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name),
    );
    if (!incoming.length) {
      ping(set, "Drop a PDF");
      return;
    }
    set({
      status: "reading",
      statusLabel: incoming.length > 1 ? `Reading ${incoming.length}` : "Reading PDF",
      over: false,
    });
    const { sources, pages, colorIdx } = get();
    const nextSources = [...sources];
    const nextPages = [...pages];
    let ci = colorIdx;
    const newIds: string[] = [];

    for (const file of incoming) {
      const buf = new Uint8Array(await file.arrayBuffer());
      let count = 1;
      try {
        count = await getPageCount(buf);
      } catch {
        ping(set, `Could not read ${file.name}`);
        continue;
      }
      const sid = uid();
      const color = SOURCE_COLORS[ci % SOURCE_COLORS.length];
      ci++;
      const name = file.name || "document.pdf";
      nextSources.push({ id: sid, name, color, bytes: buf, pageCount: count });
      for (let i = 0; i < count; i++) {
        const id = uid();
        newIds.push(id);
        nextPages.push({
          id,
          sourceId: sid,
          sourceName: name,
          sourceColor: color,
          pageIndex: i,
          rotation: 0,
        });
      }
    }

    set({
      sources: nextSources,
      pages: nextPages,
      colorIdx: ci,
      selected: newIds.length ? [newIds[0]] : get().selected,
      status: "rendering",
      statusLabel: "Rendering pages",
    });
    await get().renderThumbs(newIds);
    set({ status: "idle", statusLabel: "" });
    ping(set, nextPages.length === pages.length ? "Ready" : `${nextPages.length} pages`);
  },

  addSample: async () => {
    set({ status: "reading", statusLabel: "Loading sample" });
    try {
      const base = document.baseURI;
      const urls = [
        new URL("sample/report.pdf", base).toString(),
        new URL("sample/invoice.pdf", base).toString(),
      ];
      const files: File[] = [];
      for (const u of urls) {
        const res = await fetch(u);
        if (!res.ok) throw new Error("sample");
        const blob = await res.blob();
        const name = u.split("/").pop() || "sample.pdf";
        files.push(new File([blob], name, { type: "application/pdf" }));
      }
      await get().addFiles(files);
    } catch {
      set({ status: "idle", statusLabel: "" });
      ping(set, "Could not load sample");
    }
  },

  setOver: (v) => set({ over: v }),
  setSheet: (sheet) => set({ sheet }),

  toggleSelect: (id, additive = true) => {
    set((s) => {
      if (!additive) return { selected: [id] };
      const has = s.selected.includes(id);
      return { selected: has ? s.selected.filter((x) => x !== id) : [...s.selected, id] };
    });
  },

  selectAll: () => set((s) => ({ selected: s.pages.map((p) => p.id) })),
  invertSelection: () =>
    set((s) => ({
      selected: s.pages.filter((p) => !s.selected.includes(p.id)).map((p) => p.id),
    })),
  clearSelection: () => set({ selected: [] }),
  selectOnly: (ids) => set({ selected: ids }),

  reorder: (from, to) => {
    if (from === to || from < 0 || to < 0) return;
    set((s) => {
      const pages = [...s.pages];
      if (from >= pages.length || to >= pages.length) return s;
      const [item] = pages.splice(from, 1);
      pages.splice(to, 0, item);
      return { pages };
    });
  },

  moveSelected: (dir) => {
    const { pages, selected } = get();
    if (!selected.length) return;
    const indices = pages
      .map((p, i) => (selected.includes(p.id) ? i : -1))
      .filter((i) => i >= 0)
      .sort((a, b) => a - b);
    if (dir < 0) {
      if (indices[0] === 0) return;
      const next = [...pages];
      for (const i of indices) {
        const tmp = next[i - 1];
        next[i - 1] = next[i];
        next[i] = tmp;
      }
      set({ pages: next });
    } else {
      if (indices[indices.length - 1] === pages.length - 1) return;
      const next = [...pages];
      for (let k = indices.length - 1; k >= 0; k--) {
        const i = indices[k];
        const tmp = next[i + 1];
        next[i + 1] = next[i];
        next[i] = tmp;
      }
      set({ pages: next });
    }
  },

  rotateSelected: async (deg = 90) => {
    const { selected, pages, sources } = get();
    if (!selected.length) {
      ping(set, "Select a page");
      return;
    }
    const setIds = new Set(selected);
    const next = pages.map((p) =>
      setIds.has(p.id) ? { ...p, rotation: (((p.rotation + deg) % 360) + 360) % 360 } : p,
    );
    set({ pages: next, status: "rendering", statusLabel: "Rotating" });
    const ids = selected.slice();
    for (const id of ids) {
      const p = next.find((x) => x.id === id);
      if (!p) continue;
      try {
        const url = await thumbFor(p, sources);
        set((s) => ({
          pages: s.pages.map((x) => (x.id === id ? { ...x, thumbUrl: url } : x)),
        }));
      } catch {
        /* keep old thumb */
      }
      await yieldPaint();
    }
    set({ status: "idle", statusLabel: "" });
    ping(set, `Rotated ${selected.length}`);
  },

  duplicateSelected: async () => {
    const { selected, pages, sources } = get();
    if (!selected.length) {
      ping(set, "Select a page");
      return;
    }
    const next = [...pages];
    const newIds: string[] = [];
    // Insert duplicates after each selected, walking from end so indices stay stable
    const indices = pages
      .map((p, i) => (selected.includes(p.id) ? i : -1))
      .filter((i) => i >= 0)
      .sort((a, b) => b - a);
    for (const i of indices) {
      const src = pages[i];
      const id = uid();
      newIds.push(id);
      next.splice(i + 1, 0, { ...src, id, thumbUrl: src.thumbUrl });
    }
    set({ pages: next, selected: newIds, status: "rendering", statusLabel: "Duplicating" });
    for (const id of newIds) {
      const p = next.find((x) => x.id === id);
      if (!p) continue;
      try {
        const url = await thumbFor(p, sources);
        set((s) => ({
          pages: s.pages.map((x) => (x.id === id ? { ...x, thumbUrl: url } : x)),
        }));
      } catch {
        /* */
      }
    }
    set({ status: "idle", statusLabel: "" });
    ping(set, `Duplicated ${newIds.length}`);
  },

  deleteSelected: () => {
    const { selected, pages } = get();
    if (!selected.length) {
      ping(set, "Select a page");
      return;
    }
    const setIds = new Set(selected);
    const next = pages.filter((p) => !setIds.has(p.id));
    set({ pages: next, selected: next[0] ? [next[0].id] : [] });
    ping(set, `Deleted ${selected.length}`);
  },

  insertBlank: async () => {
    const { pages, selected } = get();
    const id = uid();
    const blank: PageModel = {
      id,
      sourceId: "__blank__",
      sourceName: "Blank",
      sourceColor: "#575860",
      pageIndex: -1,
      rotation: 0,
      blankW: 612,
      blankH: 792,
      thumbUrl: blankThumbUrl(),
    };
    const next = [...pages];
    let insertAt = next.length;
    if (selected.length) {
      const lastSel = Math.max(
        ...selected.map((sid) => next.findIndex((p) => p.id === sid)).filter((i) => i >= 0),
      );
      if (lastSel >= 0) insertAt = lastSel + 1;
    }
    next.splice(insertAt, 0, blank);
    set({ pages: next, selected: [id] });
    ping(set, "Blank page inserted");
  },

  setPageNumbers: (v) => set({ pageNumbers: v }),
  setPageNumberStart: (n) => set({ pageNumberStart: Math.max(1, n | 0) }),
  setPageNumberColor: (c) => set({ pageNumberColor: c }),

  exportPdf: async () => {
    const { pages, sources, pageNumbers, pageNumberStart, pageNumberColor } = get();
    if (!pages.length) {
      ping(set, "Add pages first");
      return;
    }
    set({ status: "exporting", statusLabel: "Building PDF" });
    try {
      const bytes = await rebuildPdf(pages, sources, {
        pageNumbers,
        pageNumberStart,
        pageNumberColor,
      });
      const blob = new Blob([bytes], { type: "application/pdf" });
      downloadBlob(blob, "sortkit-organized.pdf");
      set({ status: "idle", statusLabel: "" });
      ping(set, "PDF downloaded");
      return blob;
    } catch (e) {
      console.error(e);
      set({ status: "idle", statusLabel: "" });
      ping(set, "Export failed");
    }
  },

  extractZip: async () => {
    const { pages, sources, selected, pageNumbers, pageNumberStart, pageNumberColor } = get();
    const targets = selected.length
      ? pages.filter((p) => selected.includes(p.id))
      : pages;
    if (!targets.length) {
      ping(set, "Nothing to extract");
      return;
    }
    set({ status: "zipping", statusLabel: `Extracting ${targets.length}` });
    try {
      const entries: { name: string; blob: Uint8Array }[] = [];
      for (let i = 0; i < targets.length; i++) {
        const bytes = await rebuildSinglePage(targets[i], sources, {
          pageNumbers,
          pageNumberStart: pageNumberStart + i,
          pageNumberColor,
        });
        entries.push({ name: `page-${String(i + 1).padStart(3, "0")}.pdf`, blob: bytes });
        set({ statusLabel: `Extracting ${i + 1}/${targets.length}` });
      }
      const zip = await zipBlobs(entries);
      downloadBlob(zip, "sortkit-extract.zip");
      set({ status: "idle", statusLabel: "" });
      ping(set, "ZIP ready");
    } catch (e) {
      console.error(e);
      set({ status: "idle", statusLabel: "" });
      ping(set, "Extract failed");
    }
  },

  extractPdf: async () => {
    const { pages, sources, selected, pageNumbers, pageNumberStart, pageNumberColor } = get();
    const targets = selected.length
      ? pages.filter((p) => selected.includes(p.id))
      : pages;
    if (!targets.length) {
      ping(set, "Nothing to extract");
      return;
    }
    set({ status: "exporting", statusLabel: "Extracting PDF" });
    try {
      const bytes = await rebuildPdf(targets, sources, {
        pageNumbers,
        pageNumberStart,
        pageNumberColor,
      });
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "sortkit-extract.pdf");
      set({ status: "idle", statusLabel: "" });
      ping(set, "Extract PDF ready");
    } catch (e) {
      console.error(e);
      set({ status: "idle", statusLabel: "" });
      ping(set, "Extract failed");
    }
  },

  clear: () => {
    set({
      sources: [],
      pages: [],
      selected: [],
      status: "idle",
      statusLabel: "",
      sheet: "none",
    });
  },

  refreshSessions: async () => {
    try {
      set({ sessions: await listSessions() });
    } catch {
      /* */
    }
  },

  saveCurrentSession: async (name) => {
    const { pages, sources } = get();
    if (!pages.length) {
      ping(set, "Nothing to save");
      return;
    }
    try {
      const row: SessionRow = {
        id: uid(),
        name: name || `Session · ${pages.length}p`,
        pageCount: pages.length,
        sourceCount: sources.length,
        created: Date.now(),
        payload: encodePayload(sources, pages),
      };
      await saveSession(row);
      set((s) => ({ sessions: [row, ...s.sessions.filter((x) => x.id !== row.id)] }));
      ping(set, "Session saved");
    } catch {
      ping(set, "Could not save session");
    }
  },

  recallSession: async (id) => {
    set({ status: "reading", statusLabel: "Recalling session" });
    try {
      const row = await getSession(id);
      if (!row) throw new Error("missing");
      const { sources, pages } = decodePayload(row.payload);
      set({
        sources,
        pages,
        selected: pages[0] ? [pages[0].id] : [],
        status: "rendering",
        statusLabel: "Rendering pages",
      });
      await get().renderThumbs();
      set({ status: "idle", statusLabel: "", sheet: "none" });
      ping(set, `Restored “${row.name}”`);
    } catch {
      set({ status: "idle", statusLabel: "" });
      ping(set, "Recall failed");
    }
  },

  removeSession: async (id) => {
    try {
      await deleteSession(id);
      set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) }));
      ping(set, "Session deleted");
    } catch {
      ping(set, "Delete failed");
    }
  },

  renderThumbs: async (ids) => {
    const { pages, sources } = get();
    const targets = ids ? pages.filter((p) => ids.includes(p.id)) : pages;
    for (let i = 0; i < targets.length; i++) {
      const p = targets[i];
      try {
        const url = await thumbFor(p, sources);
        set((s) => ({
          pages: s.pages.map((x) => (x.id === p.id ? { ...x, thumbUrl: url } : x)),
        }));
      } catch {
        /* skip */
      }
      if (i % 2 === 1) await yieldPaint();
    }
  },
}));
