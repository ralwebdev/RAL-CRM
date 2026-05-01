import Collection from '../models/Collection.js';
import Admission from '../models/Admission.js';

// @desc    Get all collections
// @route   GET /api/collections
// @access  Private
export const getCollections = async (req, res) => {
  try {
    let query = {};
    if (req.user && req.user.role === 'counselor') {
      query.collectedById = req.user._id;
    }
    const collections = await Collection.find(query)
      .populate('collectedById', 'name email role')
      .populate('studentId', 'name phone email courseSelected batch');
    
    res.json(collections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single collection
// @route   GET /api/collections/:id
// @access  Private
export const getCollectionById = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id)
      .populate('collectedById', 'name email role')
      .populate('studentId', 'name phone email');
    
    if (collection) {
      res.json(collection);
    } else {
      res.status(404).json({ message: 'Collection not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a collection
// @route   POST /api/collections
// @access  Private
export const createCollection = async (req, res) => {
  try {
    // Validate foreign key: studentId (Admission)
    const admissionExists = await Admission.findById(req.body.studentId);
    if (!admissionExists) {
      return res.status(400).json({ message: 'Invalid studentId: Admission does not exist.' });
    }

    const collectionData = {
      ...req.body,
      collectedById: req.user._id,
      collectedByName: req.user.name,
      collectorRole: req.user.role === 'admin' ? 'admin' : 'counselor'
    };

    const collection = new Collection(collectionData);
    const createdCollection = await collection.save();

    // Optionally update Admission's payment history
    const admission = await Admission.findById(createdCollection.studentId);
    if (admission) {
      admission.paymentHistory.push({
        paymentDate: createdCollection.collectedAt,
        amountPaid: createdCollection.amount,
        paymentMode: createdCollection.mode,
        referenceNumber: createdCollection.receiptRef,
        paymentType: createdCollection.reason,
        emiNumber: createdCollection.emiInstallmentNo || null
      });
      await admission.save();
    }

    res.status(201).json(createdCollection);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a collection
// @route   PUT /api/collections/:id
// @access  Private
export const updateCollection = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    
    if (collection) {
      Object.assign(collection, req.body);
      const updatedCollection = await collection.save();
      res.json(updatedCollection);
    } else {
      res.status(404).json({ message: 'Collection not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Verify a collection (Admin only)
// @route   PUT /api/collections/:id/verify
// @access  Private/Admin
export const verifyCollection = async (req, res) => {
  try {
    const { verifiedAmount, verificationMode, remarks } = req.body;
    const collection = await Collection.findById(req.params.id);

    if (collection) {
      const matches = Math.abs(verifiedAmount - collection.amount) < 0.5;
      collection.verifiedAmount = verifiedAmount;
      collection.verificationMode = verificationMode;
      collection.verifiedById = req.user._id;
      collection.verifiedByName = req.user.name;
      collection.verifiedAt = new Date();
      collection.verificationRemarks = remarks;
      collection.mismatchAmount = matches ? 0 : collection.amount - verifiedAmount;
      collection.status = matches ? 'Verified' : 'Mismatch';
      
      const updatedCollection = await collection.save();
      res.json(updatedCollection);
    } else {
      res.status(404).json({ message: 'Collection not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
