import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "destructive";

const VARIANTS: Record<ButtonVariant, string> = {
  // Solid foreground fill, static label (never swaps while pending).
  primary:
    "bg-foreground text-background hover:opacity-90",
  secondary: "border border-solid border-line hover:bg-raised",
  destructive: "border border-solid border-line text-error hover:bg-raised",
};

/**
 * Canonical button. Labels stay static; pending is communicated by
 * disabled + reduced opacity so layout never shifts.
 */
export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-lg px-5 py-2.5 text-sm font-medium transition-opacity disabled:opacity-50 ${VARIANTS[variant]}${className ? ` ${className}` : ""}`}
    />
  );
}
