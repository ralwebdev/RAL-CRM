import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import User from '../models/User.js';
import Campaign from '../models/Campaign.js';
import Lead from '../models/Lead.js';
import CallLog from '../models/CallLog.js';
import FollowUp from '../models/FollowUp.js';
import Admission from '../models/Admission.js';
import Collection from '../models/Collection.js';
import AllianceInstitution from '../models/AllianceInstitution.js';
import AllianceContact from '../models/AllianceContact.js';
import AllianceVisit from '../models/AllianceVisit.js';
import AllianceTask from '../models/AllianceTask.js';
import AllianceProposal from '../models/AllianceProposal.js';
import AllianceEvent from '../models/AllianceEvent.js';
import AllianceExpense from '../models/AllianceExpense.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const projectRoot = path.resolve(__dirname, '../../..');
const mockFilePath = path.join(projectRoot, 'MOCK_DATA_FOR_BACKEND.md');

const userAliasToEmail = {
  u1: 'rajesh@redapple.com',
  u2: 'soumya@redapple.com',
  u3: 'shreya@redapple.com',
  u4: 'priya@redapple.com',
  u5: 'manjari@redapple.com',
  ae1: 'sneha@redapple.com',
  ae2: 'rohit@redapple.com',
  ae3: 'rohit@redapple.com',
  am1: 'rohit@redapple.com',
  acm1: 'neha@redapple.com',
};

function toDateValue(input) {
  if (!input) return undefined;
  if (input instanceof Date) return input;
  if (typeof input === 'object' && input.$date) return new Date(input.$date);
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function toIsoStringOrEmpty(input) {
  const d = toDateValue(input);
  return d ? d.toISOString() : '';
}

function extractCollectionsFromMarkdown(markdown) {
  const map = new Map();
  const regex = /## Collection:\s*([^\n]+)\n\n```json\n([\s\S]*?)\n```/g;
  let m;
  while ((m = regex.exec(markdown)) !== null) {
    const collectionName = m[1].trim();
    const rawJson = m[2].trim();
    try {
      map.set(collectionName, JSON.parse(rawJson));
    } catch (err) {
      console.warn(`Skipping ${collectionName}: invalid JSON block (${err.message})`);
    }
  }
  return map;
}

async function buildUserAliasMap() {
  const users = await User.find({}).lean();
  const byEmail = new Map(users.map((u) => [String(u.email || '').toLowerCase(), u._id]));
  const byName = new Map(users.map((u) => [String(u.name || '').toLowerCase(), u._id]));
  const byRole = new Map();
  for (const u of users) {
    if (!byRole.has(u.role)) byRole.set(u.role, []);
    byRole.get(u.role).push(u._id);
  }

  const resolveByRole = (role, idx = 0) => {
    const arr = byRole.get(role) || [];
    return arr[idx] || arr[0] || null;
  };

  return {
    resolve(alias) {
      if (!alias) return null;
      const email = userAliasToEmail[alias];
      if (email && byEmail.has(email.toLowerCase())) return byEmail.get(email.toLowerCase());

      if (alias === 'u1') return resolveByRole('owner');
      if (alias === 'u2') return resolveByRole('marketing_manager');
      if (alias === 'u3') return resolveByRole('telecaller', 0);
      if (alias === 'u4') return resolveByRole('telecaller', 1);
      if (alias === 'u5') return resolveByRole('counselor');
      if (alias === 'ae1') return resolveByRole('alliance_executive', 0) || resolveByRole('alliance_manager');
      if (alias === 'ae2') return resolveByRole('alliance_executive', 1) || resolveByRole('alliance_manager');
      if (alias === 'ae3') return resolveByRole('alliance_manager') || resolveByRole('alliance_executive', 0);
      if (alias === 'am1') return resolveByRole('alliance_manager');
      return null;
    },
    resolveFlexible(alias, name, roleHint) {
      const byAlias = this.resolve(alias);
      if (byAlias) return byAlias;
      if (name && byName.has(String(name).toLowerCase())) return byName.get(String(name).toLowerCase());
      if (roleHint && byRole.has(roleHint)) {
        const arr = byRole.get(roleHint) || [];
        return arr[0] || null;
      }
      return null;
    }
  };
}

async function importMockData() {
  const conn = await mongoose.connect(process.env.MONGO_URI);
  console.log(`MongoDB Connected: ${conn.connection.host}`);

  const markdown = fs.readFileSync(mockFilePath, 'utf8');
  const data = extractCollectionsFromMarkdown(markdown);
  const userMap = await buildUserAliasMap();

  const campaignIdMap = new Map();
  const leadIdMap = new Map();
  const admissionByLeadIdMap = new Map();
  const leadPhoneByMockIdMap = new Map();
  const leadDocByMockIdMap = new Map();
  const admissionByNamePhoneMap = new Map();
  const institutionIdMap = new Map();

  let counts = {
    campaigns: 0,
    leads: 0,
    callLogs: 0,
    followUps: 0,
    admissions: 0,
    studentCollections: 0,
    allianceInstitutions: 0,
    allianceContacts: 0,
    allianceVisits: 0,
    allianceTasks: 0,
    allianceProposals: 0,
    allianceEvents: 0,
    allianceExpenses: 0,
  };

  const campaigns = data.get('campaigns') || [];
  for (const c of campaigns) {
    const doc = {
      name: c.name,
      platform: c.platform,
      objective: c.objective,
      budget: c.budget,
      dailyBudget: c.dailyBudget,
      startDate: toIsoStringOrEmpty(c.startDate),
      endDate: toIsoStringOrEmpty(c.endDate),
      targetLocation: c.targetLocation || '',
      leadsGenerated: c.leadsGenerated || 0,
      costPerLead: c.costPerLead || 0,
      ageGroup: c.ageGroup || '',
      educationLevel: c.educationLevel || '',
      interestCategory: c.interestCategory || '',
      targetCity: c.targetCity || '',
      marketingManager: userMap.resolve(c.marketingManager),
      campaignOwner: userMap.resolve(c.campaignOwner),
      campaignNotes: c.campaignNotes || '',
      approvalStatus: c.approvalStatus || 'Draft',
      adSets: (c.adSets || []).map((s) => ({
        name: s.name,
        audienceType: s.audienceType,
        sourceAudience: s.sourceAudience || '',
        retargetingSource: s.retargetingSource || '',
        ads: (s.ads || []).map((a) => ({
          adType: a.adType,
          creativeHook: a.creativeHook || '',
          primaryMessage: a.primaryMessage || '',
          cta: a.cta || '',
        })),
      })),
      utmTracking: c.utmTracking || {},
      landingPages: (c.landingPages || []).map((l) => ({
        url: l.url,
        pageVersion: l.pageVersion || '',
        conversionRate: l.conversionRate || 0,
      })),
    };

    const saved = await Campaign.findOneAndUpdate(
      { name: doc.name, startDate: doc.startDate },
      { $set: doc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (c.id) campaignIdMap.set(c.id, saved._id);
    counts.campaigns += 1;
  }

  const leads = data.get('leads') || [];
  for (const l of leads) {
    const doc = {
      name: l.name,
      phone: l.phone,
      email: l.email,
      source: l.source,
      campaignId: campaignIdMap.get(l.campaignId) || null,
      interestedCourse: l.interestedCourse,
      assignedTelecallerId: userMap.resolve(l.assignedTelecallerId),
      status: l.status || 'New',
      adSetName: l.adSetName,
      adName: l.adName,
      landingPageUrl: l.landingPageUrl,
      utm: l.utm || {},
      leadScore: l.leadScore || 0,
      leadQuality: l.leadQuality,
      budgetRange: l.budgetRange,
      urgencyLevel: l.urgencyLevel,
      otherInstitutes: l.otherInstitutes,
      currentEducation: l.currentEducation,
      graduationYear: l.graduationYear,
      currentOccupation: l.currentOccupation,
      collegeInstitution: l.collegeInstitution,
      feePayer: l.feePayer,
      decisionMaker: l.decisionMaker,
      highestQualification: l.highestQualification,
      currentStatus: l.currentStatus,
      careerGoal: l.careerGoal,
      preferredStartTime: l.preferredStartTime,
      leadSourceFormType: l.leadSourceFormType,
      leadMotivation: l.leadMotivation,
      placementInterest: l.placementInterest,
      expectedSalary: l.expectedSalary,
      jobLocationPreference: l.jobLocationPreference,
      intentScore: l.intentScore || 0,
      intentCategory: l.intentCategory,
      lastInteractionType: l.lastInteractionType,
      lastInteractionDate: toIsoStringOrEmpty(l.lastInteractionDate),
      temperature: l.temperature,
      assignedCounselorId: userMap.resolve(l.assignedCounselor),
      leadOwner: userMap.resolve(l.leadOwner),
      transferHistory: (l.transferHistory || []).map((t) => ({
        fromUserId: userMap.resolve(t.fromUserId),
        toUserId: userMap.resolve(t.toUserId),
        reason: t.reason,
        timestamp: toDateValue(t.timestamp),
      })),
      activities: (l.activities || []).map((a) => ({
        type: a.type,
        description: a.description,
        channel: a.channel,
        userId: userMap.resolve(a.userId),
        timestamp: toDateValue(a.timestamp),
      })),
      qualification: l.qualification || {},
      qualificationScore: l.qualificationScore || 0,
      recommendedCourse: l.recommendedCourse,
      alternateCourse: l.alternateCourse,
      recommendationReason: l.recommendationReason,
      scholarshipDiscussion: l.scholarshipDiscussion,
      emiOption: l.emiOption,
      admissionProbability: l.admissionProbability,
      scholarshipApplied: l.scholarshipApplied,
      scholarshipPercentage: l.scholarshipPercentage,
      loanRequired: l.loanRequired,
      emiSelected: l.emiSelected,
      lostReason: l.lostReason,
      firstCallTime: toIsoStringOrEmpty(l.firstCallTime),
      firstResponseTime: toIsoStringOrEmpty(l.firstResponseTime),
      priorityScore: l.priorityScore || 0,
      priorityCategory: l.priorityCategory,
      walkInStatus: l.walkInStatus,
      walkInDate: toIsoStringOrEmpty(l.walkInDate),
      walkInTime: l.walkInTime,
      walkInCounselor: userMap.resolve(l.walkInCounselor),
      counselingOutcome: l.counselingOutcome,
      expectedDOJ: toIsoStringOrEmpty(l.expectedDOJ),
      feeCommitment: l.feeCommitment,
      totalEmisPlanned: l.totalEmisPlanned,
      firstEmiDate: toIsoStringOrEmpty(l.firstEmiDate),
      documentStatus: l.documentStatus,
      documentsChecklist: l.documentsChecklist || undefined,
      joiningFailureReason: l.joiningFailureReason,
      joiningDelayed: l.joiningDelayed,
    };

    const saved = await Lead.findOneAndUpdate(
      { phone: doc.phone },
      { $set: doc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (l.id) leadIdMap.set(l.id, saved._id);
    if (l.id && l.phone) leadPhoneByMockIdMap.set(l.id, l.phone);
    if (l.id) leadDocByMockIdMap.set(l.id, saved);
    counts.leads += 1;
  }

  const callLogs = data.get('callLogs') || [];
  for (const c of callLogs) {
    const doc = {
      leadId: leadIdMap.get(c.leadId),
      telecallerId: userMap.resolve(c.telecallerId),
      outcome: c.outcome,
      notes: c.notes,
      nextFollowUp: toIsoStringOrEmpty(c.nextFollowUp),
      nextFollowUpTime: c.nextFollowUpTime,
      followUpType: c.followUpType,
      notInterestedReason: c.notInterestedReason,
      callbackDate: toIsoStringOrEmpty(c.callbackDate),
      callbackTime: c.callbackTime,
      conversationInsight: c.conversationInsight || {},
      createdAt: toDateValue(c.createdAt),
    };

    if (!doc.leadId || !doc.telecallerId || !doc.outcome) continue;

    await CallLog.findOneAndUpdate(
      { leadId: doc.leadId, telecallerId: doc.telecallerId, outcome: doc.outcome, createdAt: doc.createdAt || null },
      { $set: doc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    counts.callLogs += 1;
  }

  const followUps = data.get('followUps') || [];
  for (const f of followUps) {
    const doc = {
      leadId: leadIdMap.get(f.leadId),
      assignedTo: userMap.resolve(f.assignedTo),
      date: toDateValue(f.date),
      followUpTime: f.followUpTime,
      notes: f.notes,
      completed: f.completed,
      createdAt: toDateValue(f.createdAt),
      followUpType: f.followUpType,
    };

    if (!doc.leadId || !doc.assignedTo || !doc.date) continue;

    await FollowUp.findOneAndUpdate(
      { leadId: doc.leadId, assignedTo: doc.assignedTo, date: doc.date, notes: doc.notes || '' },
      { $set: doc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    counts.followUps += 1;
  }

  const admissions = data.get('admissions') || [];
  for (const a of admissions) {
    const leadId = leadIdMap.get(a.leadId);
    if (!leadId) continue;

    const doc = {
      leadId,
      studentName: a.studentName,
      phone: a.phone,
      email: a.email,
      courseSelected: a.courseSelected,
      batch: a.batch || a.batchAssigned,
      admissionDate: toIsoStringOrEmpty(a.admissionDate),
      totalFee: a.totalFee,
      feePaid: a.feePaid || 0,
      paymentStatus: a.paymentStatus,
      paymentMode: a.paymentMode,
      chequeNumber: a.chequeNumber,
      transactionId: a.transactionId,
      paymentType: a.paymentType,
      emiNumber: a.emiNumber,
      totalEmis: a.totalEmis,
      paymentHistory: (a.paymentHistory || []).map((p) => ({
        paymentDate: toIsoStringOrEmpty(p.paymentDate),
        amountPaid: p.amountPaid,
        paymentMode: p.paymentMode,
        referenceNumber: p.referenceNumber,
        paymentType: p.paymentType,
        emiNumber: p.emiNumber,
      })),
      parentName: a.parentName,
      parentPhone: a.parentPhone,
      studentBankName: a.studentBankName,
      parentBankName: a.parentBankName,
      scholarshipAmount: a.scholarshipAmount || 0,
      counselorId: userMap.resolve(a.counselorId || a.counselor),
      status: a.status,
      approvalStatus: a.approvalStatus,
      invoiceId: a.invoiceId,
    };

    const savedAdmission = await Admission.findOneAndUpdate(
      { leadId: doc.leadId },
      { $set: doc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (savedAdmission) {
      admissionByLeadIdMap.set(a.leadId, savedAdmission._id);
      const key = `${String(savedAdmission.studentName || '').trim().toLowerCase()}::${String(savedAdmission.phone || '').trim()}`;
      admissionByNamePhoneMap.set(key, savedAdmission._id);
    }
    counts.admissions += 1;
  }

  const studentCollections = data.get('studentCollections') || [];
  for (const c of studentCollections) {
    const studentLeadId = c.studentId;
    let admissionId = admissionByLeadIdMap.get(studentLeadId);
    if (!admissionId) {
      const leadPhone = leadPhoneByMockIdMap.get(studentLeadId);
      const keyFromLeadPhone = `${String(c.studentName || '').trim().toLowerCase()}::${String(leadPhone || '').trim()}`;
      admissionId = admissionByNamePhoneMap.get(keyFromLeadPhone);
    }
    if (!admissionId && c.studentMobile) {
      const keyFromStudentMobile = `${String(c.studentName || '').trim().toLowerCase()}::${String(c.studentMobile).trim()}`;
      admissionId = admissionByNamePhoneMap.get(keyFromStudentMobile);
    }
    if (!admissionId && studentLeadId && leadDocByMockIdMap.has(studentLeadId)) {
      const leadDoc = leadDocByMockIdMap.get(studentLeadId);
      const autoAdmission = await Admission.findOneAndUpdate(
        { leadId: leadDoc._id },
        {
          $setOnInsert: {
            leadId: leadDoc._id,
            studentName: leadDoc.name || c.studentName,
            phone: leadDoc.phone || c.studentMobile || '0000000000',
            email: leadDoc.email || `${String((leadDoc.name || c.studentName || 'student').toLowerCase()).replace(/[^a-z0-9]+/g, '.')}@placeholder.local`,
            courseSelected: leadDoc.interestedCourse || c.courseName || 'Unknown Course',
            admissionDate: toIsoStringOrEmpty(c.collectedAt) || new Date().toISOString(),
            totalFee: Number(c.amount || 0),
            feePaid: Number(c.amount || 0),
            paymentStatus: 'Partial',
            paymentMode: c.mode || 'upi',
            counselorId: userMap.resolveFlexible(c.collectedById, c.collectedByName, 'counselor'),
            status: 'Confirmed',
            approvalStatus: 'Pending',
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (autoAdmission) {
        admissionId = autoAdmission._id;
        admissionByLeadIdMap.set(studentLeadId, autoAdmission._id);
        const autoKey = `${String(autoAdmission.studentName || '').trim().toLowerCase()}::${String(autoAdmission.phone || '').trim()}`;
        admissionByNamePhoneMap.set(autoKey, autoAdmission._id);
      }
    }
    if (!admissionId) continue;

    const toRoleHint = (r) => {
      if (r === 'accounts_manager') return 'accounts_manager';
      if (r === 'accounts_executive') return 'accounts_executive';
      if (r === 'admin') return 'admin';
      if (r === 'counselor') return 'counselor';
      return undefined;
    };

    const mapInvoiceRequest = (ir = {}) => ({
      type: ir.type || 'none',
      status: ir.status || 'none',
      requestedById: userMap.resolveFlexible(ir.requestedById, ir.requestedByName, undefined),
      requestedByName: ir.requestedByName,
      requestedByRole: ir.requestedByRole,
      requestedAt: toDateValue(ir.requestedAt),
      adminReviewedById: userMap.resolveFlexible(ir.adminReviewedById, ir.adminReviewedByName, 'admin'),
      adminReviewedByName: ir.adminReviewedByName,
      adminReviewedAt: toDateValue(ir.adminReviewedAt),
      adminRemarks: ir.adminRemarks,
      preparedById: userMap.resolveFlexible(ir.preparedById, ir.preparedByName, 'accounts_executive'),
      preparedByName: ir.preparedByName,
      preparedAt: toDateValue(ir.preparedAt),
      issuedById: userMap.resolveFlexible(ir.issuedById, ir.issuedByName, 'accounts_manager'),
      issuedByName: ir.issuedByName,
      issuedAt: toDateValue(ir.issuedAt),
      invoiceNo: ir.invoiceNo,
      holdReason: ir.holdReason,
      clarificationQuestion: ir.clarificationQuestion,
      clarificationAnswer: ir.clarificationAnswer,
      rejectionReason: ir.rejectionReason,
    });

    const mappedAudit = (c.audit || [])
      .filter((a) => a && a.action)
      .map((a) => ({
        at: toDateValue(a.at),
        byId: userMap.resolveFlexible(a.byId, a.byName, toRoleHint(a.byRole)),
        byName: a.byName,
        byRole: a.byRole,
        action: a.action,
        fromStatus: a.fromStatus,
        toStatus: a.toStatus,
        remarks: a.remarks,
      }));

    const doc = {
      receiptRef: c.receiptRef,
      studentId: admissionId,
      studentName: c.studentName,
      studentMobile: c.studentMobile,
      courseName: c.courseName,
      branch: c.branch,
      amount: c.amount,
      mode: c.mode,
      reason: c.reason,
      collectedAt: toDateValue(c.collectedAt),
      collectedById: userMap.resolveFlexible(c.collectedById, c.collectedByName, c.collectorRole),
      collectedByName: c.collectedByName,
      collectorRole: c.collectorRole,
      remarks: c.remarks,
      txnId: c.txnId,
      bankName: c.bankName,
      chequeNumber: c.chequeNumber,
      chequeDate: toDateValue(c.chequeDate),
      invoiceRequest: mapInvoiceRequest(c.invoiceRequest),
      status: c.status || 'Collected',
      audit: mappedAudit,
    };

    if (!doc.collectedById) continue;

    await Collection.findOneAndUpdate(
      { receiptRef: doc.receiptRef },
      { $set: doc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    counts.studentCollections += 1;
  }

  const institutions = data.get('allianceInstitutions') || [];
  for (const i of institutions) {
    const doc = {
      institutionId: i.institutionId,
      name: i.name,
      type: i.type,
      boardUniversity: i.boardUniversity,
      district: i.district,
      city: i.city,
      address: i.address,
      studentStrength: i.studentStrength,
      decisionMaker: i.decisionMaker,
      phone: i.phone,
      email: i.email,
      assignedExecutiveId: userMap.resolve(i.assignedTo),
      pipelineStage: i.pipelineStage,
      notes: i.notes,
      priorityScore: i.priorityScore,
      priority: i.priority,
    };

    if (!doc.assignedExecutiveId) continue;

    const saved = await AllianceInstitution.findOneAndUpdate(
      { institutionId: doc.institutionId },
      { $set: doc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (i.id) institutionIdMap.set(i.id, saved._id);
    counts.allianceInstitutions += 1;
  }

  const contacts = data.get('allianceContacts') || [];
  for (const c of contacts) {
    const institutionId = institutionIdMap.get(c.institutionId);
    if (!institutionId) continue;

    await AllianceContact.findOneAndUpdate(
      { institutionId, name: c.name, phone: c.phone },
      {
        $set: {
          institutionId,
          name: c.name,
          designation: c.designation,
          phone: c.phone,
          email: c.email,
          notes: c.notes,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    counts.allianceContacts += 1;
  }

  const visits = data.get('allianceVisits') || [];
  for (const v of visits) {
    const institutionId = institutionIdMap.get(v.institutionId);
    const executiveId = userMap.resolve(v.executiveId);
    const visitDate = toDateValue(v.visitDate);
    if (!institutionId || !executiveId || !visitDate) continue;

    await AllianceVisit.findOneAndUpdate(
      { institutionId, executiveId, visitDate, meetingPerson: v.meetingPerson },
      {
        $set: {
          institutionId,
          executiveId,
          visitDate,
          meetingPerson: v.meetingPerson,
          summary: v.summary,
          interestLevel: v.interestLevel,
          nextFollowup: toDateValue(v.nextFollowup),
          status: v.status,
          photoUrl: v.photoUrl,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    counts.allianceVisits += 1;
  }

  const tasks = data.get('allianceTasks') || [];
  for (const t of tasks) {
    const institutionId = institutionIdMap.get(t.institutionId);
    const assignedTo = userMap.resolve(t.assignedTo);
    const dueDate = toDateValue(t.dueDate);
    if (!institutionId || !assignedTo || !dueDate) continue;

    await AllianceTask.findOneAndUpdate(
      { institutionId, title: t.title, dueDate },
      { $set: { institutionId, title: t.title, assignedTo, dueDate, status: t.status, priority: t.priority } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    counts.allianceTasks += 1;
  }

  const proposals = data.get('allianceProposals') || [];
  for (const p of proposals) {
    const institutionId = institutionIdMap.get(p.institutionId);
    if (!institutionId) continue;
    const sentDate = toDateValue(p.sentDate);

    await AllianceProposal.findOneAndUpdate(
      { institutionId, proposalType: p.proposalType, amount: p.amount, sentDate: sentDate || null },
      {
        $set: {
          institutionId,
          proposalType: p.proposalType,
          amount: p.amount,
          status: p.status,
          sentDate,
          approvedBy: userMap.resolve(p.approvedBy),
          notes: p.notes,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    counts.allianceProposals += 1;
  }

  const events = data.get('allianceEvents') || [];
  for (const e of events) {
    const institutionId = institutionIdMap.get(e.institutionId);
    const eventDate = toDateValue(e.eventDate);
    if (!institutionId || !eventDate) continue;

    await AllianceEvent.findOneAndUpdate(
      { institutionId, eventName: e.eventName, eventDate },
      {
        $set: {
          institutionId,
          eventName: e.eventName,
          eventType: e.eventType,
          eventDate,
          attendees: e.attendees,
          leadsGenerated: e.leadsGenerated,
          notes: e.notes,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    counts.allianceEvents += 1;
  }

  const expenses = data.get('allianceExpenses') || [];
  for (const e of expenses) {
    const institutionId = institutionIdMap.get(e.institutionId);
    const executiveId = userMap.resolve(e.executiveId);
    const expenseDate = toDateValue(e.expenseDate);
    if (!institutionId || !executiveId || !expenseDate) continue;

    await AllianceExpense.findOneAndUpdate(
      { institutionId, executiveId, expenseType: e.expenseType, amount: e.amount, expenseDate },
      {
        $set: {
          institutionId,
          executiveId,
          expenseType: e.expenseType,
          amount: e.amount,
          billUrl: e.billUrl,
          expenseDate,
          status: e.status,
          notes: e.notes,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    counts.allianceExpenses += 1;
  }

  console.log('Import completed (upsert mode, no deletes).');
  console.table(counts);

  await mongoose.disconnect();
}

importMockData().catch(async (err) => {
  console.error('Import failed:', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
