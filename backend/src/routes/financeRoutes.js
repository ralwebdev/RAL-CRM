import express from 'express';
import {
  getVendors,
  createVendor,
  updateVendor,
  getInvoices,
  createInvoice,
  updateInvoice,
  getExpenses,
  createExpense,
  updateExpense,
  getPayments,
  createPayment,
  convertPiToTi,
  getPiTiMappings,
  linkExistingTiToPi,
  getVendorBills,
  createVendorBill,
  updateVendorBill,
  getEmiSchedules,
  createEmiSchedule,
  updateEmiSchedule
} from '../controllers/financeController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply protection to all finance routes, but authorization is route-specific
router.use(protect);

// Vendor routes
router.route('/vendors')
  .get(authorize('admin', 'accounts_manager', 'accounts_executive', 'owner'), getVendors)
  .post(authorize('admin', 'accounts_manager', 'accounts_executive', 'owner'), createVendor);
router.route('/vendors/:id')
  .put(authorize('admin', 'accounts_manager', 'accounts_executive', 'owner'), updateVendor);

// Vendor Bill routes
router.route('/vendor-bills')
  .get(authorize('admin', 'accounts_manager', 'accounts_executive', 'owner'), getVendorBills)
  .post(authorize('admin', 'accounts_manager', 'accounts_executive', 'owner'), createVendorBill);
router.route('/vendor-bills/:id')
  .put(authorize('admin', 'accounts_manager', 'accounts_executive', 'owner'), updateVendorBill);


// Invoice routes
router.route('/invoices')
  .get(authorize('admin', 'accounts_manager', 'accounts_executive', 'owner', 'counselor'), getInvoices)
  .post(authorize('admin', 'accounts_manager', 'accounts_executive', 'owner'), createInvoice);
router.route('/invoices/:id')
  .put(authorize('admin', 'accounts_manager', 'accounts_executive', 'owner'), updateInvoice);

// Expense routes
router.route('/expenses')
  .get(authorize('admin', 'accounts_manager', 'accounts_executive', 'owner'), getExpenses)
  .post(authorize('admin', 'accounts_manager', 'accounts_executive', 'owner'), createExpense);
router.route('/expenses/:id')
  .put(authorize('admin', 'accounts_manager', 'accounts_executive', 'owner'), updateExpense);

// Payment routes
router.route('/payments')
  .get(authorize('admin', 'accounts_manager', 'accounts_executive', 'owner', 'counselor'), getPayments)
  .post(authorize('admin', 'accounts_manager', 'accounts_executive', 'owner'), createPayment);

// PI-TI Lifecycle routes
router.route('/convert-pi-to-ti')
  .post(authorize('admin', 'accounts_manager', 'accounts_executive', 'owner'), convertPiToTi);

router.route('/link-pi-ti')
  .post(authorize('admin', 'accounts_manager', 'accounts_executive', 'owner'), linkExistingTiToPi);

router.route('/pi-ti-mappings')
  .get(authorize('admin', 'accounts_manager', 'accounts_executive', 'owner'), getPiTiMappings);

// EMI Schedule routes
router.route('/emi-schedules')
  .get(authorize('admin', 'accounts_manager', 'accounts_executive', 'owner', 'counselor'), getEmiSchedules)
  .post(authorize('admin', 'accounts_manager', 'accounts_executive', 'owner'), createEmiSchedule);
router.route('/emi-schedules/:id')
  .put(authorize('admin', 'accounts_manager', 'accounts_executive', 'owner'), updateEmiSchedule);

export default router;
