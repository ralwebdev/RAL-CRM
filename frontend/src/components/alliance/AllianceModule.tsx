/**
 * Industry Alliances Module â€” main UI.
 * Mounted inside InstitutionalSalesPage as additional tabs and used by
 * dedicated alliance manager + executive dashboards.
 *
 * Encapsulates Phases 1-5: CRUD, dashboards, automation, reports/export.
 */
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { allianceStore, downloadCSV } from "@/lib/alliance-data";
import { api } from "@/lib/api";
import { syncAllianceStoreFromBackend, type AllianceDirectoryUser } from "@/lib/alliance-api";
import {
  PIPELINE_STAGES, INSTITUTION_TYPES, BOARD_UNIVERSITIES, VISIT_INTEREST_LEVELS,
  VISIT_STATUSES, TASK_STATUSES, TASK_PRIORITIES, PROPOSAL_TYPES, PROPOSAL_STATUSES,
  EVENT_TYPES, EXPENSE_TYPES, EXPENSE_STATUSES, computePriority,
} from "@/lib/alliance-types";
import type {
  Institution, AllianceContact, AllianceVisit, AllianceTask, AllianceProposal,
  AllianceEvent, AllianceExpense, AlliancePipelineStage,
} from "@/lib/alliance-types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/StatCard";
import { DataTable, FormEngine, StatusPill, ActivityTimeline } from "@/components/alliance/AllianceUI";
import type { ColumnDef, FieldConfig, ActivityItem } from "@/components/alliance/AllianceUI";
import { ApprovalCenter } from "@/components/alliance/ApprovalCenter";
import {
  Building2, Users, Calendar, ListChecks, FileText, PartyPopper, Receipt,
  BarChart3, Plus, AlertTriangle, Download, TrendingUp, MapPin, ShieldCheck,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { toast } from "sonner";

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--info))", "hsl(280, 60%, 55%)", "hsl(180, 60%, 45%)"];

// â”€â”€ Helpers â”€â”€
function daysBetween(a: string, b: string) {
  return Math.floor((new Date(a).getTime() - new Date(b).getTime()) / 86400000);
}
function todayIso() { return new Date().toISOString().split("T")[0]; }

// â”€â”€ Field configs (closed-ended) â”€â”€
interface AllianceModuleProps {
  scope: "manager" | "executive";
  executiveId?: string;
  initialTab?: string;
  initialAction?: string;
  initialStageFilter?: string;
  initialDistrictFilter?: string;
}

export function AllianceModule({ scope, executiveId, initialTab, initialAction, initialStageFilter, initialDistrictFilter }: AllianceModuleProps) {
  const { currentUser } = useAuth();
  const validTabs = ["institutions", "contacts", "visits", "tasks", "proposals", "events", "expenses", "approvals", "reports"];
  const [tab, setTab] = useState(validTabs.includes(initialTab ?? "") ? (initialTab as string) : "institutions");
  const [stageFilter, setStageFilter] = useState<string>(initialStageFilter ?? "all");
  const [districtFilter, setDistrictFilter] = useState<string>(initialDistrictFilter ?? "all");

  // dialog state
  const [editInstitution, setEditInstitution] = useState<Institution | null>(null);
  const [showInstForm, setShowInstForm] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [drillInstitution, setDrillInstitution] = useState<Institution | null>(null);
  const [directoryUsers, setDirectoryUsers] = useState<AllianceDirectoryUser[]>([]);

  // Auto-open create form based on URL action param
  useEffect(() => {
    if (initialAction !== "new") return;
    if (initialTab === "visits") setShowVisitForm(true);
    else if (initialTab === "contacts") setShowContactForm(true);
    else if (initialTab === "tasks") setShowTaskForm(true);
    else if (initialTab === "proposals") setShowProposalForm(true);
    else if (initialTab === "events") setShowEventForm(true);
    else if (initialTab === "expenses") setShowExpenseForm(true);
    else if (initialTab === "institutions" && scope === "manager") setShowInstForm(true);
  }, [initialAction, initialTab, scope]);

  // Force re-render after mutations
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  const executiveUsers = useMemo(
    () => directoryUsers.filter((u) => u.role === "alliance_executive"),
    [directoryUsers],
  );
  const executiveOptions = executiveUsers.map((u) => u.name);
  const userIdByLabel = (label: string) => executiveUsers.find((u) => u.name === label)?.id ?? "";
  const userLabelById = (id: string) => directoryUsers.find((u) => u.id === id)?.name ?? id;
  const defaultExecutiveId = executiveUsers[0]?.id || currentUser?.id || "";

  const institutionFields: FieldConfig[] = [
    { key: "name", label: "Institution Name", type: "text", required: true, placeholder: "e.g. Delhi Public School" },
    { key: "type", label: "Type", type: "select", options: INSTITUTION_TYPES, required: true },
    { key: "boardUniversity", label: "Board / University", type: "select", options: BOARD_UNIVERSITIES, required: true },
    { key: "city", label: "City", type: "text", required: true },
    { key: "district", label: "District", type: "text" },
    { key: "address", label: "Address", type: "text", colSpan: 2 },
    { key: "studentStrength", label: "Student Strength", type: "number", required: true },
    { key: "decisionMaker", label: "Decision Maker", type: "text" },
    { key: "phone", label: "Phone", type: "phone", required: true },
    { key: "email", label: "Email", type: "email" },
    { key: "assignedTo", label: "Assign Executive", type: "select", options: executiveOptions, required: true },
    { key: "pipelineStage", label: "Pipeline Stage", type: "select", options: PIPELINE_STAGES, required: true },
    { key: "notes", label: "Notes", type: "textarea", colSpan: 2 },
  ];

  const refreshFromBackend = async (force = false) => {
    const { users } = await syncAllianceStoreFromBackend({ force });
    setDirectoryUsers(users);
    bump();
  };

  useEffect(() => {
    refreshFromBackend(true).catch(() => {
      toast.error("Unable to load alliance backend data.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Data load (memoised by version)
  const data = useMemo(() => {
    void version;
    const allInst = allianceStore.getInstitutions();
    const allTasks = allianceStore.getTasks();
    const allVisits = allianceStore.getVisits();
    const allProposals = allianceStore.getProposals();
    const allEvents = allianceStore.getEvents();
    const allExpenses = allianceStore.getExpenses();
    const allContacts = allianceStore.getContacts();

    // Scope filter for executive
    let inst = scope === "executive" && executiveId
      ? allInst.filter((i) => i.assignedTo === executiveId)
      : allInst;
    if (stageFilter !== "all") inst = inst.filter((i) => i.pipelineStage === stageFilter);
    if (districtFilter !== "all") inst = inst.filter((i) => i.district === districtFilter);
    const instIds = new Set(inst.map((i) => i.id));
    return {
      institutions: inst,
      tasks: scope === "executive" && executiveId
        ? allTasks.filter((t) => t.assignedTo === executiveId)
        : allTasks.filter((t) => instIds.has(t.institutionId)),
      visits: allVisits.filter((v) => instIds.has(v.institutionId)),
      proposals: allProposals.filter((p) => instIds.has(p.institutionId)),
      events: allEvents.filter((e) => instIds.has(e.institutionId)),
      expenses: scope === "executive" && executiveId
        ? allExpenses.filter((e) => e.executiveId === executiveId)
        : allExpenses.filter((e) => instIds.has(e.institutionId)),
      contacts: allContacts.filter((c) => instIds.has(c.institutionId)),
    };
  }, [version, scope, executiveId, stageFilter, districtFilter]);

  // â”€â”€ KPIs â”€â”€
  const totalInstitutions = data.institutions.length;
  const meetingsThisMonth = data.visits.filter((v) => new Date(v.visitDate).getMonth() === new Date().getMonth() && v.status === "Completed").length;
  const proposalsSent = data.proposals.filter((p) => p.status !== "Draft").length;
  const mousClosed = data.institutions.filter((i) => i.pipelineStage === "MoU Signed" || i.pipelineStage === "Program Launched").length;
  const overdueTasks = data.tasks.filter((t) => t.status === "Overdue").length;
  const pendingFollowups = data.visits.filter((v) => v.nextFollowup && v.nextFollowup >= todayIso() && v.status === "Completed").length;

  // â”€â”€ Automations / Alerts â”€â”€
  const alerts = useMemo(() => {
    const list: { id: string; severity: "warning" | "danger"; message: string }[] = [];
    // Overdue followups (>7 days since visit, no proposal sent)
    data.visits.forEach((v) => {
      if (v.status === "Completed" && daysBetween(todayIso(), v.visitDate) > 7) {
        const inst = data.institutions.find((i) => i.id === v.institutionId);
        const hasProposal = data.proposals.some((p) => p.institutionId === v.institutionId && p.status !== "Draft");
        if (!hasProposal && inst) {
          list.push({ id: `ovf-${v.id}`, severity: "warning", message: `Overdue follow-up: ${inst.name} (${daysBetween(todayIso(), v.visitDate)}d since last visit, no proposal)` });
        }
      }
    });
    // â‰¥3 meetings, no proposal
    data.institutions.forEach((inst) => {
      const meetingCount = data.visits.filter((v) => v.institutionId === inst.id && v.status === "Completed").length;
      const hasProposal = data.proposals.some((p) => p.institutionId === inst.id && p.status !== "Draft");
      if (meetingCount >= 3 && !hasProposal) {
        list.push({ id: `npp-${inst.id}`, severity: "danger", message: `${inst.name} has ${meetingCount} meetings but no proposal sent.` });
      }
    });
    // Overdue tasks
    if (overdueTasks > 0) list.push({ id: "ovt", severity: "danger", message: `${overdueTasks} task${overdueTasks === 1 ? "" : "s"} overdue.` });
    return list;
  }, [data, overdueTasks]);

  // â”€â”€ Pipeline funnel data â”€â”€
  const pipelineData = useMemo(() => PIPELINE_STAGES.map((s) => ({
    stage: s,
    count: data.institutions.filter((i) => i.pipelineStage === s).length,
  })), [data.institutions]);

  // Monthly visits trend
  const monthlyVisits = useMemo(() => {
    const buckets: Record<string, number> = {};
    data.visits.forEach((v) => {
      const k = v.visitDate.slice(0, 7);
      buckets[k] = (buckets[k] ?? 0) + 1;
    });
    return Object.entries(buckets).sort().map(([month, count]) => ({ month, count }));
  }, [data.visits]);

  // Top executives
  const execLeaderboard = useMemo(() => {
    const m: Record<string, { meetings: number; mous: number; revenue: number }> = {};
    executiveUsers.forEach((u) => { m[u.id] = { meetings: 0, mous: 0, revenue: 0 }; });
    data.visits.forEach((v) => { if (v.status === "Completed" && m[v.executiveId]) m[v.executiveId].meetings += 1; });
    data.institutions.forEach((i) => {
      if ((i.pipelineStage === "MoU Signed" || i.pipelineStage === "Program Launched") && m[i.assignedTo]) m[i.assignedTo].mous += 1;
      const approved = data.proposals.filter((p) => p.institutionId === i.id && p.status === "Approved");
      if (m[i.assignedTo]) m[i.assignedTo].revenue += approved.reduce((s, p) => s + p.amount, 0);
    });
    return executiveUsers.map((u) => ({ name: u.name, ...m[u.id] }));
  }, [data, executiveUsers]);

  // Mutations
  const saveInstitution = async (vals: Record<string, unknown>) => {
    try {
      const studentStrength = Number(vals.studentStrength) || 0;
      const { score, bucket } = computePriority(studentStrength);
      const assignedToId = userIdByLabel(String(vals.assignedTo)) || defaultExecutiveId;
      if (!assignedToId) {
        toast.error("No alliance executive available for assignment.");
        return;
      }

      const payload = {
        name: String(vals.name || ""),
        type: vals.type,
        boardUniversity: vals.boardUniversity,
        district: String(vals.district || ""),
        city: String(vals.city || ""),
        address: String(vals.address || ""),
        studentStrength,
        decisionMaker: String(vals.decisionMaker || ""),
        phone: String(vals.phone || ""),
        email: String(vals.email || ""),
        priorityScore: score,
        priority: bucket,
        assignedExecutiveId: assignedToId,
        pipelineStage: vals.pipelineStage,
        notes: String(vals.notes || ""),
      };

      if (editInstitution) {
        await api.put(`/api/alliances/institutions/${editInstitution.id}`, payload);
        toast.success("Institution updated.");
      } else {
        await api.post("/api/alliances/institutions", payload);
        toast.success("Institution added.");
      }
      setShowInstForm(false);
      setEditInstitution(null);
      await refreshFromBackend(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save institution.");
    }
  };

  const updatePipelineStage = async (instId: string, newStage: AlliancePipelineStage) => {
    try {
      await api.put(`/api/alliances/institutions/${instId}`, { pipelineStage: newStage });
      toast.success("Pipeline stage updated.");
      await refreshFromBackend(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update pipeline stage.");
    }
  };

  const saveVisit = async (vals: Record<string, unknown>) => {
    const inst = data.institutions.find((i) => i.name === vals.institution);
    if (!inst) {
      toast.error("Select a valid institution.");
      return;
    }

    const selectedExecId =
      scope === "executive" && executiveId
        ? executiveId
        : userIdByLabel(String(vals.executive)) || defaultExecutiveId;

    try {
      await api.post("/api/alliances/visits", {
        institutionId: inst.id,
        executiveId: selectedExecId,
        visitDate: String(vals.visitDate || todayIso()),
        meetingPerson: String(vals.meetingPerson || ""),
        summary: String(vals.summary || ""),
        interestLevel: vals.interestLevel,
        nextFollowup: vals.nextFollowup ? String(vals.nextFollowup) : undefined,
        status: vals.status,
        photoUrl: "",
      });
      toast.success("Visit logged.");
      setShowVisitForm(false);
      await refreshFromBackend(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to log visit.");
    }
  };

  const saveContact = async (vals: Record<string, unknown>) => {
    const inst = data.institutions.find((i) => i.name === vals.institution);
    if (!inst) {
      toast.error("Select a valid institution.");
      return;
    }

    try {
      await api.post("/api/alliances/contacts", {
        institutionId: inst.id,
        name: String(vals.name || ""),
        designation: String(vals.designation || ""),
        phone: String(vals.phone || ""),
        email: String(vals.email || ""),
        notes: String(vals.notes || ""),
      });
      toast.success("Institution contact added.");
      setShowContactForm(false);
      await refreshFromBackend(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add contact.");
    }
  };

  const saveTask = async (vals: Record<string, unknown>) => {
    const inst = data.institutions.find((i) => i.name === vals.institution);
    if (!inst) {
      toast.error("Select a valid institution.");
      return;
    }

    const assigneeId =
      scope === "executive" && executiveId
        ? executiveId
        : userIdByLabel(String(vals.assignee)) || defaultExecutiveId;

    try {
      await api.post("/api/alliances/tasks", {
        title: String(vals.title || ""),
        institutionId: inst.id,
        assignedTo: assigneeId,
        dueDate: String(vals.dueDate || todayIso()),
        status: "Pending",
        priority: vals.priority,
      });
      toast.success("Task created.");
      setShowTaskForm(false);
      await refreshFromBackend(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create task.");
    }
  };

  const toggleTaskStatus = async (task: AllianceTask) => {
    const next = task.status === "Done" ? "Pending" : "Done";
    try {
      await api.put(`/api/alliances/tasks/${task.id}`, { status: next });
      await refreshFromBackend(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update task status.");
    }
  };

  const saveProposal = async (vals: Record<string, unknown>) => {
    const inst = data.institutions.find((i) => i.name === vals.institution);
    if (!inst) {
      toast.error("Select an institution.");
      return;
    }

    try {
      await api.post("/api/alliances/proposals", {
        institutionId: inst.id,
        proposalType: vals.proposalType,
        amount: Number(vals.amount) || 0,
        status: vals.status,
        sentDate: String(vals.sentDate || todayIso()),
        notes: String(vals.notes || ""),
      });
      toast.success("Proposal added.");
      setShowProposalForm(false);
      await refreshFromBackend(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save proposal.");
    }
  };

  const approveProposal = async (id: string) => {
    try {
      await api.put(`/api/alliances/proposals/${id}`, { status: "Approved", approvedBy: currentUser?.id });
      toast.success("Proposal approved.");
      await refreshFromBackend(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to approve proposal.");
    }
  };

  const saveEvent = async (vals: Record<string, unknown>) => {
    const inst = data.institutions.find((i) => i.name === vals.institution);
    if (!inst) {
      toast.error("Select a valid institution.");
      return;
    }

    try {
      await api.post("/api/alliances/events", {
        institutionId: inst.id,
        eventName: String(vals.eventName || ""),
        eventType: vals.eventType,
        eventDate: String(vals.eventDate || todayIso()),
        attendees: Number(vals.attendees) || 0,
        leadsGenerated: Number(vals.leadsGenerated) || 0,
        notes: String(vals.notes || ""),
      });
      toast.success("Event captured.");
      setShowEventForm(false);
      await refreshFromBackend(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save event.");
    }
  };

  const saveExpense = async (vals: Record<string, unknown>) => {
    const inst = data.institutions.find((i) => i.name === vals.institution);
    if (!inst) {
      toast.error("Select a valid institution.");
      return;
    }

    const amount = Number(vals.amount) || 0;
    const expenseType = vals.expenseType as AllianceExpense["expenseType"];
    const execId =
      scope === "executive" && executiveId
        ? executiveId
        : userIdByLabel(String(vals.executive)) || defaultExecutiveId;

    try {
      const response = await api.post("/api/alliances/expenses", {
        executiveId: execId,
        institutionId: inst.id,
        expenseType,
        amount,
        billUrl: "",
        expenseDate: String(vals.expenseDate || todayIso()),
        status: "Submitted",
        notes: String(vals.notes || ""),
      });

      if (currentUser) {
        const requestType = expenseType === "Travel" ? "Travel Reimbursement" : "Expense Bill";
        await api.post("/api/alliances/approvals", {
          requestId: response?.data?.id || response?.data?._id || "",
          requestType,
          title: `${expenseType} INR ${amount.toLocaleString()} - ${userLabelById(execId)}`,
          amount,
          priority: amount > 2000 ? "High" : "Medium",
          notes: String(vals.notes || `${expenseType} expense for ${inst.name}`),
          meta: { module: "alliance", entity: "AllianceExpense" },
        });
      }

      toast.success("Expense submitted for approval.");
      setShowExpenseForm(false);
      await refreshFromBackend(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit expense.");
    }
  };

  const institutionColumns: ColumnDef<Institution>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-[10px] text-muted-foreground">{r.institutionId}</span>, hideOnMobile: true },
    { key: "name", header: "Institution", render: (r) => (
      <div>
        <p className="font-medium">{r.name}</p>
        <p className="text-[10px] text-muted-foreground">{r.type} Â· {r.city}</p>
      </div>
    ) },
    { key: "stage", header: "Stage", render: (r) => (
      <Select value={r.pipelineStage} onValueChange={(v) => updatePipelineStage(r.id, v as AlliancePipelineStage)}>
        <SelectTrigger className="h-7 w-36 text-[10px]"><SelectValue /></SelectTrigger>
        <SelectContent>{PIPELINE_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
      </Select>
    ) },
    { key: "priority", header: "Priority", render: (r) => <StatusPill value={r.priority} />, hideOnMobile: true },
    { key: "students", header: "Students", render: (r) => <span className="font-medium">{r.studentStrength.toLocaleString()}</span>, hideOnMobile: true },
    { key: "exec", header: "Executive", render: (r) => <span className="text-xs">{userLabelById(r.assignedTo)}</span>, hideOnMobile: true },
    { key: "actions", header: "", render: (r) => (
      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditInstitution(r); setShowInstForm(true); }}>Edit</Button>
    ) },
  ];

  const taskColumns: ColumnDef<AllianceTask>[] = [
    { key: "title", header: "Task", render: (r) => <span className="font-medium">{r.title}</span> },
    { key: "inst", header: "Institution", render: (r) => <span className="text-xs text-muted-foreground">{data.institutions.find((i) => i.id === r.institutionId)?.name ?? "â€”"}</span>, hideOnMobile: true },
    { key: "due", header: "Due", render: (r) => <span className="text-xs whitespace-nowrap">{r.dueDate}</span> },
    { key: "priority", header: "Priority", render: (r) => <StatusPill value={r.priority} />, hideOnMobile: true },
    { key: "status", header: "Status", render: (r) => <StatusPill value={r.status} /> },
    { key: "act", header: "", render: (r) => <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => toggleTaskStatus(r)}>{r.status === "Done" ? "Reopen" : "Mark Done"}</Button> },
  ];

  const visitColumns: ColumnDef<AllianceVisit>[] = [
    { key: "date", header: "Date", render: (r) => <span className="text-xs whitespace-nowrap">{r.visitDate}</span> },
    { key: "inst", header: "Institution", render: (r) => <span className="font-medium text-xs">{data.institutions.find((i) => i.id === r.institutionId)?.name ?? "â€”"}</span> },
    { key: "person", header: "Met With", render: (r) => <span className="text-xs">{r.meetingPerson}</span>, hideOnMobile: true },
    { key: "interest", header: "Interest", render: (r) => <StatusPill value={r.interestLevel} />, hideOnMobile: true },
    { key: "status", header: "Status", render: (r) => <StatusPill value={r.status} /> },
    { key: "next", header: "Next Follow-up", render: (r) => <span className="text-xs text-muted-foreground">{r.nextFollowup || "â€”"}</span>, hideOnMobile: true },
  ];

  const proposalColumns: ColumnDef<AllianceProposal>[] = [
    { key: "inst", header: "Institution", render: (r) => <span className="font-medium text-xs">{data.institutions.find((i) => i.id === r.institutionId)?.name ?? "â€”"}</span> },
    { key: "type", header: "Type", render: (r) => <Badge variant="outline" className="text-[9px]">{r.proposalType}</Badge>, hideOnMobile: true },
    { key: "amount", header: "Amount", render: (r) => <span className="font-semibold text-success">â‚¹{r.amount.toLocaleString()}</span> },
    { key: "sent", header: "Sent", render: (r) => <span className="text-xs whitespace-nowrap">{r.sentDate}</span>, hideOnMobile: true },
    { key: "status", header: "Status", render: (r) => <StatusPill value={r.status} /> },
    { key: "act", header: "", render: (r) => scope === "manager" && (r.status === "Sent" || r.status === "Under Review") ? (
      <Button size="sm" className="h-7 text-[10px]" onClick={() => approveProposal(r.id)}>Approve</Button>
    ) : null },
  ];

  const eventColumns: ColumnDef<AllianceEvent>[] = [
    { key: "name", header: "Event", render: (r) => <span className="font-medium text-xs">{r.eventName}</span> },
    { key: "type", header: "Type", render: (r) => <Badge variant="outline" className="text-[9px]">{r.eventType}</Badge>, hideOnMobile: true },
    { key: "inst", header: "Institution", render: (r) => <span className="text-xs text-muted-foreground">{data.institutions.find((i) => i.id === r.institutionId)?.name ?? "â€”"}</span>, hideOnMobile: true },
    { key: "date", header: "Date", render: (r) => <span className="text-xs whitespace-nowrap">{r.eventDate}</span> },
    { key: "att", header: "Attendees", render: (r) => <span className="text-xs">{r.attendees}</span>, hideOnMobile: true },
    { key: "leads", header: "Leads", render: (r) => <span className="font-semibold text-primary">{r.leadsGenerated}</span> },
  ];

  const expenseColumns: ColumnDef<AllianceExpense>[] = [
    { key: "date", header: "Date", render: (r) => <span className="text-xs whitespace-nowrap">{r.expenseDate}</span> },
    { key: "type", header: "Type", render: (r) => <Badge variant="outline" className="text-[9px]">{r.expenseType}</Badge> },
    { key: "exec", header: "Executive", render: (r) => <span className="text-xs">{userLabelById(r.executiveId)}</span>, hideOnMobile: true },
    { key: "amount", header: "Amount", render: (r) => <span className="font-semibold">â‚¹{r.amount.toLocaleString()}</span> },
    { key: "status", header: "Status", render: (r) => <StatusPill value={r.status} /> },
  ];

  const contactColumns: ColumnDef<AllianceContact>[] = [
    { key: "name", header: "Name", render: (r) => <span className="font-medium text-xs">{r.name}</span> },
    { key: "designation", header: "Designation", render: (r) => <span className="text-xs">{r.designation}</span>, hideOnMobile: true },
    { key: "inst", header: "Institution", render: (r) => <span className="text-xs text-muted-foreground">{data.institutions.find((i) => i.id === r.institutionId)?.name ?? "â€”"}</span> },
    { key: "phone", header: "Phone", render: (r) => <span className="text-xs">{r.phone}</span> },
    { key: "email", header: "Email", render: (r) => <span className="text-xs text-muted-foreground">{r.email}</span>, hideOnMobile: true },
  ];

  // â”€â”€ Field configs for forms â”€â”€
  const visitFields: FieldConfig[] = [
    { key: "institution", label: "Institution", type: "select", options: data.institutions.map((i) => i.name), required: true },
    { key: "visitDate", label: "Visit Date", type: "date", required: true },
    { key: "meetingPerson", label: "Met With", type: "text", required: true },
    { key: "interestLevel", label: "Interest Level", type: "select", options: VISIT_INTEREST_LEVELS, required: true },
    { key: "status", label: "Status", type: "select", options: VISIT_STATUSES, required: true },
    { key: "nextFollowup", label: "Next Follow-up", type: "date" },
    ...(scope === "manager" ? [{ key: "executive", label: "Executive", type: "select" as const, options: executiveOptions, required: true }] : []),
    { key: "summary", label: "Summary", type: "textarea", required: true, colSpan: 2 },
  ];
  const contactFields: FieldConfig[] = [
    { key: "institution", label: "Institution", type: "select", options: data.institutions.map((i) => i.name), required: true },
    { key: "name", label: "Contact Name", type: "text", required: true },
    { key: "designation", label: "Designation", type: "text", required: true },
    { key: "phone", label: "Phone", type: "phone", required: true },
    { key: "email", label: "Email", type: "email" },
    { key: "notes", label: "Notes", type: "textarea", colSpan: 2 },
  ];
  const taskFields: FieldConfig[] = [
    { key: "title", label: "Task Title", type: "text", required: true, colSpan: 2 },
    { key: "institution", label: "Institution", type: "select", options: data.institutions.map((i) => i.name) },
    { key: "dueDate", label: "Due Date", type: "date", required: true },
    { key: "priority", label: "Priority", type: "select", options: TASK_PRIORITIES, required: true },
    ...(scope === "manager" ? [{ key: "assignee", label: "Assign To", type: "select" as const, options: executiveOptions, required: true }] : []),
  ];
  const proposalFields: FieldConfig[] = [
    { key: "institution", label: "Institution", type: "select", options: data.institutions.map((i) => i.name), required: true },
    { key: "proposalType", label: "Type", type: "select", options: PROPOSAL_TYPES, required: true },
    { key: "amount", label: "Amount (â‚¹)", type: "number", required: true },
    { key: "status", label: "Status", type: "select", options: PROPOSAL_STATUSES, required: true },
    { key: "sentDate", label: "Sent Date", type: "date", required: true },
    { key: "notes", label: "Notes", type: "textarea", colSpan: 2 },
  ];
  const eventFields: FieldConfig[] = [
    { key: "eventName", label: "Event Name", type: "text", required: true, colSpan: 2 },
    { key: "eventType", label: "Type", type: "select", options: EVENT_TYPES, required: true },
    { key: "institution", label: "Institution", type: "select", options: data.institutions.map((i) => i.name) },
    { key: "eventDate", label: "Date", type: "date", required: true },
    { key: "attendees", label: "Attendees", type: "number" },
    { key: "leadsGenerated", label: "Leads Generated", type: "number" },
    { key: "notes", label: "Notes", type: "textarea", colSpan: 2 },
  ];
  const expenseFields: FieldConfig[] = [
    { key: "expenseType", label: "Type", type: "select", options: EXPENSE_TYPES, required: true },
    { key: "amount", label: "Amount (â‚¹)", type: "number", required: true },
    { key: "expenseDate", label: "Date", type: "date", required: true },
    { key: "institution", label: "Institution", type: "select", options: data.institutions.map((i) => i.name) },
    ...(scope === "manager" ? [{ key: "executive", label: "Executive", type: "select" as const, options: executiveOptions, required: true }] : []),
    { key: "notes", label: "Notes", type: "textarea", colSpan: 2 },
  ];

  // â”€â”€ Activity timeline (recent events, visits, proposals) â”€â”€
  const recentActivity: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];
    data.visits.forEach((v) => {
      const inst = data.institutions.find((i) => i.id === v.institutionId);
      items.push({ id: `act-v-${v.id}`, title: `Visit logged: ${inst?.name ?? "Institution"}`, description: v.summary, timestamp: v.visitDate, badge: v.interestLevel });
    });
    data.proposals.forEach((p) => {
      const inst = data.institutions.find((i) => i.id === p.institutionId);
      items.push({ id: `act-p-${p.id}`, title: `${p.proposalType}: ${inst?.name ?? ""}`, description: `â‚¹${p.amount.toLocaleString()} Â· ${p.status}`, timestamp: p.sentDate, badge: p.status });
    });
    return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 8);
  }, [data]);

  // â”€â”€ Reports / Exports â”€â”€
  const exportInstitutions = () => downloadCSV("alliance_institutions.csv", data.institutions.map((i) => ({
    InstitutionID: i.institutionId, Name: i.name, Type: i.type, Board: i.boardUniversity, City: i.city, District: i.district,
    StudentStrength: i.studentStrength, Stage: i.pipelineStage, Priority: i.priority, Executive: userLabelById(i.assignedTo),
  })));
  const exportVisits = () => downloadCSV("alliance_visits.csv", data.visits.map((v) => ({
    Date: v.visitDate, Institution: data.institutions.find((i) => i.id === v.institutionId)?.name ?? "", Executive: userLabelById(v.executiveId),
    MetWith: v.meetingPerson, Interest: v.interestLevel, Status: v.status, NextFollowup: v.nextFollowup, Summary: v.summary,
  })));
  const exportProposals = () => downloadCSV("alliance_proposals.csv", data.proposals.map((p) => ({
    Institution: data.institutions.find((i) => i.id === p.institutionId)?.name ?? "", Type: p.proposalType, Amount: p.amount, Status: p.status, SentDate: p.sentDate,
  })));
  const exportExpenses = () => downloadCSV("alliance_expenses.csv", data.expenses.map((e) => ({
    Date: e.expenseDate, Executive: userLabelById(e.executiveId), Type: e.expenseType, Amount: e.amount, Status: e.status,
    Institution: data.institutions.find((i) => i.id === e.institutionId)?.name ?? "",
  })));

  // Conversion metrics
  const conversionRate = totalInstitutions > 0 ? Math.round((mousClosed / totalInstitutions) * 100) : 0;
  const proposalSuccessRate = data.proposals.length > 0 ? Math.round((data.proposals.filter((p) => p.status === "Approved").length / data.proposals.length) * 100) : 0;
  const totalRevenueForecast = data.proposals.filter((p) => p.status === "Approved" || p.status === "Under Review").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* â”€â”€ KPI Snapshot â”€â”€ */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard title="Institutions" value={totalInstitutions} icon={<Building2 className="h-5 w-5" />} />
        <StatCard title="Meetings (mth)" value={meetingsThisMonth} icon={<Calendar className="h-5 w-5" />} />
        <StatCard title="Proposals" value={proposalsSent} icon={<FileText className="h-5 w-5" />} />
        <StatCard title="MoUs Closed" value={mousClosed} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard title="Pending Tasks" value={data.tasks.filter((t) => t.status !== "Done").length} icon={<ListChecks className="h-5 w-5" />} />
        <StatCard title="Overdue" value={overdueTasks} icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      {/* â”€â”€ Alerts â”€â”€ */}
      {alerts.length > 0 && (
        <div className="rounded-xl bg-card p-4 shadow-card border-l-4 border-warning">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h4 className="text-sm font-semibold text-card-foreground">Active Alerts ({alerts.length})</h4>
          </div>
          <ul className="space-y-1.5">
            {alerts.slice(0, 5).map((a) => (
              <li key={a.id} className={`text-xs ${a.severity === "danger" ? "text-destructive" : "text-warning"}`}>â€¢ {a.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* â”€â”€ Tabs â”€â”€ */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="overflow-x-auto flex-nowrap w-full justify-start">
          <TabsTrigger value="institutions" className="text-[11px] sm:text-xs"><Building2 className="mr-1 h-3.5 w-3.5" />{scope === "executive" ? "My Institutions" : "Institutions"}</TabsTrigger>
          <TabsTrigger value="contacts" className="text-[11px] sm:text-xs"><Users className="mr-1 h-3.5 w-3.5" />Contacts</TabsTrigger>
          <TabsTrigger value="visits" className="text-[11px] sm:text-xs"><Calendar className="mr-1 h-3.5 w-3.5" />Visits</TabsTrigger>
          <TabsTrigger value="tasks" className="text-[11px] sm:text-xs"><ListChecks className="mr-1 h-3.5 w-3.5" />Tasks</TabsTrigger>
          <TabsTrigger value="proposals" className="text-[11px] sm:text-xs"><FileText className="mr-1 h-3.5 w-3.5" />Proposals</TabsTrigger>
          <TabsTrigger value="events" className="text-[11px] sm:text-xs"><PartyPopper className="mr-1 h-3.5 w-3.5" />Events</TabsTrigger>
          <TabsTrigger value="expenses" className="text-[11px] sm:text-xs"><Receipt className="mr-1 h-3.5 w-3.5" />Expenses</TabsTrigger>
          <TabsTrigger value="approvals" className="text-[11px] sm:text-xs"><ShieldCheck className="mr-1 h-3.5 w-3.5" />Approvals</TabsTrigger>
          <TabsTrigger value="reports" className="text-[11px] sm:text-xs"><BarChart3 className="mr-1 h-3.5 w-3.5" />Reports</TabsTrigger>
        </TabsList>

        {/* â”€â”€ Institutions â”€â”€ */}
        <TabsContent value="institutions" className="space-y-4 mt-4">
          {/* Active filter banner */}
          {(stageFilter !== "all" || districtFilter !== "all") && (
            <div className="rounded-lg bg-info/5 border-l-4 border-l-info px-3 py-2 flex items-center justify-between gap-3 text-xs">
              <span className="text-card-foreground">
                Filtered by:{" "}
                {stageFilter !== "all" && <Badge variant="outline" className="text-[10px] mr-1">Stage: {stageFilter}</Badge>}
                {districtFilter !== "all" && <Badge variant="outline" className="text-[10px]">District: {districtFilter}</Badge>}
                <span className="text-muted-foreground ml-2">{data.institutions.length} match{data.institutions.length === 1 ? "" : "es"}</span>
              </span>
              <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => { setStageFilter("all"); setDistrictFilter("all"); }}>Clear</Button>
            </div>
          )}
          {/* Pipeline funnel â€” clickable bars filter institutions by stage */}
          <div className="rounded-xl bg-card p-4 sm:p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pipeline Funnel</h4>
              <span className="text-[10px] text-muted-foreground italic">Click a stage to filter</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={pipelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="stage" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar
                  dataKey="count"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(d: { stage?: string }) => d?.stage && setStageFilter(d.stage)}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <DataTable
            data={data.institutions}
            columns={institutionColumns}
            searchable={(r) => `${r.name} ${r.city} ${r.type} ${r.boardUniversity}`}
            onRowClick={(r) => setDrillInstitution(r)}
            searchPlaceholder="Search institutions, cities, boardsâ€¦"
            emptyMessage={stageFilter !== "all" || districtFilter !== "all" ? "No institutions match the current filters." : "No institutions yet. Add your first high-potential account."}
            toolbar={scope === "manager" ? <Button size="sm" onClick={() => { setEditInstitution(null); setShowInstForm(true); }}><Plus className="mr-1 h-4 w-4" /> Add Institution</Button> : undefined}
          />
        </TabsContent>

        {/* â”€â”€ Contacts â”€â”€ */}
        <TabsContent value="contacts" className="mt-4">
          <DataTable
            data={data.contacts}
            columns={contactColumns}
            searchable={(r) => `${r.name} ${r.designation} ${r.email}`}
            searchPlaceholder="Search contactsâ€¦"
            toolbar={<Button size="sm" onClick={() => setShowContactForm(true)}><Plus className="mr-1 h-4 w-4" /> Add Contact</Button>}
          />
        </TabsContent>

        {/* â”€â”€ Visits â”€â”€ */}
        <TabsContent value="visits" className="mt-4">
          <DataTable
            data={data.visits}
            columns={visitColumns}
            searchable={(r) => `${r.meetingPerson} ${r.summary}`}
            searchPlaceholder="Search visitsâ€¦"
            toolbar={<Button size="sm" onClick={() => setShowVisitForm(true)}><Plus className="mr-1 h-4 w-4" /> Log Visit</Button>}
          />
        </TabsContent>

        {/* â”€â”€ Tasks â”€â”€ */}
        <TabsContent value="tasks" className="mt-4">
          <DataTable
            data={data.tasks}
            columns={taskColumns}
            searchable={(r) => r.title}
            searchPlaceholder="Search tasksâ€¦"
            toolbar={<Button size="sm" onClick={() => setShowTaskForm(true)}><Plus className="mr-1 h-4 w-4" /> Add Task</Button>}
          />
        </TabsContent>

        {/* â”€â”€ Proposals â”€â”€ */}
        <TabsContent value="proposals" className="mt-4">
          <DataTable
            data={data.proposals}
            columns={proposalColumns}
            searchable={(r) => r.proposalType + " " + r.notes}
            searchPlaceholder="Search proposalsâ€¦"
            toolbar={<Button size="sm" onClick={() => setShowProposalForm(true)}><Plus className="mr-1 h-4 w-4" /> New Proposal</Button>}
          />
        </TabsContent>

        {/* â”€â”€ Events â”€â”€ */}
        <TabsContent value="events" className="mt-4">
          <DataTable
            data={data.events}
            columns={eventColumns}
            searchable={(r) => `${r.eventName} ${r.eventType}`}
            searchPlaceholder="Search eventsâ€¦"
            toolbar={<Button size="sm" onClick={() => setShowEventForm(true)}><Plus className="mr-1 h-4 w-4" /> Capture Event</Button>}
          />
        </TabsContent>

        {/* â”€â”€ Expenses â”€â”€ */}
        <TabsContent value="expenses" className="mt-4">
          <DataTable
            data={data.expenses}
            columns={expenseColumns}
            searchable={(r) => `${r.expenseType} ${r.notes}`}
            searchPlaceholder="Search expensesâ€¦"
            toolbar={<Button size="sm" onClick={() => setShowExpenseForm(true)}><Plus className="mr-1 h-4 w-4" /> Submit Expense</Button>}
          />
        </TabsContent>

        {/* â”€â”€ Approvals â”€â”€ */}
        <TabsContent value="approvals" className="mt-4">
          <ApprovalCenter />
        </TabsContent>

        {/* â”€â”€ Reports / Insights â”€â”€ */}
        <TabsContent value="reports" className="space-y-4 mt-4">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            <StatCard title="Conversion Rate" value={`${conversionRate}%`} icon={<TrendingUp className="h-5 w-5" />} />
            <StatCard title="Proposal Success" value={`${proposalSuccessRate}%`} icon={<FileText className="h-5 w-5" />} />
            <StatCard title="Revenue Forecast" value={`â‚¹${(totalRevenueForecast / 1000).toFixed(0)}k`} icon={<BarChart3 className="h-5 w-5" />} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h4 className="text-sm font-semibold text-card-foreground mb-3">Monthly Visits</h4>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthlyVisits}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h4 className="text-sm font-semibold text-card-foreground mb-3">Executive Leaderboard</h4>
              <div className="space-y-2">
                {execLeaderboard.sort((a, b) => b.mous - a.mous).map((u) => (
                  <div key={u.name} className="flex items-center justify-between rounded-lg border p-2.5 text-xs">
                    <span className="font-medium text-card-foreground">{u.name}</span>
                    <div className="flex gap-3 text-[10px]">
                      <span className="text-muted-foreground">Meetings: <span className="font-semibold text-card-foreground">{u.meetings}</span></span>
                      <span className="text-muted-foreground">MoUs: <span className="font-semibold text-success">{u.mous}</span></span>
                      <span className="text-muted-foreground">Revenue: <span className="font-semibold text-primary">â‚¹{(u.revenue / 1000).toFixed(0)}k</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-card p-5 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h4 className="text-sm font-semibold text-card-foreground">Export Reports</h4>
              <span className="text-[10px] text-muted-foreground">CSV downloads</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button variant="outline" size="sm" onClick={exportInstitutions}><Download className="mr-1 h-3.5 w-3.5" /> Institutions</Button>
              <Button variant="outline" size="sm" onClick={exportVisits}><Download className="mr-1 h-3.5 w-3.5" /> Visits</Button>
              <Button variant="outline" size="sm" onClick={exportProposals}><Download className="mr-1 h-3.5 w-3.5" /> Proposals</Button>
              <Button variant="outline" size="sm" onClick={exportExpenses}><Download className="mr-1 h-3.5 w-3.5" /> Expenses</Button>
            </div>
          </div>

          <div className="rounded-xl bg-card p-5 shadow-card">
            <h4 className="text-sm font-semibold text-card-foreground mb-3">Recent Activity</h4>
            <ActivityTimeline items={recentActivity} />
          </div>
        </TabsContent>
      </Tabs>

      {/* â”€â”€ Dialogs â”€â”€ */}
      <Dialog open={showInstForm} onOpenChange={(o) => { setShowInstForm(o); if (!o) setEditInstitution(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editInstitution ? "Edit" : "Add"} Institution</DialogTitle></DialogHeader>
          <FormEngine
            fields={institutionFields}
            initial={editInstitution ? { ...editInstitution, assignedTo: userLabelById(editInstitution.assignedTo) } : { pipelineStage: "Identified", type: "School", boardUniversity: "CBSE" }}
            onSubmit={saveInstitution}
            onCancel={() => { setShowInstForm(false); setEditInstitution(null); }}
            submitLabel={editInstitution ? "Update" : "Save"}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showVisitForm} onOpenChange={setShowVisitForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Log Visit</DialogTitle></DialogHeader>
          <FormEngine fields={visitFields} initial={{ visitDate: todayIso(), status: "Completed", interestLevel: "Warm" }} onSubmit={saveVisit} onCancel={() => setShowVisitForm(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Institution Contact</DialogTitle></DialogHeader>
          <FormEngine fields={contactFields} initial={{}} onSubmit={saveContact} onCancel={() => setShowContactForm(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
          <FormEngine fields={taskFields} initial={{ priority: "Medium", dueDate: todayIso() }} onSubmit={saveTask} onCancel={() => setShowTaskForm(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={showProposalForm} onOpenChange={setShowProposalForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Proposal</DialogTitle></DialogHeader>
          <FormEngine fields={proposalFields} initial={{ status: "Draft", sentDate: todayIso(), proposalType: "MoU" }} onSubmit={saveProposal} onCancel={() => setShowProposalForm(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={showEventForm} onOpenChange={setShowEventForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Capture Event</DialogTitle></DialogHeader>
          <FormEngine fields={eventFields} initial={{ eventType: "Workshop", eventDate: todayIso() }} onSubmit={saveEvent} onCancel={() => setShowEventForm(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={showExpenseForm} onOpenChange={setShowExpenseForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Submit Expense</DialogTitle></DialogHeader>
          <FormEngine fields={expenseFields} initial={{ expenseType: "Travel", expenseDate: todayIso() }} onSubmit={saveExpense} onCancel={() => setShowExpenseForm(false)} />
        </DialogContent>
      </Dialog>

      {/* Drill-down dialog for an institution */}
      <Dialog open={!!drillInstitution} onOpenChange={(o) => !o && setDrillInstitution(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{drillInstitution?.name}</DialogTitle></DialogHeader>
          {drillInstitution && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div><span className="text-muted-foreground">ID:</span> <span className="font-mono">{drillInstitution.institutionId}</span></div>
                <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{drillInstitution.type}</span></div>
                <div><span className="text-muted-foreground">Board:</span> <span className="font-medium">{drillInstitution.boardUniversity}</span></div>
                <div><span className="text-muted-foreground">City:</span> <span className="font-medium">{drillInstitution.city}</span></div>
                <div><span className="text-muted-foreground">Students:</span> <span className="font-semibold">{drillInstitution.studentStrength.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Priority:</span> <StatusPill value={drillInstitution.priority} /></div>
                <div><span className="text-muted-foreground">Stage:</span> <StatusPill value={drillInstitution.pipelineStage} /></div>
                <div><span className="text-muted-foreground">Executive:</span> <span className="font-medium">{userLabelById(drillInstitution.assignedTo)}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">Decision Maker:</span> <span className="font-medium">{drillInstitution.decisionMaker}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">Phone:</span> {drillInstitution.phone} Â· <span className="text-muted-foreground">Email:</span> {drillInstitution.email}</div>
                <div className="col-span-full"><span className="text-muted-foreground">Address:</span> {drillInstitution.address}</div>
                {drillInstitution.notes && <div className="col-span-full"><span className="text-muted-foreground">Notes:</span> {drillInstitution.notes}</div>}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Visits</h4>
                {data.visits.filter((v) => v.institutionId === drillInstitution.id).map((v) => (
                  <div key={v.id} className="rounded-lg border p-2 mb-1 text-xs flex items-center justify-between">
                    <span>{v.visitDate} Â· {v.meetingPerson}</span>
                    <StatusPill value={v.interestLevel} />
                  </div>
                ))}
                {data.visits.filter((v) => v.institutionId === drillInstitution.id).length === 0 && <p className="text-xs text-muted-foreground italic">No visits yet.</p>}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Proposals</h4>
                {data.proposals.filter((p) => p.institutionId === drillInstitution.id).map((p) => (
                  <div key={p.id} className="rounded-lg border p-2 mb-1 text-xs flex items-center justify-between">
                    <span>{p.proposalType} Â· â‚¹{p.amount.toLocaleString()}</span>
                    <StatusPill value={p.status} />
                  </div>
                ))}
                {data.proposals.filter((p) => p.institutionId === drillInstitution.id).length === 0 && <p className="text-xs text-muted-foreground italic">No proposals yet.</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}



