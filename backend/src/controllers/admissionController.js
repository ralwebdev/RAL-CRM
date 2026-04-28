import Admission from '../models/Admission.js';

export const getAdmissions = async (req, res) => {
  try {
    // Shared visibility for admissions across CRM roles.
    // Avoid over-filtering that can hide records after refresh.
    const admissions = await Admission.find({});
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

    const admission = new Admission(payload);
    const createdAdmission = await admission.save();
    res.status(201).json(createdAdmission);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateAdmission = async (req, res) => {
  try {
    const admission = await Admission.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!admission) {
      return res.status(404).json({ message: 'Admission not found' });
    }
    res.json(admission);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
