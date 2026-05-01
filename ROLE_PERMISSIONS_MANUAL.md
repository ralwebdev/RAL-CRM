# RAL-CMS Role Permissions Manual

This manual provides a comprehensive breakdown of options, permissions, and navigation available to every user role within the RAL-CMS.

---

## 1. System Administrator (`admin`) & Owner (`owner`)
The highest authority levels with full visibility and control over all system modules.

### Navigation
- Dashboard (Full Overview)
- Accounts (Finance Management)
- Campaigns (Marketing & ROI)
- Leads (Full Pipeline)
- Telecalling (Performance Monitoring)
- Counseling (Admissions)
- Revenue (Financial Analytics)
- Institutional (B2B Sales)
- Follow-ups (Global Queue)
- Admissions (Enrollment Records)
- Approvals (Workflow Management)

### Permissions
- **Campaigns:** Create, Edit, and Delete any campaign.
- **Leads:** View all leads, update any lead status, and transfer leads between any users.
- **Finance:** Full access to invoices, payments, and expenses. Ability to bulk send and edit records.
- **User Management:** View and manage all system users.
- **Approvals:** Act on any pending approval request across alliance and finance modules.

---

## 2. Telecaller (`telecaller`)
Focused on lead qualification and initial engagement.

### Navigation
- Dashboard (Personal Stats)
- Telecalling (Smart Call Queue & Workspace)
- Follow-ups (Personal Tasks)

### Permissions
- **Leads:** View and manage only leads assigned to them.
- **Calls:** Record call outcomes, conversation insights, and schedule follow-ups.
- **Status:** Advance leads through "New", "Contacted", "Connected", and "Interested" stages.
- **Walk-ins:** Ability to schedule walk-in counseling sessions for interested leads.

---

## 3. Academic Counselor (`counselor`)
Focused on conversion, walk-in counseling, and student enrollment.

### Navigation
- Dashboard (Counseling Stats)
- Counseling (Active Discussions)
- Leads (Assigned Pipeline)
- Follow-ups (Personal Tasks)
- Admissions (Personal Conversions)

### Permissions
- **Leads:** View and manage leads assigned for counseling.
- **Counseling:** Update walk-in status, counseling outcomes, and expected joining dates.
- **Scholarships:** Discuss and apply scholarship percentages.
- **Admissions:** Finalize admissions and record initial payment details.

---

## 4. Marketing Manager (`marketing_manager`)
Focused on lead generation, campaign performance, and attribution.

### Navigation
- Dashboard (Marketing Overview)
- Campaigns (Management & Analytics)
- Leads (Pipeline Distribution)
- Revenue (ROI Tracking)

### Permissions
- **Campaigns:** Create and edit marketing campaigns and track budgets.
- **Leads:** Create new leads (bulk or manual), assign/re-assign leads to telecallers using round-robin or manual selection.
- **Analytics:** Access detailed source-wise performance and ROAS data.

---

## 5. Telecalling Manager (`telecalling_manager`)
Oversees the telecalling team and ensures SLA compliance.

### Navigation
- Dashboard (Team Productivity)
- Telecalling (Team Workspace)
- Leads (Team Pipeline)
- Follow-ups (Team Queue)

### Permissions
- **Monitoring:** View performance metrics for all telecallers.
- **SLA Tracking:** Identify aging leads and missed follow-ups across the team.
- **Assignment:** Ensure leads are being contacted efficiently.

---

## 6. Alliance Roles

### Alliance Manager (`alliance_manager`)
- **Navigation:** Dashboard, Industry Alliances.
- **Permissions:** Manage all institutional relationships, review and approve executive proposals/expenses.

### Alliance Executive (`alliance_executive`)
- **Navigation:** Dashboard, My Alliances.
- **Permissions:** Manage assigned institutions, log visits, create proposals, and submit expense requests for approval.

---

## 7. Accounts Roles

### Accounts Manager (`accounts_manager`)
- **Navigation:** Dashboard, Accounts, Approvals.
- **Permissions:** 
  - Review financial entries and act on approvals.
  - Full management of vendor relations.
  - **Invoices:** Ability to Generate, Edit, and Bulk Send invoices.

### Accounts Executive (`accounts_executive`)
- **Navigation:** Dashboard, Accounts, Approvals.
- **Permissions:** 
  - **Invoices:** Data entry and generation of invoices.
  - **Workflow:** Submit financial records for manager review.
  - Restricted from bulk sending or direct editing of verified records.

---
*Manual compiled based on codebase analysis of RBAC logic in `auth-context.tsx` and role-specific components.*
