import { ACCEPT, useKit } from "../store";
import { Scramble } from "../kinetic/Scramble";

export function Drop() {
  const addFiles = useKit((s) => s.addFiles);
  const addSample = useKit((s) => s.addSample);
  const over = useKit((s) => s.over);
  const setOver = useKit((s) => s.setOver);

  return (
    <section
      className={"drop" + (over ? " is-over" : "")}
      onDragEnter={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void addFiles(e.dataTransfer.files);
      }}
    >
      <div className="seal" aria-hidden="true">
        <span className="seal-ring" />
        <span className="seal-ring outer" />
        <span className="seal-sort" />
      </div>
      <p className="drop-kicker">Page desk</p>
      <h1 className="drop-line">
        <Scramble text="Reorder the pages." />
      </h1>
      <p className="drop-sub">
        Organize, rotate, extract. Mix files in one board. Bytes never leave the tab.
      </p>
      <div className="drop-acts">
        <label className="btn solid">
          Pick PDFs
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
        <button type="button" className="btn ghost" onClick={() => void addSample()}>
          Try sample
        </button>
      </div>
      <p className="drop-hint">Drop · Paste · Pick</p>
    </section>
  );
}
