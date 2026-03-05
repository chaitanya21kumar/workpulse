export function TableRowSkeleton() {
  return (
    <tr className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className={`h-4 bg-slate-100 rounded-lg ${i === 0 ? "w-3/4" : "w-1/2"}`} />
        </td>
      ))}
    </tr>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse bg-slate-100 rounded-2xl p-5 h-28">
      <div className="h-3 bg-slate-200 rounded-lg w-1/3 mb-4" />
      <div className="h-8 bg-slate-200 rounded-lg w-1/2" />
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
