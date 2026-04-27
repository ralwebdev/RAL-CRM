/**
 * Mock data for multi-vertical entities:
 * Internship leads/admissions, College accounts/programs, School accounts/programs
 */
import {
  CollegeAccount, CollegeProgram, CollegeStudent,
  SchoolAccount, SchoolProgram, SchoolStudent,
  InternshipAdmission,
} from "./vertical-types";

// ── Internship Leads (stored as regular leads with programChannel + internship fields) ──
// These are added to mockLeads in mock-data.ts

// ── Internship Admissions ──
export const mockInternshipAdmissions: InternshipAdmission[] = [];

// ── College Accounts ──
export const mockCollegeAccounts: CollegeAccount[] = [];

// ── College Programs ──
export const mockCollegePrograms: CollegeProgram[] = [];

// ── College Students ──
export const mockCollegeStudents: CollegeStudent[] = [];

// ── School Accounts ──
export const mockSchoolAccounts: SchoolAccount[] = [];

// ── School Programs ──
export const mockSchoolPrograms: SchoolProgram[] = [];

// ── School Students (sample) ──
export const mockSchoolStudents: SchoolStudent[] = [];

// ── Internship Leads (to be merged into mockLeads) ──
export const internshipLeadEntries: any[] = [];
