type Status = "draft" | "published" | "retired" | "broken" | "live";

const STATUS_STYLES: Record<Status, { color: string; bg: string; border: string; label: string }> = {
  draft: {
    color: "var(--status-draft)",
    bg: "var(--status-draft-bg)",
    border: "var(--status-draft-border)",
    label: "Draft",
  },
  published: {
    color: "var(--status-published)",
    bg: "var(--status-published-bg)",
    border: "var(--status-published-border)",
    label: "Published",
  },
  live: {
    color: "var(--status-live)",
    bg: "var(--status-live-bg)",
    border: "var(--status-live-border)",
    label: "Live",
  },
  retired: {
    color: "var(--status-retired)",
    bg: "var(--status-retired-bg)",
    border: "var(--status-retired-border)",
    label: "Retired",
  },
  broken: {
    color: "var(--status-broken)",
    bg: "var(--status-broken-bg)",
    border: "var(--status-broken-border)",
    label: "Broken",
  },
};

export default function StatusBadge({
  status,
  label,
  className = "",
}: {
  status: Status;
  label?: string;
  className?: string;
}) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5 ${className}`}
      style={{
        color: s.color,
        backgroundColor: s.bg,
        border: `1px solid ${s.border}`,
      }}
    >
      {label ?? s.label}
    </span>
  );
}
