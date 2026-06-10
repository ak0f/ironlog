"use client";
import { Sheet } from "./Sheet";
import { useI18n } from "./AppProvider";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export function ConfirmSheet({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = true,
}: Props) {
  const t = useI18n();
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="col gap-md">
        {message && (
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.5 }}>
            {message}
          </p>
        )}
        <div className="row gap-sm">
          <button className="btn btn-ghost grow" onClick={onClose}>
            {cancelLabel ?? t.confirmSheet.cancel}
          </button>
          <button
            className={`btn grow ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel ?? (danger ? t.confirmSheet.delete : t.confirmSheet.confirm)}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
