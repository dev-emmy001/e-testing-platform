"use client";

import { useEffect } from "react";
import { toast } from "sonner";

type FlashToastProps = {
  error?: string | null;
  message?: string | null;
};

export function FlashToast({ error, message }: FlashToastProps) {
  useEffect(() => {
    const text = error ?? message;

    if (!text) {
      return;
    }

    const toastId = error ? `flash-error:${text}` : `flash-message:${text}`;

    if (error) {
      toast.error(text, { id: toastId });
    } else {
      toast.success(text, { id: toastId });
    }

    void fetch("/api/flash", {
      cache: "no-store",
      keepalive: true,
      method: "POST",
    }).catch(() => {});
  }, [error, message]);

  return null;
}
