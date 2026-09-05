import { useState } from "react";
import { useKit } from "../store";

export function Board() {
  const pages = useKit((s) => s.pages);
  const selected = useKit((s) => s.selected);
  const toggleSelect = useKit((s) => s.toggleSelect);
  const reorder = useKit((s) => s.reorder);
  const moveSelected = useKit((s) => s.moveSelected);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const onDragStart = (id: string, e: React.DragEvent) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const from = pages.findIndex((p) => p.id === dragId);
    const to = pages.findIndex((p) => p.id === targetId);
    if (from >= 0 && to >= 0) reorder(from, to);
    setDragId(null);
    setOverId(null);
  };

  return (
    <section className="board" data-testid="board" aria-label="Page board">
      <ul className="board-grid">
        {pages.map((p, i) => {
          const on = selected.includes(p.id);
          return (
            <li
              key={p.id}
              className={
                "card" +
                (on ? " is-on" : "") +
                (dragId === p.id ? " is-dragging" : "") +
                (overId === p.id ? " is-over" : "")
              }
              draggable
              onDragStart={(e) => onDragStart(p.id, e)}
              onDragOver={(e) => {
                e.preventDefault();
                setOverId(p.id);
              }}
              onDragLeave={() => setOverId((cur) => (cur === p.id ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                onDrop(p.id);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
            >
              <button
                type="button"
                className="card-hit"
                aria-pressed={on}
                aria-label={`Page ${i + 1} from ${p.sourceName}`}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey) toggleSelect(p.id, true);
                  else useKit.getState().selectOnly([p.id]);
                }}
              >
                <span className="card-source" style={{ background: p.sourceColor }} title={p.sourceName} />
                <span
                  className="card-thumb"
                  style={{
                    backgroundImage: p.thumbUrl ? `url(${p.thumbUrl})` : undefined,
                  }}
                />
                <span className="card-meta">
                  <span className="card-idx">{i + 1}</span>
                  <span className="card-chip" style={{ borderColor: p.sourceColor, color: p.sourceColor }}>
                    {p.pageIndex < 0 ? "Blank" : p.sourceName.replace(/\.pdf$/i, "").slice(0, 10)}
                  </span>
                  {p.rotation ? <span className="card-rot">{p.rotation}°</span> : null}
                </span>
              </button>
              <div className="card-phone-move">
                <button type="button" aria-label="Move up" onClick={() => {
                  useKit.getState().selectOnly([p.id]);
                  moveSelected(-1);
                }}>
                  ↑
                </button>
                <button type="button" aria-label="Move down" onClick={() => {
                  useKit.getState().selectOnly([p.id]);
                  moveSelected(1);
                }}>
                  ↓
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
