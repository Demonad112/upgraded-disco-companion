/**
 * A resistance name that is spelled out when its row has room and shortened to
 * eight characters at most when it does not (the `.res-row` container query in
 * globals.css). Only "Lightning" is long enough to need it.
 */
export function ResName({ label }: { label: string }) {
  if (label.length <= 8) return <>{label}</>;
  return (
    <>
      <span className="res-full">{label}</span>
      <span className="res-abbr">{label.slice(0, 5)}.</span>
    </>
  );
}
