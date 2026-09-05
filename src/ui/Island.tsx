import { useKit } from "../store";
import { StatusOrb, type StatusOrbState } from "./StatusOrb";

export function Island() {
  const status = useKit((s) => s.status);
  const label = useKit((s) => s.statusLabel);
  if (status === "idle") return null;
  const state: StatusOrbState =
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
    <div className="island" role="status" aria-live="polite" data-testid="island">
      <StatusOrb label={label || "Working"} state={state} tone="dark" />
    </div>
  );
}
