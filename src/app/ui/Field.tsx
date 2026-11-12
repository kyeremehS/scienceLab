import type { ReactNode } from "react";

const CONTROL =
  "rounded-lg border border-line bg-transparent px-3 py-2 text-sm";

/**
 * Labeled field wrapper: label + control + helper + single assertive error.
 * The control itself is passed as children (input, textarea, select).
 */
export function Field({
  label,
  htmlFor,
  helper,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  helper?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {helper ? <p className="text-xs text-ink-3">{helper}</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`${CONTROL}${props.className ? ` ${props.className}` : ""}`}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${CONTROL}${props.className ? ` ${props.className}` : ""}`}
    />
  );
}
