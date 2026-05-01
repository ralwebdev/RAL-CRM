import dotenv from 'dotenv';
import mongoose from 'mongoose';

import '../models/User.js';
import '../models/Target.js';
import '../models/PiTiMapping.js';
import '../models/Lead.js';
import '../models/FollowUp.js';
import '../models/FinanceVendorBill.js';
import '../models/FinanceVendor.js';
import '../models/FinancePayment.js';
import '../models/FinanceInvoice.js';
import '../models/FinanceExpense.js';
import '../models/FinanceEmiSchedule.js';
import '../models/Collection.js';
import '../models/Campaign.js';
import '../models/CallLog.js';
import '../models/AllianceVisit.js';
import '../models/AllianceTask.js';
import '../models/AllianceProposal.js';
import '../models/AllianceInstitution.js';
import '../models/AllianceExpense.js';
import '../models/AllianceEvent.js';
import '../models/AllianceContact.js';
import '../models/AllianceApproval.js';
import '../models/Admission.js';

dotenv.config();

const apply = process.argv.includes('--apply');

const SYSTEM_COLLECTIONS = new Set(['system.indexes', 'system.profile', 'system.views']);

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set');
  }

  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const registeredCollections = new Set(
    Object.values(mongoose.models).map((model) => model.collection.collectionName)
  );

  const existingCollections = await db.listCollections({}, { nameOnly: true }).toArray();
  const existingNames = existingCollections.map((c) => c.name);

  const unknownCollections = existingNames.filter(
    (name) => !registeredCollections.has(name) && !SYSTEM_COLLECTIONS.has(name)
  );

  console.log('Registered model collections:', [...registeredCollections].sort());
  console.log('Existing database collections:', existingNames.sort());
  console.log('Unknown collections (candidates):', unknownCollections.sort());

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply to drop unknown collections.');
    return;
  }

  for (const collectionName of unknownCollections) {
    await db.dropCollection(collectionName);
    console.log(`Dropped: ${collectionName}`);
  }
};

run()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Prune failed:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  });
