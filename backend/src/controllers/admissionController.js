import Admission from '../models/Admission.js';

export const getAdmissions = async (req, res) => {
  try {
    let query = {};
    if (req.user?.role === 'counselor') {
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
    const admission = new Admission(req.body);
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
