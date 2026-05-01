import Admission from '../models/Admission.js';

export const getAdmissions = async (req, res) => {
  try {
    let query = {};
    if (req.user && req.user.role === 'counselor') {
      query.counselorId = req.user._id;
    }
    const admissions = await Admission.find(query);
    res.json(admissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdmissionById = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission) {
      return res.status(404).json({ message: 'Admission not found' });
    }
    res.json(admission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAdmission = async (req, res) => {
  try {
    const payload = { ...req.body };
    // Ensure counselor-created admissions remain visible to the same counselor
    // when GET /api/admissions applies role-based filtering.
    if (!payload.counselorId && req.user?._id) {
      payload.counselorId = req.user._id;
    }

    // Validate foreign key: leadId
    if (payload.leadId) {
      const Lead = (await import('../models/Lead.js')).default;
      const leadExists = await Lead.findById(payload.leadId);
      if (!leadExists) {
        return res.status(400).json({ message: 'Invalid leadId: Lead does not exist.' });
      }
    }

    const admission = new Admission(payload);
    console.log('Creating Admission with payload:', JSON.stringify(payload, null, 2));
    const createdAdmission = await admission.save();
    res.status(201).json(createdAdmission);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateAdmission = async (req, res) => {
  try {
    let admission = await Admission.findById(req.params.id);
    if (!admission) {
      return res.status(404).json({ message: 'Admission not found' });
    }

    if (req.user.role === 'counselor' && String(admission.counselorId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to update this admission' });
    }

    admission = await Admission.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    res.json(admission);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
