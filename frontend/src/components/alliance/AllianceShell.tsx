/**
 * Industry Alliances — Premium Dashboard Primitives
 *
 * Reusable building blocks shared across Manager + Executive dashboards.
 * - KpiCard with drilldown drawer + smart nudge + counter animation
 * - GlobalFilterBar (date range, district, type, executive, stage)
 * - NudgeBanner with severity styling
 * - useAllianceData hook (scoped + filtered)
 * - useGamification (streak, weekly progress)
 * - confetti() lightweight DOM celebration
 */
import { ReactNode, useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Sparkles, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { allianceStore } from "@/lib/alliance-data";
import { INSTITUTION_TYPES, PIPELINE_STAGES } from "@/lib/alliance-types";
import type {
  Institution, AllianceVisit, AllianceTask, AllianceProposal, AllianceEvent, AllianceExpense, AllianceContact,
} from "@/lib/alliance-types";
import { cn } from "@/lib/utils";

/* ───── Date helpers ───── */
export const todayIso = () => new Date().toISOString().split("T")[0];
export function daysBetween(later: string, earlier: string) {
  return Math.floor((new Date(later).getTime() - new Date(earlier).getTime()) / 86400000);
}

/* ───── Filter types ───── */
export type DatePreset = "today" | "week" | "month" | "quarter" | "all" | "custom";
export interface AllianceFilters {
  preset: DatePreset;
  from: string;
  to: string;
  district: string;
  type: string;
  executiveId: string;
  pipelineStage: string;
}
export const defaultFilters: AllianceFilters = {
  preset: "month", from: "", to: "", district: "all", type: "all", executiveId: "all", pipelineStage: "all",
};

function presetRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const to = todayIso();
  const d = new Date(now);
  if (preset === "today") return { from: to, to };
  if (preset === "week") { d.setDate(d.getDate() - 6); return { from: d.toISOString().split("T")[0], to }; }
  if (preset === "month") { d.setDate(1); return { from: d.toISOString().split("T")[0], to }; }
  if (preset === "quarter") { d.setMonth(d.getMonth() - 3); return { from: d.toISOString().split("T")[0], to }; }
  return { from: "", to: "" };
}

/* ───── useAllianceData ───── */
export interface ScopedData {
  institutions: Institution[];
  visits: AllianceVisit[];
  tasks: AllianceTask[];
  proposals: AllianceProposal[];
  events: AllianceEvent[];
  expenses: AllianceExpense[];
  contacts: AllianceContact[];
}

export function useAllianceData(opts: {
  scope: "manager" | "executive";
  executiveId?: string;
  filters?: AllianceFilters;
  version?: number;
}): ScopedData {
  const { scope, executiveId, filters, version } = opts;
  return useMemo(() => {
    void version;
    const allInst = allianceStore.getInstitutions();
    const allVisits = allianceStore.getVisits();
    const allTasks = allianceStore.getTasks();
    const allProps = allianceStore.getProposals();
    const allEvents = allianceStore.getEvents();
    const allExp = allianceStore.getExpenses();
    const allContacts = allianceStore.getContacts();

    let inst = scope === "executive" && executiveId
      ? allInst.filter((i) => i.assignedTo === executiveId)
      : allInst;

    if (filters) {
      if (filters.district !== "all") inst = inst.filter((i) => i.district === filters.district);
      if (filters.type !== "all") inst = inst.filter((i) => i.type === filters.type);
      if (filters.executiveId !== "all") inst = inst.filter((i) => i.assignedTo === filters.executiveId);
      if (filters.pipelineStage !== "all") inst = inst.filter((i) => i.pipelineStage === filters.pipelineStage);
    }

    const ids = new Set(inst.map((i) => i.id));
    const inRange = (d: string) => {
      if (!filters || filters.preset === "all") return true;
      const range = filters.preset === "custom" ? { from: filters.from, to: filters.to } : presetRange(filters.preset);
      if (!range.from || !range.to) return true;
      return d >= range.from && d <= range.to;
    };

    return {
      institutions: inst,
      visits: allVisits.filter((v) => ids.has(v.institutionId) && inRange(v.visitDate)),
      tasks: scope === "executive" && executiveId
        ? allTasks.filter((t) => t.assignedTo === executiveId)
        : allTasks.filter((t) => ids.has(t.institutionId)),
      proposals: allProps.filter((p) => ids.has(p.institutionId) && inRange(p.sentDate)),
      events: allEvents.filter((e) => ids.has(e.institutionId) && inRange(e.eventDate)),
      expenses: scope === "executive" && executiveId
        ? allExp.filter((e) => e.executiveId === executiveId)
        : allExp.filter((e) => ids.has(e.institutionId)),
      contacts: allContacts.filter((c) => ids.has(c.institutionId)),
    };
  }, [scope, executiveId, filters, version]);
}

/* ───── KpiCard ───── */
interface KpiCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: number; // % change
  microcopy?: string;
  nudge?: string;
  drawerTitle?: string;
  drawerContent?: ReactNode;
  accent?: "default" | "danger" | "warning" | "success";
}

export function KpiCard({ title, value, icon, trend, microcopy, nudge, drawerTitle, drawerContent, accent = "default" }: KpiCardProps) {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState(0);
  const numeric = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, "")) || 0;

  // Counter animation
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 500;
    const from = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setDisplay(Math.round(from + (numeric - from) * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [numeric]);

  const valueText = typeof value === "string" && /[^\d.]/.test(value)
    ? value.replace(/\d[\d,]*/, display.toLocaleString())
    : (typeof value === "number" ? display.toLocaleString() : value);

  const accentRing = accent === "danger" ? "border-l-destructive" : accent === "warning" ? "border-l-warning" : accent === "success" ? "border-l-success" : "border-l-primary";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group text-left rounded-xl bg-card p-4 shadow-card border-l-4 transition-all",
          "hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40",
          accentRing,
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-card-foreground tabular-nums">{valueText}</p>
            {typeof trend === "number" && (
              <p className={cn("mt-0.5 text-[11px] font-medium inline-flex items-center gap-0.5", trend >= 0 ? "text-success" : "text-destructive")}>
                {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(trend).toFixed(1)}%
              </p>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-2 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition">{icon}</div>
        </div>
        {microcopy && <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2">{microcopy}</p>}
        {nudge && (
          <div className="mt-2 flex items-start gap-1.5 rounded-md bg-warning/10 px-2 py-1.5">
            <Sparkles className="h-3 w-3 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-warning font-medium leading-tight">{nudge}</p>
          </div>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <span className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</span>
              {drawerTitle ?? title}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {drawerContent ?? <p className="text-sm text-muted-foreground italic">No drilldown configured.</p>}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ───── NudgeBanner ───── */
interface NudgeBannerProps {
  items: { id: string; severity: "info" | "warning" | "danger" | "success"; message: string; cta?: { label: string; onClick: () => void } }[];
  title?: string;
}
export function NudgeBanner({ items, title = "Smart Nudges" }: NudgeBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = items.filter((i) => !dismissed.has(i.id));
  if (!visible.length) return null;
  const styleFor = (s: string) =>
    s === "danger" ? "border-l-destructive bg-destructive/5" :
    s === "warning" ? "border-l-warning bg-warning/5" :
    s === "success" ? "border-l-success bg-success/5" : "border-l-info bg-info/5";
  const textFor = (s: string) =>
    s === "danger" ? "text-destructive" : s === "warning" ? "text-warning" : s === "success" ? "text-success" : "text-info";

  return (
    <div className="rounded-xl bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-card-foreground">{title}</h4>
        <Badge variant="outline" className="text-[10px] ml-auto">{visible.length}</Badge>
      </div>
      <ul className="space-y-1.5">
        {visible.slice(0, 6).map((n) => (
          <li key={n.id} className={cn("flex items-start gap-2 rounded-md border-l-2 px-3 py-2", styleFor(n.severity))}>
            <p className={cn("text-xs flex-1", textFor(n.severity))}>{n.message}</p>
            {n.cta && <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={n.cta.onClick}>{n.cta.label}</Button>}
            <button onClick={() => setDismissed((s) => new Set(s).add(n.id))} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───── Global Filter Bar ───── */
interface FilterBarProps {
  filters: AllianceFilters;
  onChange: (f: AllianceFilters) => void;
  executives: { id: string; label: string }[];
  showExecutive?: boolean;
}
export function GlobalFilterBar({ filters, onChange, executives, showExecutive = true }: FilterBarProps) {
  const districts = useMemo(() => {
    const set = new Set(allianceStore.getInstitutions().map((i) => i.district).filter(Boolean));
    return Array.from(set).sort();
  }, []);
  const update = (patch: Partial<AllianceFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="rounded-xl bg-card p-3 shadow-card flex flex-wrap items-center gap-2">
      <Select value={filters.preset} onValueChange={(v) => update({ preset: v as DatePreset })}>
        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          <SelectItem value="quarter">Quarter</SelectItem>
          <SelectItem value="all">All time</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>
      {filters.preset === "custom" && (
        <>
          <Input type="date" value={filters.from} onChange={(e) => update({ from: e.target.value })} className="h-8 w-36 text-xs" />
          <Input type="date" value={filters.to} onChange={(e) => update({ to: e.target.value })} className="h-8 w-36 text-xs" />
        </>
      )}
      <Select value={filters.district} onValueChange={(v) => update({ district: v })}>
        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="District" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Districts</SelectItem>
          {districts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.type} onValueChange={(v) => update({ type: v })}>
        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {INSTITUTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.pipelineStage} onValueChange={(v) => update({ pipelineStage: v })}>
        <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Stage" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Stages</SelectItem>
          {PIPELINE_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
      {showExecutive && (
        <Select value={filters.executiveId} onValueChange={(v) => update({ executiveId: v })}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Executive" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Executives</SelectItem>
            {executives.map((e) => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      <Button size="sm" variant="ghost" className="h-8 text-xs ml-auto" onClick={() => onChange(defaultFilters)}>Reset</Button>
    </div>
  );
}

/* ───── Progress Ring ───── */
export function ProgressRing({ value, max, label, size = 56 }: { value: number; max: number; label?: string; size?: number }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="inline-flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="4"
          strokeDasharray={c} strokeDashoffset={c - (pct/100)*c} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 600ms ease" }} />
      </svg>
      <span className="-mt-9 text-xs font-bold tabular-nums">{Math.round(pct)}%</span>
      {label && <span className="mt-3 text-[10px] text-muted-foreground">{label}</span>}
    </div>
  );
}

/* ───── Confetti (lightweight) ───── */
export function confetti() {
  if (typeof document === "undefined") return;
  const colors = ["#E31E24", "#FBB034", "#22c55e", "#3b82f6", "#a855f7"];
  const root = document.createElement("div");
  root.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;";
  document.body.appendChild(root);
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement("div");
    const size = 6 + Math.random() * 6;
    piece.style.cssText = `position:absolute;top:-20px;left:${Math.random()*100}%;width:${size}px;height:${size*0.4}px;background:${colors[i%colors.length]};border-radius:2px;transform:rotate(${Math.random()*360}deg);transition:transform 1.6s ease-out, top 1.6s ease-out, opacity 1.6s ease-out;`;
    root.appendChild(piece);
    requestAnimationFrame(() => {
      piece.style.top = `${100 + Math.random()*20}%`;
      piece.style.transform = `rotate(${Math.random()*720}deg)`;
      piece.style.opacity = "0";
    });
  }
  setTimeout(() => root.remove(), 1800);
}

/* ───── Gamification helpers ───── */
const STREAK_KEY = "alliance_streak";
export function useStreak(userId?: string) {
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem(`${STREAK_KEY}_${userId}`);
      if (raw) {
        const { count, last } = JSON.parse(raw);
        const today = todayIso();
        const diff = daysBetween(today, last);
        if (diff === 0) setStreak(count);
        else if (diff === 1) setStreak(count); // yesterday — still counts until today's update
        else setStreak(0);
      }
    } catch { /* noop */ }
  }, [userId]);
  const bump = () => {
    if (!userId) return;
    const today = todayIso();
    try {
      const raw = localStorage.getItem(`${STREAK_KEY}_${userId}`);
      let count = 1;
      if (raw) {
        const prev = JSON.parse(raw);
        const diff = daysBetween(today, prev.last);
        count = diff === 0 ? prev.count : diff === 1 ? prev.count + 1 : 1;
      }
      localStorage.setItem(`${STREAK_KEY}_${userId}`, JSON.stringify({ count, last: today }));
      setStreak(count);
    } catch { /* noop */ }
  };
  return { streak, bump };
}
