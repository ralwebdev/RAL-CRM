import { useEffect, useMemo, useState } from "react";
import { store } from "@/lib/mock-data";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, GraduationCap, PhoneCall, Timer, Users, Zap, Loader2, Target } from "lucide-react";
import { fetchMarketingAdmissions, fetchMarketingLeads } from "@/lib/marketing-api";
import { fetchTelecallingCallLogs, fetchTelecallingUsers } from "@/lib/telecalling-api";
import type { Admission, CallLog, Lead, User } from "@/lib/types";

function daysBetween(a: string, b: string) {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

export function TeleCallerManagerDashboard() {
  const [users, setUsers] = useState<User[]>(store.getUsers());
  const [leads, setLeads] = useState<Lead[]>(store.getLeads());
  const [callLogs, setCallLogs] = useState<CallLog[]>(store.getCallLogs());
  const [admissions, setAdmissions] = useState<Admission[]>(store.getAdmissions());
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [leadRows, admissionRows, callLogRows, userRows] = await Promise.all([
          fetchMarketingLeads(),
          fetchMarketingAdmissions(),
          fetchTelecallingCallLogs(),
          fetchTelecallingUsers(),
        ]);
        if (!active) return;

        setLeads(leadRows);
        setAdmissions(admissionRows);
        setCallLogs(callLogRows);
        setUsers(userRows);

        store.saveLeads(leadRows);
        store.saveAdmissions(admissionRows);
        store.saveCallLogs(callLogRows);
        store.saveUsers(userRows);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const telecallers = useMemo(() => users.filter((u) => u.role === "telecaller"), [users]);

  const conversionData = useMemo(
    () =>
      admissions
        .map((adm) => {
          const lead = leads.find((l) => l.id === adm.leadId);
          return lead ? { att: daysBetween(lead.createdAt, adm.admissionDate), telecallerId: lead.assignedTelecallerId } : null;
        })
        .filter(Boolean) as { att: number; telecallerId: string }[],
    [admissions, leads],
  );

  const overallATT = conversionData.length > 0 ? +(conversionData.reduce((s, c) => s + c.att, 0) / conversionData.length).toFixed(1) : 0;

  const tcPerf = useMemo(
    () =>
      telecallers.map((tc) => {
        const assigned = leads.filter((l) => l.assignedTelecallerId === tc.id);
        const calls = callLogs.filter((cl) => cl.telecallerId === tc.id);
        const connected = calls.filter((cl) => cl.outcome === "Connected" || cl.outcome === "Interested");
        const converted = conversionData.filter((c) => c.telecallerId === tc.id);
        const avgATT = converted.length > 0 ? +(converted.reduce((s, c) => s + c.att, 0) / converted.length).toFixed(1) : 0;
        const uncontacted = assigned.filter((l) => l.status !== "Admission" && l.status !== "Lost" && !calls.some((cl) => cl.leadId === l.id));

        return {
          name: tc.name,
          assigned: assigned.length,
          calls: calls.length,
          connected: connected.length,
          admissions: converted.length,
          avgATT,
          connectionRate: calls.length > 0 ? +((connected.length / calls.length) * 100).toFixed(1) : 0,
          uncontacted: uncontacted.length,
        };
      }),
    [telecallers, leads, callLogs, conversionData],
  );

  const agingLeads = leads.filter((l) => l.status !== "Admission" && l.status !== "Lost" && daysBetween(l.createdAt, today) > 7);
  const totalCallsToday = callLogs.filter((cl) => cl.createdAt === today).length;
  const totalConnectedToday = callLogs.filter((cl) => cl.createdAt === today && (cl.outcome === "Connected" || cl.outcome === "Interested")).length;
  const totalActiveLeads = leads.filter((l) => l.status !== "Admission" && l.status !== "Lost").length;

  if (loading) {
    return (
      <div className="rounded-xl bg-card p-8 shadow-card flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading telecalling dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Telecaller Manager Dashboard</h1>
        <p className="text-sm text-muted-foreground">Consolidated telecaller performance and team productivity</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
        <StatCard title="Total Calls Today" value={totalCallsToday} icon={<PhoneCall className="h-5 w-5" />} />
        <StatCard title="Connected Today" value={totalConnectedToday} icon={<Zap className="h-5 w-5" />} />
        <StatCard title="Telecallers" value={telecallers.length} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Active Leads" value={totalActiveLeads} icon={<Target className="h-5 w-5" />} />
        <StatCard title="Admissions" value={admissions.length} icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard title="Overall ATT" value={`${overallATT}d`} icon={<Timer className="h-5 w-5" />} />
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-xl">
          <TabsTrigger value="performance">Team Performance</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline Health</TabsTrigger>
          <TabsTrigger value="attention">Needs Attention</TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground">Agent Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Agent</th>
                    <th className="pb-2 font-medium text-center">Assigned</th>
                    <th className="pb-2 font-medium text-center">Calls</th>
                    <th className="pb-2 font-medium text-center">Connected</th>
                    <th className="pb-2 font-medium text-center">Conn %</th>
                    <th className="pb-2 font-medium text-center">Admissions</th>
                    <th className="pb-2 font-medium text-center">ATT</th>
                    <th className="pb-2 font-medium text-center">Uncontacted</th>
                  </tr>
                </thead>
                <tbody>
                  {tcPerf.map((tc) => (
                    <tr key={tc.name} className="border-b last:border-0">
                      <td className="py-3 font-medium text-card-foreground">{tc.name}</td>
                      <td className="py-3 text-center text-muted-foreground">{tc.assigned}</td>
                      <td className="py-3 text-center text-muted-foreground">{tc.calls}</td>
                      <td className="py-3 text-center text-muted-foreground">{tc.connected}</td>
                      <td className="py-3 text-center font-medium text-card-foreground">{tc.connectionRate}%</td>
                      <td className="py-3 text-center text-muted-foreground">{tc.admissions}</td>
                      <td className="py-3 text-center">{tc.avgATT > 0 ? <Badge variant="outline">{tc.avgATT}d</Badge> : <span className="text-muted-foreground">-</span>}</td>
                      <td className="py-3 text-center">{tc.uncontacted > 0 ? <Badge variant="outline" className="bg-destructive/10 text-destructive text-[10px]">{tc.uncontacted}</Badge> : <span className="text-muted-foreground">0</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pipeline">
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-3 text-sm font-semibold text-card-foreground">Pipeline Snapshot</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {(["New", "Contacted", "Follow-up", "Counseling", "Qualified", "Admission"] as const).map((status) => (
                <div key={status} className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">{status}</p>
                  <p className="mt-1 text-xl font-bold text-card-foreground">{leads.filter((l) => l.status === status).length}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="attention">
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-3 text-sm font-semibold text-card-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Aging Leads ({agingLeads.length})
            </h3>
            <div className="space-y-2">
              {agingLeads.slice(0, 10).map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{l.interestedCourse} · {l.source}</p>
                  </div>
                  <Badge variant="outline" className="bg-destructive/10 text-destructive text-[10px]">
                    {daysBetween(l.createdAt, today)} days old
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
