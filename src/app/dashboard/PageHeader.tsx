/**
 * Authenticated page title block. Theme/logout live in the sidebar account
 * menu (and mobile top bar) — never repeated per page.
 */
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <header>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-ink-2">{subtitle}</p> : null}
      {children}
    </header>
  );
}
