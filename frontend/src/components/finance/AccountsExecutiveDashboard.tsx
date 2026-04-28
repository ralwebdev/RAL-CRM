/**
 * Accounts Executive - backend-backed landing dashboard.
 * Uses finance-store snapshot hydrated from `/api/finance/*`.
 */
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Wallet, IndianRupee, FileText, Clock, AlertTriangle, Receipt, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { getFinance, subscribeFinance, hydrateFinanceFromBackend, recomputeOverdue } from "@/lib/finance-store";
import { fmtINR } from "@/components/finance/FinanceKpi";
import { cn } from "@/lib/utils";

function useFinance() {
  return useSyncExternalStore(
    (l) => subscribeFinance(l),
    () => getFinance(),
    () => getFinance(),
  );
}

export function AccountsExecutiveDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const fin = useFinance();

  useEffect(() => {
    void hydrateFinanceFromBackend().catch(() => { /* ignore */ });
    recomputeOverdue();
  }, []);

  const kpis = useMemo(() => {
    const totalBilled = fin.invoices.reduce((s, i) => s + i.total, 0);
    const totalCollected = fin.payments.reduce((s, p) => s + p.amount, 0);
    const outstanding = fin.invoices.reduce((s, i) => s + Math.max(0, i.total - i.amountPaid), 0);

    const openInvoices = fin.invoices.filter((i) => i.status !== "Paid" && i.status !== "Cancelled");
    const overdueInvoices = fin.invoices.filter((i) => i.status === "Overdue");
    const partialInvoices = fin.invoices.filter((i) => i.status === "Partial");

    const pendingExpenses = fin.expenses.filter((e) => e.status === "Pending");
    const pendingExpenseTotal = pendingExpenses.reduce((s, e) => s + e.total, 0);

    return {
      totalBilled,
      totalCollected,
      outstanding,
      openInvoices,
      overdueInvoices,
      partialInvoices,
      pendingExpenses,
      pendingExpenseTotal,
    };
  }, [fin]);

  const topOverdue = useMemo(
    () =>
      [...kpis.overdueInvoices]
        .sort((a, b) => (b.total - b.amountPaid) - (a.total - a.amountPaid))
        .slice(0, 6),
    [kpis.overdueInvoices],
  );

  const topPendingExpenses = useMemo(
    () => [...kpis.pendingExpenses].sort((a, b) => (b.total - a.total)).slice(0, 6),
    [kpis.pendingExpenses],
  );

  if (!currentUser) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Accounts - Executive
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Daily control panel for billing, collections, and verifications.</p>
        </div>
        <Badge variant="outline" className="w-fit">
          {currentUser.name} · {currentUser.role.replace("_", " ")}
        </Badge>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total Billed</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{fmtINR(kpis.totalBilled)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total Collected</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-success">{fmtINR(kpis.totalCollected)}</p>
        </Card>
        <Card className={cn("p-4 border-l-4", kpis.outstanding > 0 ? "border-l-warning" : "border-l-success")}>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Outstanding</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{fmtINR(kpis.outstanding)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{kpis.openInvoices.length} open invoice(s)</p>
        </Card>
        <Card className={cn("p-4 border-l-4", kpis.overdueInvoices.length > 0 ? "border-l-destructive" : "border-l-success")}>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Overdue</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{kpis.overdueInvoices.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{kpis.partialInvoices.length} partial</p>
        </Card>
      </div>

      <div className="rounded-xl bg-card p-4 shadow-card">
        <h4 className="text-sm font-semibold text-card-foreground mb-3">Quick Actions</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Link to="/accounts">
            <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1">
              <Wallet className="h-4 w-4" />
              <span className="text-[11px]">Open Accounts</span>
            </Button>
          </Link>
          <Link to="/accounts">
            <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1">
              <FileText className="h-4 w-4" />
              <span className="text-[11px]">Invoices</span>
            </Button>
          </Link>
          <Link to="/accounts">
            <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1">
              <IndianRupee className="h-4 w-4" />
              <span className="text-[11px]">Payments</span>
            </Button>
          </Link>
          <Link to="/accounts">
            <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1">
              <Receipt className="h-4 w-4" />
              <span className="text-[11px]">Expenses</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-card p-5 shadow-card">
          <h4 className="text-sm font-semibold text-card-foreground mb-1 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Overdue Invoices
          </h4>
          <p className="text-xs text-muted-foreground mb-3">Highest balance due first.</p>
          {topOverdue.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No overdue invoices.</p>
          ) : (
            <div className="space-y-2">
              {topOverdue.map((inv) => (
                <button
                  key={inv.id}
                  type="button"
                  onClick={() => navigate("/accounts")}
                  className="w-full text-left rounded-md border p-2.5 hover:bg-muted/40 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{inv.customerName || "Customer"}</p>
                      <p className="text-[10px] text-muted-foreground">{inv.invoiceNo} · due {inv.dueDate.slice(0, 10)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums">{fmtINR(Math.max(0, inv.total - inv.amountPaid))}</p>
                      <span className="text-[10px] text-destructive">Overdue</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-card p-5 shadow-card">
          <h4 className="text-sm font-semibold text-card-foreground mb-1 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-warning" />
            Pending Expenses
          </h4>
          <p className="text-xs text-muted-foreground mb-3">Waiting for processing/approval.</p>
          {topPendingExpenses.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No pending expenses.</p>
          ) : (
            <div className="space-y-2">
              {topPendingExpenses.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => navigate("/accounts")}
                  className="w-full text-left rounded-md border p-2.5 hover:bg-muted/40 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{e.vendorName || e.category || "Expense"}</p>
                      <p className="text-[10px] text-muted-foreground">{e.expenseNo} · {e.spendDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums">{fmtINR(e.total)}</p>
                      <span className="text-[10px] text-warning">Pending</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 flex justify-end">
            <Button size="sm" variant="outline" onClick={() => navigate("/accounts")} className="gap-1.5">
              Open queue <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

