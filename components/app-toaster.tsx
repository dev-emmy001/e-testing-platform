"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      closeButton
      expand
      position="top-right"
      richColors
      toastOptions={{
        style: {
          backdropFilter: "blur(10px)",
          background: "rgb(255 255 255 / 0.94)",
          border: "1px solid rgb(196 196 216 / 0.55)",
          boxShadow: "0 14px 40px rgb(42 40 101 / 0.12)",
          color: "var(--color-gray-900)",
        },
      }}
    />
  );
}
