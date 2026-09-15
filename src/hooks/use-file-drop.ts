"use client";

import { useState, type DragEvent } from "react";

/**
 * Drag-and-drop for a file target, matched against the same MIME list `accept` already
 * filters the OS file picker with.
 *
 * Both upload targets in Foundation are styled with a dashed border — the standard
 * "drop files here" affordance — but only ever wired a click-to-browse `<input>`.
 * Dragging a logo in from Finder or Explorer, which is exactly what that styling
 * invites, silently did nothing. `accept` on an `<input type="file">` only constrains
 * the OS picker; it has no effect on a drop, so matching has to happen by hand here.
 */
export function useFileDrop({
  accept,
  onFiles,
  onRejected,
}: {
  accept: string;
  onFiles: (files: File[]) => void;
  onRejected?: (rejected: File[]) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const acceptedTypes = accept.split(",").map((t) => t.trim());
  const matches = (file: File) =>
    acceptedTypes.some((type) =>
      type.endsWith("/*") ? file.type.startsWith(type.slice(0, -1)) : file.type === type,
    );

  return {
    isDragging,
    dropProps: {
      onDragOver: (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
      },
      onDragLeave: (e: DragEvent) => {
        // A dashed-border zone can have child elements (text, icons); the drag only
        // truly leaves once the pointer moves outside all of them, not just one.
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragging(false);
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const dropped = Array.from(e.dataTransfer.files);
        const accepted = dropped.filter(matches);
        const rejected = dropped.filter((f) => !matches(f));
        if (accepted.length > 0) onFiles(accepted);
        if (rejected.length > 0) onRejected?.(rejected);
      },
    },
  };
}
