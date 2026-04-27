import Lead from '../models/Lead.js';
// @route   GET /api/leads
// @access  Public
export const getLeads = async (req, res) => {
  try {
    let query = {};
    
    if (req.user) {
      if (req.user.role === 'counselor') {
        query = {
          $or: [
            { assignedCounselor: req.user._id },
            { walkInCounselor: req.user._id },
          ],
        };
      } else if (req.user.role === 'telecaller') {
        query.assignedTelecallerId = req.user._id;
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
    const lead = new Lead(req.body);
    const createdLead = await lead.save();
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
      Object.assign(lead, req.body);
      const updatedLead = await lead.save();
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
    const lead = await Lead.findByIdAndRemove(req.params.id);
    if (lead) {
      res.json({ message: 'Lead removed' });
    } else {
      res.status(404).json({ message: 'Lead not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
