import AllianceInstitution from '../models/AllianceInstitution.js';
import AllianceContact from '../models/AllianceContact.js';
import AllianceVisit from '../models/AllianceVisit.js';
import AllianceTask from '../models/AllianceTask.js';
import AllianceProposal from '../models/AllianceProposal.js';
import AllianceEvent from '../models/AllianceEvent.js';
import AllianceExpense from '../models/AllianceExpense.js';
import FinanceExpense from '../models/FinanceExpense.js';
import User from '../models/User.js';
import { AllianceApproval, AllianceApprovalLog } from '../models/AllianceApproval.js';

// @desc    Get all alliance institutions (Scoped by RBAC)
// @route   GET /api/alliances/institutions
// @access  Private
export const getInstitutions = async (req, res) => {
  try {
    let query = {};
    
    // RBAC Scoping
    if (req.user.role === 'alliance_executive') {
      query.assignedExecutiveId = req.user._id;
    }
    // alliance_manager, admin, owner see all

    const institutions = await AllianceInstitution.find(query)
      .populate('assignedExecutiveId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(institutions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create an institution
// @route   POST /api/alliances/institutions
// @access  Private
export const createInstitution = async (req, res) => {
  try {
    // Generate sequential institutionId
    const count = await AllianceInstitution.countDocuments();
    const seq = (count + 1).toString().padStart(4, '0');
    const institutionId = `INS-${seq}`;

    const institution = new AllianceInstitution({
      ...req.body,
      institutionId,
      // Ensure assignedExecutiveId is mapped correctly
      assignedExecutiveId: req.body.assignedExecutiveId || req.user._id
    });
    
    const createdInstitution = await institution.save();
    res.status(201).json(createdInstitution);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update an institution
// @route   PUT /api/alliances/institutions/:id
// @access  Private
export const updateInstitution = async (req, res) => {
  try {
    const institution = await AllianceInstitution.findById(req.params.id);
    if (institution) {
      // Basic RBAC check for update if executive
      if (req.user.role === 'alliance_executive' && institution.assignedExecutiveId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this record' });
      }

      Object.assign(institution, req.body);
      const updatedInstitution = await institution.save();
      res.json(updatedInstitution);
    } else {
      res.status(404).json({ message: 'Institution not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete an institution
// @route   DELETE /api/alliances/institutions/:id
// @access  Private/Admin,Owner,Manager
export const deleteInstitution = async (req, res) => {
  try {
    const institution = await AllianceInstitution.findById(req.params.id);
    if (institution) {
      await institution.deleteOne();
      res.json({ message: 'Institution removed' });
    } else {
      res.status(404).json({ message: 'Institution not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all visits
// @route   GET /api/alliances/visits
// @access  Private
export const getVisits = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'alliance_executive') {
      query.executiveId = req.user._id;
    }
    const visits = await AllianceVisit.find(query)
      .populate('institutionId', 'name')
      .populate('executiveId', 'name')
      .sort({ visitDate: -1 });
    res.json(visits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a visit
// @route   POST /api/alliances/visits
// @access  Private
export const createVisit = async (req, res) => {
  try {
    const canAssignExecutive = ['alliance_manager', 'admin', 'owner'].includes(req.user.role);
    const visit = new AllianceVisit({
      ...req.body,
      executiveId: canAssignExecutive && req.body.executiveId ? req.body.executiveId : req.user._id
    });
    const createdVisit = await visit.save();
    res.status(201).json(createdVisit);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a visit
// @route   PUT /api/alliances/visits/:id
// @access  Private
export const updateVisit = async (req, res) => {
  try {
    const visit = await AllianceVisit.findById(req.params.id);
    if (visit) {
      if (req.user.role === 'alliance_executive' && visit.executiveId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this visit' });
      }
      Object.assign(visit, req.body);
      const updatedVisit = await visit.save();
      res.json(updatedVisit);
    } else {
      res.status(404).json({ message: 'Visit not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get proposals
// @route   GET /api/alliances/proposals
// @access  Private
export const getProposals = async (req, res) => {
  try {
    // Proposals are usually viewed by institution, but for RBAC we might need to join or scope
    // For now, allow viewing all if manager, or join with institution for executive
    let query = {};
    if (req.user.role === 'alliance_executive') {
      const myInstitutions = await AllianceInstitution.find({ assignedExecutiveId: req.user._id }).select('_id');
      const instIds = myInstitutions.map(i => i._id);
      query.institutionId = { $in: instIds };
    }
    
    const proposals = await AllianceProposal.find(query)
      .populate('institutionId', 'name')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(proposals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a proposal
// @route   POST /api/alliances/proposals
// @access  Private
export const createProposal = async (req, res) => {
  try {
    const proposal = new AllianceProposal(req.body);
    const createdProposal = await proposal.save();
    res.status(201).json(createdProposal);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a proposal
// @route   PUT /api/alliances/proposals/:id
// @access  Private
export const updateProposal = async (req, res) => {
  try {
    const proposal = await AllianceProposal.findById(req.params.id);
    if (proposal) {
      Object.assign(proposal, req.body);
      const updatedProposal = await proposal.save();
      res.json(updatedProposal);
    } else {
      res.status(404).json({ message: 'Proposal not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get tasks
// @route   GET /api/alliances/tasks
// @access  Private
export const getTasks = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'alliance_executive') {
      query.assignedTo = req.user._id;
    }
    const tasks = await AllianceTask.find(query)
      .populate('institutionId', 'name')
      .populate('assignedTo', 'name')
      .sort({ dueDate: 1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a task
// @route   POST /api/alliances/tasks
// @access  Private
export const createTask = async (req, res) => {
  try {
    const task = new AllianceTask({
      ...req.body,
      assignedTo: req.body.assignedTo || req.user._id
    });
    const createdTask = await task.save();
    res.status(201).json(createdTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a task
// @route   PUT /api/alliances/tasks/:id
// @access  Private
export const updateTask = async (req, res) => {
  try {
    const task = await AllianceTask.findById(req.params.id);
    if (task) {
      if (req.user.role === 'alliance_executive' && task.assignedTo.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this task' });
      }
      Object.assign(task, req.body);
      const updatedTask = await task.save();
      res.json(updatedTask);
    } else {
      res.status(404).json({ message: 'Task not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get events
// @route   GET /api/alliances/events
// @access  Private
export const getEvents = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'alliance_executive') {
      const myInstitutions = await AllianceInstitution.find({ assignedExecutiveId: req.user._id }).select('_id');
      const instIds = myInstitutions.map(i => i._id);
      query.institutionId = { $in: instIds };
    }
    const events = await AllianceEvent.find(query)
      .populate('institutionId', 'name')
      .sort({ eventDate: -1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create an event
// @route   POST /api/alliances/events
// @access  Private
export const createEvent = async (req, res) => {
  try {
    const event = new AllianceEvent(req.body);
    const createdEvent = await event.save();
    res.status(201).json(createdEvent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get expenses
// @route   GET /api/alliances/expenses
// @access  Private
export const getExpenses = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'alliance_executive') {
      query.executiveId = req.user._id;
    }
    const expenses = await AllianceExpense.find(query)
      .populate('institutionId', 'name')
      .populate('executiveId', 'name')
      .sort({ expenseDate: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create an expense
// @route   POST /api/alliances/expenses
// @access  Private
export const createExpense = async (req, res) => {
  try {
    const canAssignExecutive = ['alliance_manager', 'admin', 'owner'].includes(req.user.role);
    const expense = new AllianceExpense({
      ...req.body,
      executiveId: canAssignExecutive && req.body.executiveId ? req.body.executiveId : req.user._id
    });
    const createdExpense = await expense.save();
    res.status(201).json(createdExpense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update an expense status
// @route   PUT /api/alliances/expenses/:id
// @access  Private
export const updateExpense = async (req, res) => {
  try {
    const expense = await AllianceExpense.findById(req.params.id);
    if (expense) {
      Object.assign(expense, req.body);
      const updatedExpense = await expense.save();
      res.json(updatedExpense);
    } else {
      res.status(404).json({ message: 'Expense not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get approvals
// @route   GET /api/alliances/approvals
// @access  Private
export const getApprovals = async (req, res) => {
  try {
    const { role, _id } = req.user;
    let query = {};

    if (role === 'alliance_manager' || role === 'accounts_manager') {
      // Manager sees pending items routed to them + their own submissions
      query = {
        $or: [
          { currentApproverRole: role },
          { submittedBy: _id }
        ]
      };
    } else if (role === 'alliance_executive' || role === 'accounts_executive' || role === 'counselor') {
      // Executives and Counselors only see what they submitted
      query = { submittedBy: _id };
    }
    // Admin/Owner see all

    const approvals = await AllianceApproval.find(query)
      .populate('submittedBy', 'name')
      .populate('currentApproverId', 'name')
      .sort({ createdAt: -1 });
    res.json(approvals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit an approval request
// @route   POST /api/alliances/approvals
// @access  Private
export const submitApproval = async (req, res) => {
  try {
    const { requestId, requestType, title, amount, priority, notes, meta } = req.body;
    const { role, _id } = req.user;

    // Resolve next approver role
    let currentApproverRole = req.body.currentApproverRole || 'admin';
    if (!req.body.currentApproverRole) {
      if (role === 'alliance_executive') currentApproverRole = 'alliance_manager';
      if (role === 'accounts_executive') currentApproverRole = 'accounts_manager';
    }

    const approval = new AllianceApproval({
      requestId, requestType, title, amount, priority, notes, meta,
      submittedBy: _id,
      submittedRole: role,
      currentApproverRole,
      status: 'Pending'
    });

    const createdApproval = await approval.save();

    // Log the submission
    const log = new AllianceApprovalLog({
      approvalId: createdApproval._id,
      action: 'Submit',
      fromStatus: 'Pending',
      toStatus: 'Pending',
      actedBy: _id,
      actedRole: role
    });
    await log.save();

    res.status(201).json(createdApproval);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Act on an approval request
// @route   PUT /api/alliances/approvals/:id
// @access  Private
export const actOnApproval = async (req, res) => {
  try {
    const { action, comment, nextReviewDate } = req.body;
    const { role, _id } = req.user;

    const approval = await AllianceApproval.findById(req.params.id);
    if (!approval) return res.status(404).json({ message: 'Approval not found' });

    const fromStatus = approval.status;
    let toStatus = fromStatus;

    if (action === 'Approve') toStatus = 'Approved';
    else if (action === 'Reject') toStatus = 'Rejected';
    else if (action === 'Hold') toStatus = 'Hold';
    else if (action === 'Override') toStatus = 'Overridden';
    else if (action === 'Resubmit') toStatus = 'Resubmitted';

    approval.status = toStatus;
    if (nextReviewDate) approval.nextReviewDate = nextReviewDate;
    
    const updatedApproval = await approval.save();

    // Log the action
    const log = new AllianceApprovalLog({
      approvalId: updatedApproval._id,
      action,
      fromStatus,
      toStatus,
      actedBy: _id,
      actedRole: role,
      comment
    });
    await log.save();
    
    // Sync back to FinanceExpense if applicable
    if (approval.meta && approval.meta.module === 'finance' && approval.requestType === 'Expense Bill') {
      try {
        const expense = await FinanceExpense.findById(approval.requestId);
        if (expense) {
          expense.status = toStatus;
          if (toStatus === 'Approved') expense.approvedBy = _id;
          await expense.save();
        }
      } catch (err) {
        console.error('Failed to sync back to FinanceExpense:', err);
      }
    }

    // Sync back to AllianceExpense when approvals originate from alliance module
    if (approval.meta && approval.meta.module === 'alliance') {
      try {
        const allianceExpense = await AllianceExpense.findById(approval.requestId);
        if (allianceExpense) {
          if (toStatus === 'Approved') allianceExpense.status = 'Approved';
          else if (toStatus === 'Rejected') allianceExpense.status = 'Rejected';
          else if (toStatus === 'Overridden') allianceExpense.status = 'Approved';
          await allianceExpense.save();
        }
      } catch (err) {
        console.error('Failed to sync back to AllianceExpense:', err);
      }
    }

    res.json(updatedApproval);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get approval logs
// @route   GET /api/alliances/approvals/logs
// @access  Private
export const getApprovalLogs = async (req, res) => {
  try {
    const logs = await AllianceApprovalLog.find({})
      .populate('actedBy', 'name')
      .populate('approvalId', 'title')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get alliance contacts
// @route   GET /api/alliances/contacts
// @access  Private
export const getContacts = async (req, res) => {
  try {
    const contacts = await AllianceContact.find({})
      .populate('institutionId', 'name')
      .sort({ name: 1 });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create an alliance contact
// @route   POST /api/alliances/contacts
// @access  Private
export const createContact = async (req, res) => {
  try {
    const contact = new AllianceContact(req.body);
    const createdContact = await contact.save();
    res.status(201).json(createdContact);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete an alliance contact
// @route   DELETE /api/alliances/contacts/:id
// @access  Private
export const deleteContact = async (req, res) => {
  try {
    const contact = await AllianceContact.findById(req.params.id);
    if (contact) {
      await contact.deleteOne();
      res.json({ message: 'Contact removed' });
    } else {
      res.status(404).json({ message: 'Contact not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all alliance users for assignment
// @route   GET /api/alliances/users
// @access  Private
export const getAllianceUsers = async (req, res) => {
  try {
    const users = await User.find({
      role: { $in: ['alliance_manager', 'alliance_executive'] }
    }).select('name email role status createdAt');
    
    // Map to frontend interface if needed, though they already match mostly
    const mapped = users.map(u => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status || 'active',
      createdAt: u.createdAt
    }));
    
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
