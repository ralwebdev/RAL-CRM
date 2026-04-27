import FollowUp from '../models/FollowUp.js';

export const getFollowUps = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'telecaller' || req.user.role === 'counselor') {
      query.assignedTo = req.user._id;
    }
    const followUps = await FollowUp.find(query).populate('leadId', 'name phone email interestedCourse');
    res.json(followUps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createFollowUp = async (req, res) => {
  try {
    const fuData = { ...req.body, assignedTo: req.user._id };
    const fu = new FollowUp(fuData);
    const createdFollowUp = await fu.save();
    res.status(201).json(createdFollowUp);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateFollowUp = async (req, res) => {
  try {
    const fu = await FollowUp.findById(req.params.id);
    if (fu) {
      Object.assign(fu, req.body);
      const updated = await fu.save();
      res.json(updated);
    } else {
      res.status(404).json({ message: 'FollowUp not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
