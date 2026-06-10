"use client";

/**
 * Floating rest timer. Triggered when a set is marked done; counts down from a
 * preset, can be extended in 15s steps, and pulses + vibrates at zero. Glassy
 * pill that sits above the tab bar — designed for one-handed gym use.
 */
import { useEffect, useRef, useState } from "react";
import { IconClose, IconPlus } from "./Icons";

interface Props {
  /** Increment this to (re)start the timer at `preset` seconds. */
  trigger: number;
  preset?: number;
}

export function RestTimer({ trigger, preset = 90 }: Props) {
  const [remaining, setRemaining] = useState(0);
  const [active, setActive] = useState(false);
  const endRef = useRef(0);
  const doneRef = useRef(false);

  // (Re)start when trigger changes.
  useEffect(() => {
    if (trigger === 0) return;
    endRef.current = Date.now() + preset * 1000;
    doneRef.current = false;
    setRemaining(preset);
    setActive(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const left = Math.round((endRef.current - Date.now()) / 1000);
      setRemaining(left);
      if (left <= 0 && !doneRef.current) {
        doneRef.current = true;
        if ("vibrate" in navigator) navigator.vibrate?.([120, 60, 120]);
      }
    }, 250);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;

  const overdue = remaining <= 0;
  const mm = Math.floor(Math.abs(remaining) / 60);
  const ss = String(Math.abs(remaining) % 60).padStart(2, "0");

  function extend(sec: number) {
    endRef.current = Math.max(Date.now(), endRef.current) + sec * 1000;
    doneRef.current = false;
    setRemaining(Math.round((endRef.current - Date.now()) / 1000));
  }

  return (
    <div className={`rest-timer${overdue ? " rest-timer-done" : ""}`} role="timer">
      <button
        className="rest-timer-x"
        onClick={() => setActive(false)}
        aria-label="Dismiss timer"
      >
        <IconClose style={{ width: 16, height: 16 }} />
      </button>
      <div className="rest-timer-label">{overdue ? "Rest over" : "Rest"}</div>
      <div className="rest-timer-time tnum">
        {overdue ? "+" : ""}
        {mm}:{ss}
      </div>
      <button className="rest-timer-add" onClick={() => extend(15)} aria-label="Add 15 seconds">
        <IconPlus style={{ width: 16, height: 16 }} />
        15s
      </button>
    </div>
  );
}
