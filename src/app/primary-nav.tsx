"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Secondary destinations live behind a disclosure so the desktop header stays
 * quiet. On small screens the burger menu still shows every destination in one
 * flat list, so the panel is rendered inline there (see globals.css).
 */
export default function NavMore({
  label = "More",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    const onPointer = (event: MouseEvent) => {
      if (wrap.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div className="nav-more" ref={wrap}>
      <button
        ref={trigger}
        type="button"
        className="nav-more-toggle"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        {label} <span aria-hidden="true">▾</span>
      </button>
      <div
        className={`nav-more-panel${open ? " open" : ""}`}
        onClick={() => setOpen(false)}
      >
        {children}
      </div>
    </div>
  );
}
