import { ACCEPT, useKit } from "../store";

export function Rail() {
  const selected = useKit((s) => s.selected);
  const pageNumbers = useKit((s) => s.pageNumbers);
  const pageNumberStart = useKit((s) => s.pageNumberStart);
  const pageNumberColor = useKit((s) => s.pageNumberColor);
  const status = useKit((s) => s.status);
  const busy = status !== "idle" && status !== "booting";
  const n = selected.length;

  return (
    <aside className="rail" data-testid="rail">
      <p className="kicker">Organize</p>
      <p className="lede tight">{n ? `${n} selected` : "Tap pages to select"}</p>

      <div className="seg">
        <button type="button" onClick={() => useKit.getState().selectAll()}>
          All
        </button>
        <button type="button" onClick={() => useKit.getState().invertSelection()}>
          Invert
        </button>
        <button type="button" onClick={() => useKit.getState().clearSelection()}>
          None
        </button>
      </div>

      <p className="kicker">Rotate</p>
      <div className="seg">
        <button type="button" disabled={busy || !n} onClick={() => void useKit.getState().rotateSelected(90)}>
          90°
        </button>
        <button type="button" disabled={busy || !n} onClick={() => void useKit.getState().rotateSelected(180)}>
          180°
        </button>
        <button type="button" disabled={busy || !n} onClick={() => void useKit.getState().rotateSelected(270)}>
          270°
        </button>
      </div>

      <div className="rail-stack">
        <button
          type="button"
          className="btn ghost full"
          disabled={busy || !n}
          onClick={() => void useKit.getState().duplicateSelected()}
        >
          Duplicate
        </button>
        <button
          type="button"
          className="btn ghost full"
          disabled={busy || !n}
          onClick={() => useKit.getState().deleteSelected()}
        >
          Delete
        </button>
        <button
          type="button"
          className="btn ghost full"
          disabled={busy}
          onClick={() => void useKit.getState().insertBlank()}
        >
          Insert blank
        </button>
      </div>

      <p className="kicker">Extract</p>
      <div className="rail-stack">
        <button
          type="button"
          className="btn ghost full"
          disabled={busy}
          onClick={() => void useKit.getState().extractZip()}
        >
          ZIP single pages
        </button>
        <button
          type="button"
          className="btn ghost full"
          disabled={busy}
          onClick={() => void useKit.getState().extractPdf()}
        >
          Extract PDF
        </button>
      </div>

      <p className="kicker">Page numbers</p>
      <label className="toggle">
        <input
          type="checkbox"
          checked={pageNumbers}
          onChange={(e) => useKit.getState().setPageNumbers(e.target.checked)}
        />
        <span>Bake footer on export</span>
      </label>
      {pageNumbers ? (
        <div className="num-row">
          <label className="field compact">
            Start
            <input
              type="number"
              min={1}
              value={pageNumberStart}
              onChange={(e) => useKit.getState().setPageNumberStart(Number(e.target.value) || 1)}
            />
          </label>
          <div className="seg">
            <button
              type="button"
              className={pageNumberColor === "ink" ? "is-on" : ""}
              onClick={() => useKit.getState().setPageNumberColor("ink")}
            >
              Ink
            </button>
            <button
              type="button"
              className={pageNumberColor === "cream" ? "is-on" : ""}
              onClick={() => useKit.getState().setPageNumberColor("cream")}
            >
              Cream
            </button>
          </div>
        </div>
      ) : null}

      <p className="kicker">Session</p>
      <div className="rail-stack">
        <button
          type="button"
          className="btn ghost full"
          onClick={() => void useKit.getState().saveCurrentSession()}
        >
          Save session
        </button>
        <button
          type="button"
          className="btn ghost full"
          onClick={() => {
            void useKit.getState().refreshSessions();
            useKit.getState().setSheet("history");
          }}
        >
          History
        </button>
      </div>

      <label className="btn ghost full add-lab" style={{ marginTop: 16 }}>
        Add PDFs
        <input
          className="sr"
          type="file"
          accept={ACCEPT}
          multiple
          onChange={(e) => {
            if (e.target.files?.length) void useKit.getState().addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      <button
        type="button"
        className="btn solid full"
        style={{ marginTop: 10 }}
        disabled={busy}
        onClick={() => void useKit.getState().exportPdf()}
      >
        Export PDF
      </button>

      <p className="keys">
        Del · R · D · ⌘A · ⌘↵
      </p>
    </aside>
  );
}
