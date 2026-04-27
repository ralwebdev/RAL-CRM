import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { FollowUp, FollowUpType, Lead, User as AppUser } from "@/lib/types";
import { MASTER_FOLLOWUP_TYPES } from "@/lib/master-schema";
import { fetchMarketingLeads } from "@/lib/marketing-api";
import {
  createTelecallingFollowUp,
  fetchTelecallingFollowUps,
  fetchTelecallingUsers,
  updateTelecallingFollowUp,
} from "@/lib/telecalling-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarClock, Check, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function FollowUpsPage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    leadId: "",
    assignedTo: currentUser?.id || "",
    date: "",
    time: "",
    notes: "",
    followUpType: "" as FollowUpType | "",
  });

  useEffect(() => {
    if (!currentUser || form.assignedTo) return;
    setForm((prev) => ({ ...prev, assignedTo: currentUser.id }));
  }, [currentUser, form.assignedTo]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [followUpRows, leadRows, userRows] = await Promise.all([
          fetchTelecallingFollowUps(),
          fetchMarketingLeads(),
          fetchTelecallingUsers(),
        ]);
        if (!active) return;
        setFollowUps(followUpRows);
        setLeads(leadRows);
        setUsers(userRows);
      } catch (err: any) {
        if (!active) return;
        toast.error(err?.response?.data?.message || "Could not load follow-ups from backend.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const handleCreate = async () => {
    if (!form.leadId || !form.date) return;
    setSubmitting(true);
    try {
      const created = await createTelecallingFollowUp({
        leadId: form.leadId,
        assignedTo: form.assignedTo || currentUser?.id || "",
        date: form.date,
        followUpTime: form.time || undefined,
        notes: form.notes,
        completed: false,
        followUpType: (form.followUpType as FollowUpType) || undefined,
      });
      setFollowUps((prev) => [...prev, created]);
      setForm({
        leadId: "",
        assignedTo: currentUser?.id || "",
        date: "",
        time: "",
        notes: "",
        followUpType: "",
      });
      setOpen(false);
      toast.success("Follow-up scheduled.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to schedule follow-up.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleComplete = async (id: string) => {
    const target = followUps.find((f) => f.id === id);
    if (!target) return;
    setUpdatingId(id);
    try {
      const updated = await updateTelecallingFollowUp(id, { completed: !target.completed });
      setFollowUps((prev) => prev.map((f) => (f.id === id ? updated : f)));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update follow-up.");
    } finally {
      setUpdatingId(null);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  const byDate = (a: FollowUp, b: FollowUp) => {
    return `${a.date} ${a.followUpTime || ""}`.localeCompare(`${b.date} ${b.followUpTime || ""}`);
  };

  const upcoming = useMemo(() => {
    return followUps.filter((f) => !f.completed && f.date >= today).sort(byDate);
  }, [followUps, today]);

  const overdue = useMemo(() => {
    return followUps.filter((f) => !f.completed && f.date < today).sort(byDate);
  }, [followUps, today]);

  const completed = useMemo(() => {
    return followUps.filter((f) => f.completed).sort((a, b) => byDate(b, a));
  }, [followUps]);

  const renderList = (items: FollowUp[], label: string, emptyText: string) => (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{label} ({items.length})</h3>
      {items.length === 0 && <p className="text-sm text-muted-foreground">{emptyText}</p>}
      <div className="space-y-2">
        {items.map((f) => {
          const lead = leads.find((l) => l.id === f.leadId);
          const user = users.find((u) => u.id === f.assignedTo);

          return (
            <div key={f.id} className={cn("flex items-start gap-3 rounded-lg border p-3 transition-colors", f.completed && "opacity-60")}>
              <button
                onClick={() => void toggleComplete(f.id)}
                disabled={updatingId === f.id}
                className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors disabled:opacity-50", f.completed ? "border-success bg-success" : "border-input hover:border-primary")}
              >
                {f.completed && <Check className="h-3 w-3 text-success-foreground" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-card-foreground">{lead?.name || "Unknown Lead"}</p>
                <p className="text-xs text-muted-foreground">{f.notes}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" />{f.date}{f.followUpTime ? ` at ${f.followUpTime}` : ""}</span>
                  {f.followUpType && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px]">{f.followUpType}</span>}
                  {user && <span>-&gt; {user.name}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 justify-between sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Follow-ups</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Track and manage lead follow-ups</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Schedule Follow-up</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule Follow-up</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Lead</Label>
                <Select value={form.leadId} onValueChange={(v) => setForm({ ...form, leadId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select lead" /></SelectTrigger>
                  <SelectContent>{leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assign To</Label>
                <Select value={form.assignedTo} onValueChange={(v) => setForm({ ...form, assignedTo: v })}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                <div><Label>Time</Label><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
              </div>
              <div>
                <Label>Follow-up Type</Label>
                <Select value={form.followUpType} onValueChange={(v) => setForm({ ...form, followUpType: v as FollowUpType })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{MASTER_FOLLOWUP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
              <Button onClick={() => void handleCreate()} className="w-full" disabled={submitting || !form.leadId || !form.date}>
                {submitting ? (
                  <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Scheduling...</span>
                ) : "Schedule"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="rounded-xl bg-card p-8 shadow-card">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading follow-ups...
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl bg-card p-5 shadow-card">
            {renderList(overdue, "Overdue", "No overdue follow-ups")}
          </div>
          <div className="rounded-xl bg-card p-5 shadow-card">
            {renderList(upcoming, "Upcoming", "No upcoming follow-ups")}
          </div>
          <div className="rounded-xl bg-card p-5 shadow-card">
            {renderList(completed, "Completed", "No completed follow-ups")}
          </div>
        </div>
      )}
    </div>
  );
}
