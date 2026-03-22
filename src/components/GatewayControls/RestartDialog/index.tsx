// src/components/GatewayControls/RestartDialog/index.tsx
// Plain modal — no @radix-ui/react-alert-dialog dependency

"use client";

interface RestartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending: boolean
}

export default function RestartDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: RestartDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
      onClick={() => onOpenChange(false)}
    >
      <div
        className="rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          Restart Gateway?
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          This will restart the OpenClaw gateway. Active connections will be briefly interrupted.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{ backgroundColor: "#ef4444", color: "#fff" }}
          >
            {isPending ? "Restarting..." : "Restart"}
          </button>
        </div>
      </div>
    </div>
  );
}