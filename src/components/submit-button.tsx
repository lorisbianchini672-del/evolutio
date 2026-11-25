"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Props = {
  children: ReactNode;
  className?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  confirmMessage?: string;
  id?: string;
};

/** Bouton d'envoi qui se désactive pendant le traitement du formulaire. */
export function SubmitButton({ children, className = "btn btn-primary", formAction, confirmMessage, id }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      id={id}
      className={className}
      formAction={formAction}
      disabled={pending}
      aria-busy={pending}
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
