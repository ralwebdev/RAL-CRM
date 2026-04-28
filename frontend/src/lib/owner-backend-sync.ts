import { store } from "./mock-data";
import {
  fetchMarketingAdmissions,
  fetchMarketingCampaigns,
  fetchMarketingLeads,
} from "./marketing-api";
import {
  fetchTelecallingCallLogs,
  fetchTelecallingFollowUps,
  fetchTelecallingUsers,
} from "./telecalling-api";

let inFlight: Promise<void> | null = null;

export async function syncOwnerDashboardFromBackend(): Promise<void> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const [campaigns, leads, admissions, callLogs, followUps, users] = await Promise.all([
      fetchMarketingCampaigns(),
      fetchMarketingLeads(),
      fetchMarketingAdmissions(),
      fetchTelecallingCallLogs(),
      fetchTelecallingFollowUps(),
      fetchTelecallingUsers(),
    ]);

    store.saveCampaigns(campaigns);
    store.saveLeads(leads);
    store.saveAdmissions(admissions);
    store.saveCallLogs(callLogs);
    store.saveFollowUps(followUps);
    store.saveUsers(users);
  })();

  try {
    await inFlight;
  } finally {
    inFlight = null;
  }
}

export async function syncMarketingDashboardFromBackend(): Promise<void> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const [campaigns, leads, admissions] = await Promise.all([
      fetchMarketingCampaigns(),
      fetchMarketingLeads(),
      fetchMarketingAdmissions(),
    ]);

    store.saveCampaigns(campaigns);
    store.saveLeads(leads);
    store.saveAdmissions(admissions);
  })();

  try {
    await inFlight;
  } finally {
    inFlight = null;
  }
}
