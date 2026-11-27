"use client";

import { useEffect } from "react";

/** Marks the visitor's own platform panel; the page is complete without it. */
export function OsPick() {
  useEffect(() => {
    const ua = navigator.userAgent;
    const os = /Windows/i.test(ua) ? "windows" : /Mac OS X|Macintosh/i.test(ua) && !/iPhone|iPad/i.test(ua) ? "mac" : null;
    if (!os) return;
    document.querySelector(`[data-os="${os}"]`)?.setAttribute("data-yours", "");
  }, []);
  return null;
}
