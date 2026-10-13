"use client";

import type { ReactNode } from "react";

// A submit button that asks "Are you sure?" first. Without JavaScript it
// submits straight away, like a normal button.
export function ConfirmButton({
  question,
  name,
  value,
  className,
  children,
}: {
  question: string;
  name?: string;
  value?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      name={name}
      value={value}
      className={className}
      onClick={(event) => {
        if (!window.confirm(question)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
