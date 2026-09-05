import { useEffect, useState } from "react";

const GLYPHS = "SORTKIT·PAGE—REORDER";

export function Scramble({ text, className = "" }: { text: string; className?: string }) {
  const [shown, setShown] = useState(text);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setShown(text);
      return;
    }
    let frame = 0;
    const total = 16;
    let raf = 0;
    const tick = () => {
      frame++;
      if (frame >= total) {
        setShown(text);
        return;
      }
      const cut = Math.floor((frame / total) * text.length);
      const out = text
        .split("")
        .map((ch, i) => {
          if (i < cut || ch === " " || ch === ".") return ch;
          return GLYPHS[(Math.random() * GLYPHS.length) | 0];
        })
        .join("");
      setShown(out);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text]);
  return <span className={className}>{shown}</span>;
}
