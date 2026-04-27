# RAL-CMS File Mapping

This document provides a comprehensive mapping between the Frontend and Backend files for the RAL-CMS project.

## 🗺️ Feature-wise File Mapping

| Feature / Module | Frontend Page (`Frontend/src/pages/`) | Backend Route (`Backend/src/routes/`) | Backend Controller (`Backend/src/controllers/`) | Backend Models (`Backend/src/models/`) |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication** | `LoginPage.tsx` | `authRoutes.js` | `authController.js` | `User.js` |
| **Dashboard** | `RoleDashboard.tsx` | `revenueRoutes.js` | `revenueController.js` | `User.js`, `Target.js`, `Lead.js` |
| **Marketing** | `CampaignsPage.tsx` | `campaignRoutes.js` | `campaignController.js` | `Campaign.js` |
| **Leads Mgt** | `LeadsPage.tsx` | `leadRoutes.js` | `leadController.js` | `Lead.js` |
| **Telecalling** | `TelecallingPage.tsx` | `leadRoutes.js`, `callLogRoutes.js` | `leadController.js`, `callLogController.js` | `Lead.js`, `CallLog.js` |
| **Follow-ups** | `FollowUpsPage.tsx` | `followUpRoutes.js` | `followUpController.js` | `FollowUp.js` |
| **Counseling** | `CounselingPage.tsx` | `leadRoutes.js`, `followUpRoutes.js` | `leadController.js`, `followUpController.js` | `Lead.js`, `FollowUp.js` |
| **Admissions** | `AdmissionsPage.tsx` | `admissionRoutes.js` | `admissionController.js` | `Admission.js` |
| **Finance / Accounts**| `AccountsPage.tsx` | `financeRoutes.js` | `financeController.js` | `FinanceInvoice.js`, `FinancePayment.js`, `FinanceExpense.js`, `FinanceVendor.js`, `PiTiMapping.js` |
| **Alliances** | `AlliancesPage.tsx`, `AllianceInstitutionProfile.tsx`| `allianceRoutes.js` | `allianceController.js` | `AllianceInstitution.js`, `AllianceContact.js`, `AllianceVisit.js`, `AllianceProposal.js`, `AllianceTask.js` |
| **Approvals** | `ApprovalsPage.tsx` | `allianceRoutes.js` | `allianceController.js` | `AllianceApproval.js` |
| **Analytics** | `RevenueAnalyticsPage.tsx`| `revenueRoutes.js` | `revenueController.js` | `Target.js`, `Lead.js`, `Admission.js` |
| **User Mgt** | (Admin restricted) | `userRoutes.js` | `userController.js` | `User.js` |

---

## 🏗️ Shared Infrastructure & Logic

### Frontend (`Frontend/src/`)
*   **Hooks (`hooks/`)**: These serve as the data-fetching bridge using TanStack Query.
    *   `use-leads.ts`, `use-admissions.ts`, `use-followups.ts`, `use-users.ts`, `use-calllogs.ts`.
*   **Lib (`lib/`)**:
    *   `auth-context.tsx`: Manages authentication state and JWT tokens.
    *   `types.ts` & `vertical-types.ts`: Define TypeScript interfaces for data consistency.
    *   `api.ts` (if exists) or mock files: Currently, many pages use `mock-data.ts` and `vertical-data.ts`, but the migration to the real backend is mapped to the routes above.
*   **Components (`components/`)**:
    *   `AppLayout.tsx`: The main shell containing navigation and sidebar.
    *   `ui/`: Reusable Shadcn/UI components (Button, Input, Table, etc.).

### Backend (`Backend/src/`)
*   **Middleware (`middleware/`)**:
    *   `authMiddleware.js`: Handles JWT validation and `authorize(roles)` logic for RBAC (Role-Based Access Control).
*   **Entry Point**:
    *   `server.js`: Initializes Express, connects to MongoDB via Mongoose, and registers all API routes.
*   **Data Seeding**:
    *   `seedMaster.js`: Script to populate the database with initial users and system data.

---

## 🔗 Backend Entry Point Mapping (from `server.js`)
```javascript
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/calllogs', callLogRoutes);
app.use('/api/followups', followUpRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/alliances', allianceRoutes);
```
