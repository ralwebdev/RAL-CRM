import { Campaign, Lead, CallLog, FollowUp, Admission, User, UTMTracking, LeadActivity, Course } from "./types";
import {
  CollegeAccount, CollegeProgram, CollegeStudent,
  SchoolAccount, SchoolProgram, SchoolStudent,
  InternshipAdmission,
} from "./vertical-types";
import {
  mockInternshipAdmissions, mockCollegeAccounts, mockCollegePrograms, mockCollegeStudents,
  mockSchoolAccounts, mockSchoolPrograms, mockSchoolStudents, internshipLeadEntries,
} from "./vertical-data";
import { db } from "./db";

const defaultUtm: UTMTracking = { utmSource: "", utmMedium: "", utmCampaign: "", utmContent: "", utmTerm: "" };

/* ═══════ COURSE CATALOG ═══════ */
export const mockCourses: Course[] = [];

export const COURSE_FEE_TIERS = [15000, 45000, 90000, 118000, 160000, 190000, 260000, 410000];

export function getFeeBand(fee: number): string {
  if (fee <= 45000) return "Low Ticket";
  if (fee <= 118000) return "Mid Ticket";
  return "High Ticket";
}

/* ═══════ BUSINESS BENCHMARKS ═══════ */
export const BENCHMARKS = {
  monthlyMarketingSpend: 40000,
  monthlyBilling: 600000,
  cpaMin: 5500,
  cpaMax: 6500,
  marketingSpendRatioMax: 10,
  minROAS: 10,
};

/* ═══════ USERS ═══════ */
export const mockUsers: User[] = [];

/* ═══════ CAMPAIGNS ═══════ */
export const mockCampaigns: Campaign[] = [];

/* ═══════ LEADS ═══════ */
export const mockLeads: Lead[] = [];

/* ═══════ CALL LOGS ═══════ */
export const mockCallLogs: CallLog[] = [];

/* ═══════ FOLLOW-UPS ═══════ */
export const mockFollowUps: FollowUp[] = [];

/* ═══════ ADMISSIONS (16 students across Red Apple courses) ═══════ */
// Sources: LinkedIn(2), Meta(4), Walk-in(2), Instagram(2), Education Fair(1), Alumni Referral(1), Google(1), Referral(1), YouTube(1), Partner Institute(1)
export const mockAdmissions: Admission[] = [];

/* ═══════ MERGE INTERNSHIP LEADS INTO MAIN LEADS ═══════ */
// Add internship leads to the main leads array (cast is safe since Lead interface now supports programChannel)
const allMockLeads: Lead[] = [...mockLeads, ...internshipLeadEntries as unknown as Lead[]];

/* ═══════ LOCAL STORAGE HELPERS ═══════ */
const STORAGE_KEYS = {
  campaigns: "crm_campaigns",
  leads: "crm_leads",
  callLogs: "crm_call_logs",
  followUps: "crm_follow_ups",
  admissions: "crm_admissions",
  courses: "crm_courses",
  internshipAdmissions: "crm_internship_admissions",
  collegeAccounts: "crm_college_accounts",
  collegePrograms: "crm_college_programs",
  collegeStudents: "crm_college_students",
  schoolAccounts: "crm_school_accounts",
  schoolPrograms: "crm_school_programs",
  schoolStudents: "crm_school_students",
  users: "crm_users",
} as const;

function getOrInit<T>(key: string, defaults: T[]): T[] {
  return db.getOrInitSync(key, defaults);
}

function save<T>(key: string, data: T[]) {
  db.createSync(key, data);
}

export const store = {
  getCampaigns: () => getOrInit(STORAGE_KEYS.campaigns, mockCampaigns),
  saveCampaigns: (d: Campaign[]) => save(STORAGE_KEYS.campaigns, d),

  getLeads: () => getOrInit(STORAGE_KEYS.leads, allMockLeads),
  saveLeads: (d: Lead[]) => save(STORAGE_KEYS.leads, d),

  getCallLogs: () => getOrInit(STORAGE_KEYS.callLogs, mockCallLogs),
  saveCallLogs: (d: CallLog[]) => save(STORAGE_KEYS.callLogs, d),

  getFollowUps: () => getOrInit(STORAGE_KEYS.followUps, mockFollowUps),
  saveFollowUps: (d: FollowUp[]) => save(STORAGE_KEYS.followUps, d),

  getAdmissions: () => getOrInit(STORAGE_KEYS.admissions, mockAdmissions),
  saveAdmissions: (d: Admission[]) => save(STORAGE_KEYS.admissions, d),

  getCourses: () => getOrInit(STORAGE_KEYS.courses, mockCourses),
  saveCourses: (d: Course[]) => save(STORAGE_KEYS.courses, d),

  // ── Multi-Vertical Stores ──
  getInternshipAdmissions: () => getOrInit(STORAGE_KEYS.internshipAdmissions, mockInternshipAdmissions),
  saveInternshipAdmissions: (d: InternshipAdmission[]) => save(STORAGE_KEYS.internshipAdmissions, d),

  getCollegeAccounts: () => getOrInit(STORAGE_KEYS.collegeAccounts, mockCollegeAccounts),
  saveCollegeAccounts: (d: CollegeAccount[]) => save(STORAGE_KEYS.collegeAccounts, d),

  getCollegePrograms: () => getOrInit(STORAGE_KEYS.collegePrograms, mockCollegePrograms),
  saveCollegePrograms: (d: CollegeProgram[]) => save(STORAGE_KEYS.collegePrograms, d),

  getCollegeStudents: () => getOrInit(STORAGE_KEYS.collegeStudents, mockCollegeStudents),
  saveCollegeStudents: (d: CollegeStudent[]) => save(STORAGE_KEYS.collegeStudents, d),

  getSchoolAccounts: () => getOrInit(STORAGE_KEYS.schoolAccounts, mockSchoolAccounts),
  saveSchoolAccounts: (d: SchoolAccount[]) => save(STORAGE_KEYS.schoolAccounts, d),

  getSchoolPrograms: () => getOrInit(STORAGE_KEYS.schoolPrograms, mockSchoolPrograms),
  saveSchoolPrograms: (d: SchoolProgram[]) => save(STORAGE_KEYS.schoolPrograms, d),

  getSchoolStudents: () => getOrInit(STORAGE_KEYS.schoolStudents, mockSchoolStudents),
  saveSchoolStudents: (d: SchoolStudent[]) => save(STORAGE_KEYS.schoolStudents, d),

  getUsers: () => getOrInit(STORAGE_KEYS.users, mockUsers),
  saveUsers: (d: User[]) => save(STORAGE_KEYS.users, d),

  resetAll: () => {
    Object.values(STORAGE_KEYS).forEach((k) => db.deleteSync(k));
  },
};
