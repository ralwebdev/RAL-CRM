import mongoose from 'mongoose';

const PHONE_REGEX = /^\d{10}$/;

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : value);

export const validateObjectIdParam = (paramName = 'id') => (req, res, next) => {
  const value = req.params?.[paramName];
  if (!mongoose.isValidObjectId(value)) {
    return res.status(400).json({ message: `Invalid ${paramName}` });
  }
  return next();
};

export const validateLeadCreate = (req, res, next) => {
  const name = normalizeText(req.body?.name);
  const phone = normalizeText(req.body?.phone);
  const source = normalizeText(req.body?.source);
  const email = normalizeText(req.body?.email);

  if (!name) return res.status(400).json({ message: 'Name is required' });
  if (!phone) return res.status(400).json({ message: 'Phone is required' });
  if (!PHONE_REGEX.test(phone)) return res.status(400).json({ message: 'Phone must be exactly 10 digits' });
  if (!source) return res.status(400).json({ message: 'Source is required' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  req.body.name = name;
  req.body.phone = phone;
  req.body.source = source;
  if (email) req.body.email = String(email).toLowerCase();
  return next();
};

export const validateLeadUpdate = (req, res, next) => {
  const phone = normalizeText(req.body?.phone);
  const email = normalizeText(req.body?.email);
  if (phone && !PHONE_REGEX.test(phone)) {
    return res.status(400).json({ message: 'Phone must be exactly 10 digits' });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  if (phone) req.body.phone = phone;
  if (email) req.body.email = String(email).toLowerCase();
  return next();
};

