const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  freelancer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  applications: [
    {
      freelancer: {
      type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      proposal: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      appliedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  budget: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ["open", "active", "in_progress", "completed", "cancelled", "rejected", "disputed"],
    default: "open",
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  skills: [
    {
      type: String,
      trim: true,
    },
  ],
  deadline: {
    type: Date,
    required: true,
  },
  milestones: [
    {
      title: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      status: {
        type: String,
        enum: [
          "pending",
          "in_progress",
          "submitted",
          "approved",
          "rejected",
          "paid",
        ],
        default: "pending",
      },
      dueDate: {
        type: Date,
        required: true,
      },
      submission: {
        description: String,
        attachments: [String],
        submittedAt: Date,
      },
      feedback: {
        comment: String,
        revisionRequested: Boolean,
        revisionNotes: String,
      },
    },
  ],
  totalPaid: {
    type: Number,
    default: 0,
  },
  disputes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dispute",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  paymentIntentId: String,
  escrowId: String,
  rejection: {
    reason: String,
    rejectedAt: Date,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
}, {
  timestamps: true
});

// Update the updatedAt timestamp before saving
projectSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Project", projectSchema);
