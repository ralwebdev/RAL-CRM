/**
 * Industry Alliances — shared, reusable building blocks.
 * Used by manager + executive dashboards and the embedded InstitutionalSales tabs.
 */
import { ReactNode, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ───── StatusBadge ───── */
const STATUS_STYLES: Record<string, string> = {
  Identified: "bg-muted text-muted-foreground",
  Contacted: "bg-info/10 text-info",
  "Meeting Scheduled": "bg-info/10 text-info",
  "Meeting Done": "bg-warning/10 text-warning",
  "Proposal Shared": "bg-warning/10 text-warning",
  Negotiation: "bg-warning/10 text-warning",
  "MoU Signed": "bg-success/10 text-success",
  "Program Launched": "bg-success/10 text-success",
  Lost: "bg-destructive/10 text-destructive",
  // Tasks
  Pending: "bg-muted text-muted-foreground",
  "In Progress": "bg-info/10 text-info",
  Done: "bg-success/10 text-success",
  Overdue: "bg-destructive/10 text-destructive",
  // Visits
  Planned: "bg-info/10 text-info",
  Completed: "bg-success/10 text-success",
  Cancelled: "bg-muted text-muted-foreground",
  "No Show": "bg-destructive/10 text-destructive",
  // Proposals
  Draft: "bg-muted text-muted-foreground",
  Sent: "bg-info/10 text-info",
  "Under Review": "bg-warning/10 text-warning",
  Approved: "bg-success/10 text-success",
  Rejected: "bg-destructive/10 text-destructive",
  // Expenses
  Submitted: "bg-info/10 text-info",
  Reimbursed: "bg-success/10 text-success",
  // Priority / Interest
  Hot: "bg-destructive/10 text-destructive",
  High: "bg-destructive/10 text-destructive",
  Urgent: "bg-destructive/10 text-destructive",
  Warm: "bg-warning/10 text-warning",
  Medium: "bg-warning/10 text-warning",
  Cold: "bg-info/10 text-info",
  Low: "bg-muted text-muted-foreground",
  "Not Interested": "bg-muted text-muted-foreground",
};

export function StatusPill({ value }: { value: string }) {
  const cls = STATUS_STYLES[value] ?? "bg-muted text-muted-foreground";
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-medium whitespace-nowrap", cls)}>{value}</span>;
}

/* ───── DataTable ───── */
export interface ColumnDef<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchable?: (row: T) => string;
  pageSize?: number;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  toolbar?: ReactNode;
  searchPlaceholder?: string;
}

export function DataTable<T extends { id: string }>({
  data, columns, searchable, pageSize = 10, emptyMessage = "No records found.", onRowClick, toolbar, searchPlaceholder = "Search…",
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = searchable && query
    ? data.filter((r) => searchable(r).toLowerCase().includes(query.toLowerCase()))
    : data;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="rounded-xl bg-card shadow-card overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-2 p-3 border-b">
        {searchable && (
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder={searchPlaceholder}
              className="pl-8 h-9 text-sm"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        {toolbar}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead className="bg-muted/30">
            <tr className="text-left text-muted-foreground border-b">
              {columns.map((c) => (
                <th key={c.key} className={cn("px-3 py-2 font-medium whitespace-nowrap", c.hideOnMobile && "hidden md:table-cell", c.className)}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">{emptyMessage}</td></tr>
            ) : paged.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={cn("border-b last:border-0 hover:bg-muted/40 transition", onRowClick && "cursor-pointer")}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-3 py-2.5 text-card-foreground", c.hideOnMobile && "hidden md:table-cell", c.className)}>{c.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-3 border-t text-xs">
          <span className="text-muted-foreground">{filtered.length} records · page {safePage} of {totalPages}</span>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>Prev</Button>
            <Button size="sm" variant="outline" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── Generic Form Engine ───── */
export type FieldType = "text" | "number" | "email" | "phone" | "date" | "textarea" | "select";
export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  options?: readonly string[] | string[];
  required?: boolean;
  placeholder?: string;
  colSpan?: 1 | 2;
}

interface FormEngineProps {
  fields: FieldConfig[];
  initial?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function FormEngine({ fields, initial = {}, onSubmit, onCancel, submitLabel = "Save" }: FormEngineProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const v: Record<string, unknown> = {};
    fields.forEach((f) => { v[f.key] = initial[f.key] ?? (f.type === "number" ? "" : ""); });
    return v;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (k: string, v: unknown) => {
    setValues((prev) => ({ ...prev, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    fields.forEach((f) => {
      const v = values[f.key];
      if (f.required && (v === "" || v == null)) errs[f.key] = `${f.label} is required.`;
      if (f.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v))) errs[f.key] = "Invalid email.";
      if (f.type === "phone" && v && !/^[0-9+\-\s]{7,15}$/.test(String(v))) errs[f.key] = "Invalid phone.";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const out: Record<string, unknown> = { ...values };
    fields.forEach((f) => { if (f.type === "number") out[f.key] = Number(out[f.key]) || 0; });
    setSubmitting(true);
    try {
      await onSubmit(out);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.key} className={cn(f.colSpan === 2 && "sm:col-span-2")}>
            <Label className="text-xs">{f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}</Label>
            {f.type === "select" ? (
              <Select value={String(values[f.key] ?? "")} onValueChange={(v) => set(f.key, v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={f.placeholder ?? "Select…"} /></SelectTrigger>
                <SelectContent>
                  {(f.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : f.type === "textarea" ? (
              <Textarea
                value={String(values[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                rows={2}
                className="text-sm"
              />
            ) : (
              <Input
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                value={String(values[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="h-9 text-sm"
              />
            )}
            {errors[f.key] && <p className="text-[10px] text-destructive mt-0.5">{errors[f.key]}</p>}
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={submitting}>Cancel</Button>
        <Button size="sm" onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}

/* ───── ActivityTimeline ───── */
export interface ActivityItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  badge?: string;
}

export function ActivityTimeline({ items, emptyMessage = "No recent activity." }: { items: ActivityItem[]; emptyMessage?: string }) {
  if (!items.length) return <p className="text-xs text-muted-foreground italic">{emptyMessage}</p>;
  return (
    <ol className="relative border-l border-border ml-2 space-y-3">
      {items.map((it) => (
        <li key={it.id} className="ml-4">
          <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-card-foreground">{it.title}</p>
            {it.badge && <Badge variant="outline" className="text-[9px]">{it.badge}</Badge>}
          </div>
          {it.description && <p className="text-xs text-muted-foreground mt-0.5">{it.description}</p>}
          <p className="text-[10px] text-muted-foreground/80 mt-0.5">{it.timestamp}</p>
        </li>
      ))}
    </ol>
  );
}
