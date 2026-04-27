import Lead from '../models/Lead.js';
import Admission from '../models/Admission.js';
import Campaign from '../models/Campaign.js';
import CallLog from '../models/CallLog.js';
import FollowUp from '../models/FollowUp.js';
import User from '../models/User.js';
import Target from '../models/Target.js';
import FinancePayment from '../models/FinancePayment.js';
import FinanceInvoice from '../models/FinanceInvoice.js';
import FinanceExpense from '../models/FinanceExpense.js';
import AllianceInstitution from '../models/AllianceInstitution.js';
import AllianceProposal from '../models/AllianceProposal.js';
import AllianceVisit from '../models/AllianceVisit.js';
import AllianceTask from '../models/AllianceTask.js';

/**
 * Helper to get date ranges for the current and previous month
 */
const getMonthRanges = () => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    return {
        current: { start: currentMonthStart, end: currentMonthEnd, key: currentMonthStart.toISOString().substring(0, 7) },
        previous: { start: prevMonthStart, end: prevMonthEnd, key: prevMonthStart.toISOString().substring(0, 7) }
    };
};

// @desc    Get comprehensive revenue analytics data
// @route   GET /api/revenue/dashboard
// @access  Private
export const getRevenueDashboard = async (req, res) => {
    try {
        const { current, previous } = getMonthRanges();

        const [
            leads, 
            admissions, 
            campaigns, 
            callLogs, 
            followUps, 
            users,
            currentTarget,
            prevTarget,
            payments,
            invoices,
            expenses,
            allianceInstitutions,
            allianceProposals,
            allianceVisits,
            allianceTasks
        ] = await Promise.all([
            Lead.find(),
            Admission.find(),
            Campaign.find(),
            CallLog.find(),
            FollowUp.find(),
            User.find().select('-password'),
            Target.findOne({ month: current.key }),
            Target.findOne({ month: previous.key }),
            FinancePayment.find(),
            FinanceInvoice.find(),
            FinanceExpense.find(),
            AllianceInstitution.find(),
            AllianceProposal.find(),
            AllianceVisit.find(),
            AllianceTask.find()
        ]);

        res.json({
            leads,
            admissions,
            campaigns,
            callLogs,
            followUps,
            users,
            payments,
            invoices,
            expenses,
            allianceInstitutions,
            allianceProposals,
            allianceVisits,
            allianceTasks,
            targets: {
                current: currentTarget || { monthlyTarget: 600000, roasTarget: 10, maxCPA: 6500, month: current.key },
                previous: prevTarget || { monthlyTarget: 600000, roasTarget: 10, maxCPA: 6500, month: previous.key }
            },
            monthKeys: {
                current: current.key,
                previous: previous.key
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching revenue dashboard', error: error.message });
    }
};

// @desc    Get targets for a specific month
// @route   GET /api/revenue/targets
// @access  Private
export const getTargets = async (req, res) => {
    try {
        const month = req.query.month || new Date().toISOString().substring(0, 7);
        let target = await Target.findOne({ month });
        
        if (!target) {
            target = { monthlyTarget: 600000, roasTarget: 10, maxCPA: 6500, month };
        }
        
        res.json(target);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching targets', error: error.message });
    }
};

// @desc    Create or update targets for a month
// @route   PUT /api/revenue/targets
// @access  Private
export const updateTargets = async (req, res) => {
    try {
        const { month, monthlyTarget, roasTarget, maxCPA } = req.body;
        
        if (!month) {
            return res.status(400).json({ message: 'Month is required (YYYY-MM)' });
        }

        const target = await Target.findOneAndUpdate(
            { month },
            { monthlyTarget, roasTarget, maxCPA },
            { upsert: true, new: true, runValidators: true }
        );

        res.json(target);
    } catch (error) {
        res.status(400).json({ message: 'Error updating targets', error: error.message });
    }
};
