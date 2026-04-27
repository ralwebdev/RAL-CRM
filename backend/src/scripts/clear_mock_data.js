import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filesToClear = [
    {
        path: 'src/lib/mock-data.ts',
        replacements: [
            {
                pattern: /export const mockCourses: [\s\S]+? = \[[\s\S]*?\];/g,
                replacement: 'export const mockCourses: Course[] = [];'
            },
            {
                pattern: /export const mockCampaigns: [\s\S]+? = \[[\s\S]*?\];/g,
                replacement: 'export const mockCampaigns: Campaign[] = [];'
            },
            {
                pattern: /export const mockLeads: [\s\S]+? = \[[\s\S]*?\];/g,
                replacement: 'export const mockLeads: Lead[] = [];'
            },
            {
                pattern: /export const mockCallLogs: [\s\S]+? = \[[\s\S]*?\];/g,
                replacement: 'export const mockCallLogs: CallLog[] = [];'
            },
            {
                pattern: /export const mockFollowUps: [\s\S]+? = \[[\s\S]*?\];/g,
                replacement: 'export const mockFollowUps: FollowUp[] = [];'
            },
            {
                pattern: /export const mockAdmissions: [\s\S]+? = \[[\s\S]*?\];/g,
                replacement: 'export const mockAdmissions: Admission[] = [];'
            }
        ]
    },
    {
        path: 'src/lib/vertical-data.ts',
        replacements: [
            {
                pattern: /export const mockInternshipAdmissions: [\s\S]+? = \[[\s\S]*?\];/g,
                replacement: 'export const mockInternshipAdmissions: InternshipAdmission[] = [];'
            },
            {
                pattern: /export const mockCollegeAccounts: [\s\S]+? = \[[\s\S]*?\];/g,
                replacement: 'export const mockCollegeAccounts: CollegeAccount[] = [];'
            },
            {
                pattern: /export const mockCollegePrograms: [\s\S]+? = \[[\s\S]*?\];/g,
                replacement: 'export const mockCollegePrograms: CollegeProgram[] = [];'
            },
            {
                pattern: /export const mockCollegeStudents: [\s\S]+? = \[[\s\S]*?\];/g,
                replacement: 'export const mockCollegeStudents: CollegeStudent[] = [];'
            },
            {
                pattern: /export const mockSchoolAccounts: [\s\S]+? = \[[\s\S]*?\];/g,
                replacement: 'export const mockSchoolAccounts: SchoolAccount[] = [];'
            },
            {
                pattern: /export const mockSchoolPrograms: [\s\S]+? = \[[\s\S]*?\];/g,
                replacement: 'export const mockSchoolPrograms: SchoolProgram[] = [];'
            },
            {
                pattern: /export const mockSchoolStudents: [\s\S]+? = \[[\s\S]*?\];/g,
                replacement: 'export const mockSchoolStudents: SchoolStudent[] = [];'
            },
            {
                pattern: /export const internshipLeadEntries = \[[\s\S]*?\];/g,
                replacement: 'export const internshipLeadEntries: any[] = [];'
            }
        ]
    },
    {
        path: 'src/lib/alliance-data.ts',
        replacements: [
            {
                pattern: /const rawInstitutions: [\s\S]+? = \[[\s\S]*?\];/g,
                replacement: 'const rawInstitutions: Omit<Institution, "priorityScore" | "priority">[] = [];'
            },
            {
                pattern: /export const allianceContacts: [\s\S]+? = \[[\s\S]*?\];/g,
                replacement: 'export const allianceContacts: AllianceContact[] = [];'
            },
            {
                pattern: /export const allianceVisits: [\s\S]+? = \[[\s\S]*?\];/g,
                replacement: 'export const allianceVisits: AllianceVisit[] = [];'
            },
            {
                pattern: /export const allianceTasks: [\s\S]+? = \[[\s\S]*?\];/g,
                replacement: 'export const allianceTasks: AllianceTask[] = [];'
            },
            {
                pattern: /export const allianceProposals: [\s\S]+? = \[[\s\S]*?\];/g,
                replacement: 'export const allianceProposals: AllianceProposal[] = [];'
            },
            {
                pattern: /export const allianceEvents: [\s\S]+? = \[[\s\S]*?\];/g,
                replacement: 'export const allianceEvents: AllianceEvent[] = [];'
            },
            {
                pattern: /export const allianceExpenses: [\s\S]+? = \[[\s\S]*?\];/g,
                replacement: 'export const allianceExpenses: AllianceExpense[] = [];'
            }
        ]
    },
    {
        path: 'src/lib/finance-store.ts',
        replacements: [
            {
                pattern: /function seed\(\): FinanceState \{[\s\S]+?\n\}/g,
                replacement: `function seed(): FinanceState {
  return {
    invoices: [], payments: [], emiSchedules: [], expenses: [], vendors: [], vendorBills: [], budgets: [], cashflow: [],
    logs: [],
    counters: { inv: 0, rcpt: 0, exp: 0, bill: 0, pi: 0, ti: 0 },
  };
}`
            }
        ]
    },
    {
        path: 'src/lib/collection-store.ts',
        replacements: [
            {
                pattern: /function seed\(\): Collection\[\] \{[\s\S]+?\n\}/g,
                replacement: `function seed(): Collection[] {
  return [];
}`
            }
        ]
    },
    {
        path: 'src/lib/approvals.ts',
        replacements: [
            {
                pattern: /function seedApprovals\(\): ApprovalRequest\[\] \{[\s\S]+?\n\}/g,
                replacement: `function seedApprovals(): ApprovalRequest[] {
  return [];
}`
            },
            {
                pattern: /function seedLogs\(\): ApprovalLog\[\] \{[\s\S]+?\n\}/g,
                replacement: `function seedLogs(): ApprovalLog[] {
  return [];
}`
            }
        ]
    }
];

filesToClear.forEach(fileConf => {
    const fullPath = path.resolve(__dirname, '../../..', 'frontend', fileConf.path);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        fileConf.replacements.forEach(rep => {
            content = content.replace(rep.pattern, rep.replacement);
        });
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Cleared mock data in ${fileConf.path}`);
    } else {
        console.error(`File not found: ${fullPath}`);
    }
});
