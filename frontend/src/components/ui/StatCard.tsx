interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  delta?: string;
  deltaPositive?: boolean;
}

export function StatCard({ label, value, icon, delta, deltaPositive }: StatCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {delta && (
            <span className={`mt-1 inline-block text-xs font-medium ${deltaPositive ? 'text-emerald-600' : 'text-red-500'}`}>
              {delta}
            </span>
          )}
        </div>
        {icon && <div className="text-muted">{icon}</div>}
      </div>
    </div>
  );
}
