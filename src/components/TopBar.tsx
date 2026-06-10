"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { IconChevron } from "./Icons";
import { useI18n } from "./AppProvider";

interface Props {
  title: string;
  back?: boolean;
  large?: boolean;
  right?: ReactNode;
}

/** Sticky frosted top bar. `large` renders the iOS large-title style below. */
export function TopBar({ title, back, large, right }: Props) {
  const router = useRouter();
  const t = useI18n();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className={`topbar${scrolled ? " topbar-scrolled" : ""}`}>
        <div className="topbar-inner">
          <div className="row gap-xs" style={{ flex: 1, minWidth: 0 }}>
            {back && (
              <button
                className="btn btn-text"
                onClick={() => router.back()}
                aria-label="Back"
                style={{ marginLeft: -8, paddingRight: 8 }}
              >
                <IconChevron
                  style={{ transform: "rotate(180deg)", width: 22, height: 22 }}
                />
                <span style={{ fontSize: 17 }}>{t.common.back}</span>
              </button>
            )}
            {!large && <span className="topbar-title">{title}</span>}
          </div>
          {right && <div className="row gap-xs">{right}</div>}
        </div>
      </header>
      {large && (
        <div className="page" style={{ paddingTop: 8, paddingBottom: 4 }}>
          <h1 className="t-hero">{title}</h1>
        </div>
      )}
    </>
  );
}
