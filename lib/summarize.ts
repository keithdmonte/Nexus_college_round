type Change =
  | { type: "text"; value: string }
  | { type: "style"; props: Record<string, string> }
  | { type: "hide" }
  | { type: "attribute"; name: string; value: string };

// Short, readable list of what a patch changes, e.g. `color → var(--on-accent) · + data-checkout`.
export function summarize(changes: Change[]) {
  return changes
    .flatMap((c) => {
      if (c.type === "text") return [`text → "${c.value}"`];
      if (c.type === "style") return Object.entries(c.props).map(([k, v]) => `${k} → ${v}`);
      if (c.type === "hide") return ["hide"];
      return [`+ ${c.name}${c.value ? `="${c.value}"` : ""}`];
    })
    .join(" · ");
}
