interface ViewerEmptyStateProps {
  title: string;
  lines: readonly string[];
}

export function ViewerEmptyState({ title, lines }: ViewerEmptyStateProps) {
  return (
    <div className="grid h-full place-content-center px-6 text-center" data-component="viewer-empty-state">
      <div className="space-y-2" data-slot="content">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {lines.map((line) => (
          <p key={line} className="max-w-xl text-sm leading-6 text-muted-foreground" data-slot="message">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
