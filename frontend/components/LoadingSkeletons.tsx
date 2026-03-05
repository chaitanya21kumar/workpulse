export function TableRowSkeleton() {
  return (
    <tr className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div
            className={`h-4 rounded-lg ${i === 0 ? "w-3/4" : "w-1/2"}`}
            style={{ background: "rgba(255,255,255,0.06)" }}
          />
        </td>
      ))}
    </tr>
  );
}

export function CardSkeleton() {
  return (
    <div
      className="animate-pulse rounded-2xl p-5 h-28"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="h-3 rounded-lg w-1/3 mb-4" style={{ background: "rgba(255,255,255,0.07)" }} />
      <div className="h-8 rounded-lg w-1/2" style={{ background: "rgba(255,255,255,0.07)" }} />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <tbody>
      {[...Array(rows)].map((_, i) => (
        <TableRowSkeleton key={i} />
      ))}
    </tbody>
  );
}
