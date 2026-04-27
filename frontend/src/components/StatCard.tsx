import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  className?: string;
}

export function StatCard({ title, value, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn("rounded-xl bg-card p-3 sm:p-5 shadow-card transition-shadow hover:shadow-card-hover", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="mt-0.5 sm:mt-1 text-lg sm:text-2xl font-bold text-card-foreground truncate">{value}</p>
          {trend && <p className="mt-0.5 text-[10px] sm:text-xs text-success truncate">{trend}</p>}
        </div>
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}
