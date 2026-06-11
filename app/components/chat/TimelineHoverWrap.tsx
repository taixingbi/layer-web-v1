"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type Props = {
  children: ReactNode;
  popover: ReactNode;
  enabled: boolean;
};

function computePopoverStyle(anchor: DOMRect): CSSProperties {
  const gap = 8;
  const margin = 8;
  const maxWidth = Math.min(352, window.innerWidth - margin * 2);
  const estHeight = 168;
  const spaceBelow = window.innerHeight - anchor.bottom;
  const spaceAbove = anchor.top;
  const placeAbove = spaceBelow < estHeight && spaceAbove > spaceBelow;
  const left = Math.min(Math.max(margin, anchor.left), window.innerWidth - maxWidth - margin);

  if (placeAbove) {
    return {
      position: "fixed",
      left,
      top: anchor.top - gap,
      transform: "translateY(-100%)",
      zIndex: 1000,
      maxWidth,
    };
  }

  return {
    position: "fixed",
    left,
    top: anchor.bottom + gap,
    zIndex: 1000,
    maxWidth,
  };
}

export function TimelineHoverWrap({ children, popover, enabled }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});

  const updatePosition = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    setStyle(computePopoverStyle(el.getBoundingClientRect()));
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const onEnter = () => {
    if (!enabled) return;
    updatePosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updatePosition]);

  return (
    <>
      <div
        ref={wrapRef}
        className={`chat-latency-hover-wrap${open ? " is-hover-open" : ""}`}
        onMouseEnter={onEnter}
        onMouseLeave={close}
      >
        {children}
      </div>
      {open && enabled && typeof document !== "undefined"
        ? createPortal(
            <div
              className="chat-latency-hover-popover is-portaled"
              style={style}
              role="tooltip"
            >
              {popover}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
