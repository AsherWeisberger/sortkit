import { useKit } from "../store";

export function Stats() {
  const pages = useKit((s) => s.pages);
  const sources = useKit((s) => s.sources);
  const selected = useKit((s) => s.selected);
  return (
    <div className="stats" data-testid="stats">
      <span>
        <strong>{pages.length}</strong> pages
      </span>
      <span className="dot" aria-hidden="true">
        ·
      </span>
      <span>
        <strong>{sources.length}</strong> sources
      </span>
      {selected.length > 0 ? (
        <>
          <span className="dot" aria-hidden="true">
            ·
          </span>
          <span>
            <strong>{selected.length}</strong> selected
          </span>
        </>
      ) : null}
    </div>
  );
}
