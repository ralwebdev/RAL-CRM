import { api } from "./api";
import type { Admission, Campaign, Lead } from "./types";

type UnknownRecord = Record<string, any>;

const EMPTY_UTM = {
  utmSource: "",
  utmMedium: "",
  utmCampaign: "",
  utmContent: "",
  utmTerm: "",
};

const isObjectId = (value?: string) => !!value && /^[a-fA-F0-9]{24}$/.test(value);

const toId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  if (typeof value === "object" && value.id) return String(value.id);
  return "";
};

const toDateOnly = (value: any): string => {
  if (!value) return new Date().toISOString().split("T")[0];
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
  return d.toISOString().split("T")[0];
};

const toIso = (value: any): string => {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
};

const sanitizeObject = <T extends UnknownRecord>(obj: T): T => {
  const out: UnknownRecord = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined) out[key] = value;
  });
  return out as T;
};

const mapCampaignFromApi = (raw: UnknownRecord): Campaign => {
  const adSets = Array.isArray(raw.adSets) ? raw.adSets : [];
  const landingPages = Array.isArray(raw.landingPages) ? raw.landingPages : [];
  return {
    id: toId(raw),
    name: raw.name || "",
    platform: raw.platform || "Meta",
    objective: raw.objective || "Lead Generation",
    budget: Number(raw.budget || 0),
    dailyBudget: Number(raw.dailyBudget || 0),
    startDate: raw.startDate || "",
    endDate: raw.endDate || "",
    targetLocation: raw.targetLocation || "",
    leadsGenerated: Number(raw.leadsGenerated || 0),
    costPerLead: Number(raw.costPerLead || 0),
    createdAt: toDateOnly(raw.createdAt || raw.startDate),
    ageGroup: raw.ageGroup || "",
    educationLevel: raw.educationLevel || "",
    interestCategory: raw.interestCategory || "",
    targetCity: raw.targetCity || "",
    marketingManager: typeof raw.marketingManager === "string" ? raw.marketingManager : toId(raw.marketingManager),
    campaignOwner: typeof raw.campaignOwner === "string" ? raw.campaignOwner : toId(raw.campaignOwner),
    campaignNotes: raw.campaignNotes || "",
    approvalStatus: raw.approvalStatus || "Draft",
    adSets: adSets.map((as: UnknownRecord) => ({
      id: toId(as),
      campaignId: toId(raw),
      name: as.name || "",
      audienceType: as.audienceType || "Cold",
      sourceAudience: as.sourceAudience || "",
      retargetingSource: as.retargetingSource || "",
      ads: (Array.isArray(as.ads) ? as.ads : []).map((ad: UnknownRecord) => ({
        id: toId(ad),
        adType: ad.adType || "Image",
        creativeHook: ad.creativeHook || "",
        primaryMessage: ad.primaryMessage || "",
        cta: ad.cta || "",
      })),
    })),
    utmTracking: { ...EMPTY_UTM, ...(raw.utmTracking || {}) },
    landingPages: landingPages.map((lp: UnknownRecord) => ({
      id: toId(lp),
      campaignId: toId(raw),
      url: lp.url || "",
      pageVersion: lp.pageVersion || "",
      conversionRate: Number(lp.conversionRate || 0),
    })),
  };
};

const mapLeadFromApi = (raw: UnknownRecord): Lead => {
  const activities = Array.isArray(raw.activities) ? raw.activities : [];
  const transferHistory = Array.isArray(raw.transferHistory) ? raw.transferHistory : [];
  return {
    ...raw,
    id: toId(raw),
    campaignId: toId(raw.campaignId),
    assignedTelecallerId: toId(raw.assignedTelecallerId),
    assignedCounselor: toId(raw.assignedCounselorId || raw.assignedCounselor),
    assignedCounselorId: toId(raw.assignedCounselorId || raw.assignedCounselor),
    leadOwner: toId(raw.leadOwner),
    walkInCounselor: toId(raw.walkInCounselor),
    createdAt: toDateOnly(raw.createdAt),
    activities: activities.map((a: UnknownRecord) => ({
      ...a,
      id: toId(a),
      leadId: toId(raw),
      userId: toId(a.userId),
      timestamp: toIso(a.timestamp),
    })),
    transferHistory: transferHistory.map((t: UnknownRecord) => ({
      ...t,
      id: toId(t),
      fromUserId: toId(t.fromUserId),
      toUserId: toId(t.toUserId),
      timestamp: toIso(t.timestamp),
    })),
  } as Lead;
};

const mapAdmissionFromApi = (raw: UnknownRecord): Admission => ({
  ...raw,
  id: toId(raw),
  leadId: toId(raw.leadId),
  createdAt: toDateOnly(raw.createdAt),
  admissionDate: toDateOnly(raw.admissionDate || raw.createdAt),
}) as Admission;

const campaignPayload = (campaign: Partial<Campaign>) => {
  const adSets = (campaign.adSets || []).map((as) => sanitizeObject({
    name: as.name,
    audienceType: as.audienceType,
    sourceAudience: as.sourceAudience || "",
    retargetingSource: as.retargetingSource || "",
    ads: (as.ads || []).map((ad) => sanitizeObject({
      adType: ad.adType,
      creativeHook: ad.creativeHook || "",
      primaryMessage: ad.primaryMessage || "",
      cta: ad.cta || "",
    })),
  }));

  const landingPages = (campaign.landingPages || []).map((lp) => sanitizeObject({
    url: lp.url,
    pageVersion: lp.pageVersion || "",
    conversionRate: Number(lp.conversionRate || 0),
  }));

  return sanitizeObject({
    name: campaign.name,
    platform: campaign.platform,
    objective: campaign.objective,
    budget: campaign.budget,
    dailyBudget: campaign.dailyBudget,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    targetLocation: campaign.targetLocation || "",
    leadsGenerated: Number(campaign.leadsGenerated || 0),
    costPerLead: Number(campaign.costPerLead || 0),
    ageGroup: campaign.ageGroup || "",
    educationLevel: campaign.educationLevel || "",
    interestCategory: campaign.interestCategory || "",
    targetCity: campaign.targetCity || "",
    marketingManager: isObjectId(campaign.marketingManager) ? campaign.marketingManager : undefined,
    campaignOwner: isObjectId(campaign.campaignOwner) ? campaign.campaignOwner : undefined,
    campaignNotes: campaign.campaignNotes || "",
    approvalStatus: campaign.approvalStatus,
    adSets,
    utmTracking: { ...EMPTY_UTM, ...(campaign.utmTracking || {}) },
    landingPages,
  });
};

const leadPayload = (lead: Partial<Lead>) => {
  const activities = (lead.activities || []).map((a) => sanitizeObject({
    type: a.type,
    description: a.description,
    channel: a.channel,
    userId: isObjectId(a.userId) ? a.userId : undefined,
    timestamp: a.timestamp ? toIso(a.timestamp) : undefined,
  }));

  const transferHistory = (lead.transferHistory || []).map((t) => sanitizeObject({
    fromUserId: isObjectId(t.fromUserId) ? t.fromUserId : undefined,
    toUserId: isObjectId(t.toUserId) ? t.toUserId : undefined,
    reason: t.reason,
    timestamp: t.timestamp ? toIso(t.timestamp) : undefined,
  }));

  const payload = sanitizeObject({
    ...lead,
    campaignId: isObjectId(lead.campaignId) ? lead.campaignId : undefined,
    assignedTelecallerId: isObjectId(lead.assignedTelecallerId) ? lead.assignedTelecallerId : undefined,
    assignedCounselorId: isObjectId((lead as any).assignedCounselorId)
      ? (lead as any).assignedCounselorId
      : (isObjectId(lead.assignedCounselor) ? lead.assignedCounselor : undefined),
    leadOwner: isObjectId(lead.leadOwner) ? lead.leadOwner : undefined,
    walkInCounselor: isObjectId(lead.walkInCounselor) ? lead.walkInCounselor : undefined,
    activities,
    transferHistory,
    createdAt: undefined,
    id: undefined,
  });

  return payload;
};

export async function fetchMarketingCampaigns(): Promise<Campaign[]> {
  const response = await api.get("/api/campaigns");
  const items = Array.isArray(response.data) ? response.data : [];
  return items.map(mapCampaignFromApi);
}

export async function createMarketingCampaign(campaign: Campaign): Promise<Campaign> {
  const response = await api.post("/api/campaigns", campaignPayload(campaign));
  return mapCampaignFromApi(response.data);
}

export async function updateMarketingCampaign(id: string, patch: Partial<Campaign>): Promise<Campaign> {
  const response = await api.put(`/api/campaigns/${id}`, campaignPayload(patch));
  return mapCampaignFromApi(response.data);
}

export async function fetchMarketingLeads(): Promise<Lead[]> {
  const response = await api.get("/api/leads");
  const items = Array.isArray(response.data) ? response.data : [];
  return items.map(mapLeadFromApi);
}

export async function createMarketingLead(lead: Lead): Promise<Lead> {
  const response = await api.post("/api/leads", leadPayload(lead));
  return mapLeadFromApi(response.data);
}

export async function updateMarketingLead(id: string, patch: Partial<Lead>): Promise<Lead> {
  const response = await api.put(`/api/leads/${id}`, leadPayload(patch));
  return mapLeadFromApi(response.data);
}

export async function fetchMarketingAdmissions(): Promise<Admission[]> {
  const response = await api.get("/api/admissions");
  const items = Array.isArray(response.data) ? response.data : [];
  return items.map(mapAdmissionFromApi);
}

export async function createMarketingAdmission(admission: Admission): Promise<Admission> {
  const payload = sanitizeObject({
    ...admission,
    id: undefined,
    _id: undefined,
  });
  const response = await api.post("/api/admissions", payload);
  return mapAdmissionFromApi(response.data);
}

export async function updateMarketingAdmission(id: string, patch: Partial<Admission>): Promise<Admission> {
  const payload = sanitizeObject({
    ...patch,
    id: undefined,
    _id: undefined,
  });
  const response = await api.put(`/api/admissions/${id}`, payload);
  return mapAdmissionFromApi(response.data);
}
