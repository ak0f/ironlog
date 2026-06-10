"use client";

import { useEffect, type ReactNode } from "react";
import { IconClose } from "./Icons";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  right?: ReactNode;
  children: ReactNode;
}

/** Bottom-sheet modal with grabber, matching the iOS sheet idiom. */
export function Sheet({ open, onClose, title, right, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="sheet-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="sheet">
        <div className="sheet-grabber" />
        {(title || right) && (
          <div className="sheet-header">
            <h2 className="t-title">{title}</h2>
            {right ?? (
              <button
                className="btn btn-text"
                onClick={onClose}
                aria-label="Close"
              >
                <IconClose style={{ width: 24, height: 24 }} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
