const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'submitted', 'approved', 'paid', 'rejected'],
    default: 'pending'
  },
  submission: {
    type: String,
    default: ''
  },
  submittedAt: {
    type: Date
  },
  approvedAt: {
    type: Date
  },
  paymentId: {
    type: String,
    default: null
  }
});

const refundSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  refundId: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const disputeSchema = new mongoose.Schema({
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  evidence: [{
    type: String // URLs to evidence files
  }]
});

const disputeResolutionSchema = new mongoose.Schema({
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resolution: {
    type: String,
    enum: ['completed', 'cancelled', 'refunded'],
    required: true
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  resolvedAt: {
    type: Date,
    required: true
  }
});

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  budget: {
    type: Number,
    required: true
  },
  deadline: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'completed', 'cancelled', 'disputed'],
    default: 'open'
  },
  requiredSkills: [{
    type: String
  }],
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  milestones: [milestoneSchema],
  paymentIntentId: {
    type: String,
    default: null
  },
  refunds: [refundSchema],
  dispute: disputeSchema,
  disputeResolution: disputeResolutionSchema,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Project', projectSchema); 