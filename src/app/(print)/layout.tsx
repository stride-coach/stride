export default function PrintLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div data-surface="paper" className="min-h-dvh bg-card text-foreground">
      {children}
    </div>
  );
}
