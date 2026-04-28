import { useEffect, useSyncExternalStore } from "react";
import { Shield } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { subscribeStore, getStoreVersion } from "@/lib/mock-data";
import { syncDashboardDataByRole } from "@/lib/owner-backend-sync";
import {
  TelecallerDashboard,
  CounselorDashboard,
  MarketingDashboard,
  OwnerDashboard,
  AdminDashboard,
} from "@/pages/role-dashboard/modules";
import { AllianceManagerDashboard } from "@/components/alliance/AllianceManagerDashboard";
import { AllianceExecutiveDashboard } from "@/components/alliance/AllianceExecutiveDashboard";
import { AccountsExecutiveDashboard } from "@/components/finance/AccountsExecutiveDashboard";
import { AccountsModule } from "@/components/finance/AccountsModule";
import { TeleCallerManagerDashboard } from "@/components/telecalling/TeleCallerManagerDashboard";

export default function RoleDashboard() {
  const { currentUser } = useAuth();
  useSyncExternalStore(subscribeStore, getStoreVersion, getStoreVersion);

  useEffect(() => {
    let alive = true;
    const syncNow = async () => {
      if (!currentUser?.role || !alive) return;
      await syncDashboardDataByRole(currentUser.role).catch(() => {
        /* keep existing local data if sync fails */
      });
    };

    void syncNow();

    const onFocus = () => {
      void syncNow();
    };
    window.addEventListener("focus", onFocus);

    const intervalId = window.setInterval(() => {
      void syncNow();
    }, 30000);

    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
      window.clearInterval(intervalId);
    };
  }, [currentUser?.role]);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">User role not assigned. Please contact administrator.</p>
        </div>
      </div>
    );
  }

  switch (currentUser.role) {
    case "telecaller":
      return <TelecallerDashboard />;
    case "counselor":
      return <CounselorDashboard />;
    case "marketing_manager":
      return <MarketingDashboard />;
    case "telecalling_manager":
      return <TeleCallerManagerDashboard />;
    case "owner":
      return (
        <div className="space-y-6">
          <OwnerDashboard />
          <TeleCallerManagerDashboard />
          <CounselorDashboard />
          <MarketingDashboard />
          <AccountsModule />
        </div>
      );
    case "admin":
      return (
        <div className="space-y-6">
          <AdminDashboard />
          <TeleCallerManagerDashboard />
          <CounselorDashboard />
          <MarketingDashboard />
          <AccountsModule />
        </div>
      );
    case "alliance_manager":
      return <AllianceManagerDashboard />;
    case "alliance_executive":
      return <AllianceExecutiveDashboard />;
    case "accounts_executive":
      return <AccountsExecutiveDashboard />;
    case "accounts_manager":
      return <AccountsModule />;
    default:
      return (
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-destructive">You do not have permission to access this dashboard.</p>
        </div>
      );
  }
}
