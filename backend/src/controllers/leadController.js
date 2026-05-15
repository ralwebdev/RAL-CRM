import Lead from '../models/Lead.js';
import Campaign from '../models/Campaign.js';
import Admission from '../models/Admission.js';
import FollowUp from '../models/FollowUp.js';
import CallLog from '../models/CallLog.js';
import Collection from '../models/Collection.js';

async function refreshCampaignMetrics(campaignId) {
  if (!campaignId) return;
  const totalLeads = await Lead.countDocuments({ campaignId });
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) return;

  campaign.leadsGenerated = totalLeads;
  campaign.costPerLead = totalLeads > 0 ? Number((campaign.budget / totalLeads).toFixed(2)) : 0;
  await campaign.save();
}
// @route   GET /api/leads
// @access  Public
export const getLeads = async (req, res) => {
  try {
    let query = {};
    
    if (req.user) {
      if (req.user.role === 'counselor') {
        query = {
          $or: [
            { assignedCounselorId: req.user._id },
            { walkInCounselor: req.user._id },
          ],
        };
      } else if (req.user.role === 'telecaller') {
        query = { assignedTelecallerId: req.user._id };
      }
      // admins, marketing_managers, and telecalling_managers will use the default {} query to see all leads.
    }
    const leads = await Lead.find(query);
    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new lead
// @route   POST /api/leads
// @access  Private
export const createLead = async (req, res) => {
  try {
    const duplicateFilter = [{ phone: req.body.phone }];
    if (req.body.email) duplicateFilter.push({ email: req.body.email });
    const duplicate = await Lead.findOne({ $or: duplicateFilter });
    if (duplicate) {
      return res.status(400).json({ message: 'Lead with same phone or email already exists' });
    }

    const lead = new Lead(req.body);
    const createdLead = await lead.save();
    await refreshCampaignMetrics(createdLead.campaignId);
    res.status(201).json(createdLead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a lead
// @route   PUT /api/leads/:id
// @access  Private
export const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (lead) {
      if (req.body.phone || req.body.email) {
        const duplicateFilter = [];
        if (req.body.phone) duplicateFilter.push({ phone: req.body.phone });
        if (req.body.email) duplicateFilter.push({ email: req.body.email });
        const duplicate = await Lead.findOne({
          _id: { $ne: lead._id },
          $or: duplicateFilter,
        });
        if (duplicate) {
          return res.status(400).json({ message: 'Lead with same phone or email already exists' });
        }
      }

      if (req.user.role === 'telecaller' && String(lead.assignedTelecallerId) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Not authorized to update this lead' });
      }
      if (req.user.role === 'counselor' && String(lead.assignedCounselorId) !== String(req.user._id) && String(lead.walkInCounselor) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Not authorized to update this lead' });
      }

      const previousCampaignId = lead.campaignId ? String(lead.campaignId) : null;
      Object.assign(lead, req.body);
      const updatedLead = await lead.save();
      const nextCampaignId = updatedLead.campaignId ? String(updatedLead.campaignId) : null;

      if (previousCampaignId && previousCampaignId !== nextCampaignId) {
        await refreshCampaignMetrics(previousCampaignId);
      }
      await refreshCampaignMetrics(updatedLead.campaignId);

      res.json(updatedLead);
    } else {
      res.status(404).json({ message: 'Lead not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a lead
// @route   DELETE /api/leads/:id
// @access  Private
export const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (lead) {
      const admission = await Admission.findOne({ leadId: lead._id });
      if (admission) {
        await Collection.deleteMany({ studentId: admission._id });
        await Admission.deleteOne({ _id: admission._id });
      }
      await FollowUp.deleteMany({ leadId: lead._id });
      await CallLog.deleteMany({ leadId: lead._id });
      await refreshCampaignMetrics(lead.campaignId);
      res.json({ message: 'Lead removed' });
    } else {
      res.status(404).json({ message: 'Lead not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
