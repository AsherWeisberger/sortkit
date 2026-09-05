import { useEffect } from "react";
import { useKit } from "./store";
import { Desk } from "./ui/Desk";

export function App() {
  const boot = useKit((s) => s.boot);

  useEffect(() => {
    let alive = true;
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        if (alive) void boot();
      }, 0);
    });
    return () => {
      alive = false;
    };
  }, [boot]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files || []);
      const hits = files.filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
      if (hits.length) void useKit.getState().addFiles(hits);
    };
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (typing) return;
      const s = useKit.getState();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void s.exportPdf();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        s.selectAll();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        s.deleteSelected();
        return;
      }
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        void s.rotateSelected(90);
        return;
      }
      if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        void s.duplicateSelected();
        return;
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        s.moveSelected(-1);
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        s.moveSelected(1);
        return;
      }
    };
    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKey);

    const posts: string[] = [];
    (window as Window).__kit = {
      get pages() {
        return useKit.getState().pages.length;
      },
      get selected() {
        return useKit.getState().selected.slice();
      },
      rotate: (deg = 90) => useKit.getState().rotateSelected(deg),
      duplicate: () => useKit.getState().duplicateSelected(),
      delete: () => useKit.getState().deleteSelected(),
      blank: () => useKit.getState().insertBlank(),
      extractZip: () => useKit.getState().extractZip(),
      exportPdf: () => useKit.getState().exportPdf(),
      loadSample: () => useKit.getState().addSample(),
      getState: () => useKit.getState(),
      posts,
      reorder: (from, to) => useKit.getState().reorder(from, to),
      selectAll: () => useKit.getState().selectAll(),
      invert: () => useKit.getState().invertSelection(),
      setPageNumbers: (v) => useKit.getState().setPageNumbers(v),
      saveSession: (name) => useKit.getState().saveCurrentSession(name),
      recallSession: (id) => useKit.getState().recallSession(id),
      listSessions: () => useKit.getState().refreshSessions().then(() => useKit.getState().sessions),
      moveSelected: (dir) => useKit.getState().moveSelected(dir),
      select: (ids) => useKit.getState().selectOnly(ids),
    };

    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return <Desk />;
}
