import CallLog from '../models/CallLog.js';

export const getCallLogs = async (req, res) => {
  try {
    let query = {};
    if (req.user?.role === 'telecaller') {
      query.telecallerId = req.user._id;
    }
    const logs = await CallLog.find(query);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCallLog = async (req, res) => {
  try {
    const logData = { ...req.body, telecallerId: req.user._id };
    const log = new CallLog(logData);
    const createdLog = await log.save();
    res.status(201).json(createdLog);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getCallLogsByLeadId = async (req, res) => {
  try {
    const query = { leadId: req.params.id };
    if (req.user?.role === 'telecaller') {
      query.telecallerId = req.user._id;
    }
    const logs = await CallLog.find(query);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCallLogForLead = async (req, res) => {
  try {
    const log = new CallLog({
      ...req.body,
      leadId: req.params.id,
      telecallerId: req.user._id,
    });
    const createdLog = await log.save();
    res.status(201).json(createdLog);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
