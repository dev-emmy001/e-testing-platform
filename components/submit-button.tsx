"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = ComponentProps<"button"> & {
  pendingLabel?: string;
  children: ReactNode;
};

export function SubmitButton({
  children,
  className,
  disabled,
  pendingLabel = "Working...",
  type = "submit",
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      type={type}
      disabled={disabled || pending}
      className={[className, "disabled:cursor-not-allowed disabled:opacity-60"]
        .filter(Boolean)
        .join(" ")}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
