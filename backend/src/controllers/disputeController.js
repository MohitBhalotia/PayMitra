const Dispute = require('../models/Dispute');
const Project = require('../models/Project');
const { validationResult } = require('express-validator');

// Create new dispute
exports.createDispute = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectId, milestoneId, type, description } = req.body;

    // Check if project exists and user is a participant
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.employer.toString() !== req.user._id.toString() && 
        project.freelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const dispute = new Dispute({
      project: projectId,
      milestone: milestoneId,
      raisedBy: req.user._id,
      type,
      description
    });

    await dispute.save();

    // Add dispute to project
    project.disputes.push(dispute._id);
    await project.save();

    res.status(201).json(dispute);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all disputes (with filters)
exports.getDisputes = async (req, res) => {
  try {
    const { status, projectId } = req.query;
    const query = {};

    if (status) query.status = status;
    if (projectId) query.project = projectId;

    const disputes = await Dispute.find(query)
      .populate('project', 'title')
      .populate('raisedBy', 'name email')
      .populate('resolution.resolvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(disputes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single dispute
exports.getDispute = async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.disputeId)
      .populate('project', 'title')
      .populate('raisedBy', 'name email')
      .populate('resolution.resolvedBy', 'name email')
      .populate('messages.sender', 'name email');

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    res.json(dispute);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add message to dispute
exports.addMessage = async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.disputeId);

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    // Check if user is a participant in the project
    const project = await Project.findById(dispute.project);
    if (project.employer.toString() !== req.user._id.toString() && 
        project.freelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { content, attachments } = req.body;

    dispute.messages.push({
      sender: req.user._id,
      content,
      attachments
    });

    await dispute.save();
    res.json(dispute);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update dispute status (admin only)
exports.updateDisputeStatus = async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.disputeId);

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    const { status, decision, notes } = req.body;

    dispute.status = status;
    if (status === 'resolved') {
      dispute.resolution = {
        decision,
        notes,
        resolvedBy: req.user._id,
        resolvedAt: Date.now()
      };
    }

    await dispute.save();
    res.json(dispute);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}; 