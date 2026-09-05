import { ACCEPT, useKit } from "../store";
import { Board } from "./Board";
import { Drop } from "./Drop";
import { Island } from "./Island";
import { Rail } from "./Rail";
import { Stats } from "./Stats";
import { StatusOrb } from "./StatusOrb";

export function Desk() {
  const pages = useKit((s) => s.pages);
  const status = useKit((s) => s.status);
  const statusLabel = useKit((s) => s.statusLabel);
  const toast = useKit((s) => s.toast);
  const sheet = useKit((s) => s.sheet);
  const setSheet = useKit((s) => s.setSheet);
  const sessions = useKit((s) => s.sessions);
  const addFiles = useKit((s) => s.addFiles);
  const clear = useKit((s) => s.clear);
  const setOver = useKit((s) => s.setOver);
  const empty = pages.length === 0;
  const busy = status !== "idle" && status !== "booting";

  const orbState =
    status === "booting"
      ? "connecting"
      : status === "reading"
        ? "searching"
        : status === "rendering"
          ? "shaping"
          : status === "exporting" || status === "zipping"
            ? "composing"
            : "working";

  return (
    <div
      className={"press" + (empty ? " is-empty" : "")}
      onDragEnter={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void addFiles(e.dataTransfer.files);
      }}
    >
      <Island />

      <header className="mast">
        <div className="brand">
          <span className="mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <div>
            <p className="word">Sortkit</p>
            <p className="byline">
              Made by Asher Weisberger ·{" "}
              <a href="https://x.com/AsherWeisberger" rel="noopener noreferrer">
                @AsherWeisberger
              </a>
            </p>
          </div>
        </div>
        {status !== "idle" ? (
          <StatusOrb
            className="orb-desk-only"
            label={statusLabel || "Working"}
            state={orbState as never}
            tone="dark"
          />
        ) : (
          <p className="hint desk-only">Reorder the pages. Files stay here.</p>
        )}
        <div className="mast-acts desk-only">
          {!empty ? (
            <>
              <label className="text-btn add-lab">
                Add
                <input
                  className="sr"
                  type="file"
                  accept={ACCEPT}
                  multiple
                  onChange={(e) => {
                    if (e.target.files?.length) void addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              <button type="button" className="text-btn" onClick={clear}>
                Clear
              </button>
            </>
          ) : null}
        </div>
      </header>

      {empty ? (
        <Drop />
      ) : (
        <>
          <div className="work">
            <div className="work-top">
              <Stats />
            </div>
            <Board />
          </div>
          <Rail />
        </>
      )}

      {!empty ? (
        <nav className="dock" aria-label="Actions" data-testid="dock">
          <label className="dock-btn">
            Add
            <input
              className="sr"
              type="file"
              accept={ACCEPT}
              multiple
              onChange={(e) => {
                if (e.target.files?.length) void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            className="dock-btn"
            disabled={busy}
            onClick={() => void useKit.getState().rotateSelected(90)}
          >
            Rotate
          </button>
          <button
            type="button"
            className="dock-btn"
            disabled={busy}
            onClick={() => useKit.getState().deleteSelected()}
          >
            Delete
          </button>
          <button
            type="button"
            className="dock-btn"
            onClick={() => setSheet(sheet === "more" ? "none" : "more")}
          >
            More
          </button>
          <button
            type="button"
            className="dock-btn solid"
            disabled={busy}
            onClick={() => void useKit.getState().exportPdf()}
          >
            Export
          </button>
        </nav>
      ) : null}

      {sheet === "more" && !empty ? (
        <div className="sheet" role="dialog" aria-label="More actions">
          <div className="sheet-head">
            <p>More</p>
            <button type="button" className="text-btn" onClick={() => setSheet("none")}>
              Close
            </button>
          </div>
          <div className="sheet-body sheet-actions">
            <button type="button" className="btn ghost full" onClick={() => void useKit.getState().duplicateSelected()}>
              Duplicate
            </button>
            <button type="button" className="btn ghost full" onClick={() => void useKit.getState().insertBlank()}>
              Insert blank
            </button>
            <button type="button" className="btn ghost full" onClick={() => void useKit.getState().extractZip()}>
              ZIP extract
            </button>
            <button type="button" className="btn ghost full" onClick={() => void useKit.getState().extractPdf()}>
              Extract PDF
            </button>
            <button
              type="button"
              className="btn ghost full"
              onClick={() => useKit.getState().setPageNumbers(!useKit.getState().pageNumbers)}
            >
              Toggle page numbers
            </button>
            <button
              type="button"
              className="btn ghost full"
              onClick={() => {
                void useKit.getState().refreshSessions();
                setSheet("history");
              }}
            >
              History
            </button>
            <button type="button" className="btn ghost full" onClick={() => void useKit.getState().saveCurrentSession()}>
              Save session
            </button>
            <button type="button" className="btn ghost full" onClick={() => useKit.getState().selectAll()}>
              Select all
            </button>
            <button type="button" className="btn ghost full" onClick={clear}>
              Clear board
            </button>
          </div>
        </div>
      ) : null}

      {sheet === "history" ? (
        <div className="sheet" role="dialog" aria-label="History">
          <div className="sheet-head">
            <p>Recent sessions</p>
            <button type="button" className="text-btn" onClick={() => setSheet("none")}>
              Close
            </button>
          </div>
          <div className="sheet-body">
            {sessions.length === 0 ? (
              <p className="lede">No saved sessions yet.</p>
            ) : (
              <ul className="hist-list">
                {sessions.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className="hist-item"
                      onClick={() => void useKit.getState().recallSession(row.id)}
                    >
                      <span className="hist-name">{row.name}</span>
                      <span className="hist-meta">
                        {row.pageCount}p · {row.sourceCount} sources
                      </span>
                    </button>
                    <button
                      type="button"
                      className="text-btn"
                      onClick={() => void useKit.getState().removeSession(row.id)}
                    >
                      Del
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      <p className="credit-phone">
        Made by Asher Weisberger ·{" "}
        <a href="https://x.com/AsherWeisberger" rel="noopener noreferrer">
          @AsherWeisberger
        </a>
      </p>

      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
