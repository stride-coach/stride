export function RacesTitle({ subtitle }: { subtitle?: React.ReactNode }) {
  return (
    <>
      <h1 className="sr-only">Courses</h1>
      {subtitle && <div className="sr-only">{subtitle}</div>}
    </>
  );
}
