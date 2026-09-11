"use client";
import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

/** Records campaign attribution once, on the visitor's first page view. */
export function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
