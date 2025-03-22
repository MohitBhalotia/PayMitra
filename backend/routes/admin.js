const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const User = require('../models/User');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all projects with their milestones
router.get('/projects', auth, isAdmin, async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('employer', 'name email')
      .populate('assignedTo', 'name email stripeAccountId')
      .sort({ createdAt: -1 });
    
    res.json(projects);
  } catch (error) {
    console.error('Admin Projects Error:', error);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

// Get payment statistics
router.get('/statistics', auth, isAdmin, async (req, res) => {
  try {
    const [
      totalProjects,
      totalFreelancers,
      totalEmployers,
      totalEscrowAmount
    ] = await Promise.all([
      Project.countDocuments(),
      User.countDocuments({ role: 'freelancer' }),
      User.countDocuments({ role: 'employer' }),
      Project.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: '$budget' }
          }
        }
      ])
    ]);

    res.json({
      totalProjects,
      totalFreelancers,
      totalEmployers,
      totalEscrowAmount: totalEscrowAmount[0]?.total || 0
    });
  } catch (error) {
    console.error('Admin Statistics Error:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// Handle dispute resolution
router.post('/disputes/:projectId/resolve', auth, isAdmin, async (req, res) => {
  try {
    const { resolution, refundAmount } = req.body;
    const project = await Project.findById(req.params.projectId)
      .populate('assignedTo')
      .populate('employer');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.status !== 'disputed') {
      return res.status(400).json({ message: 'Project is not in dispute' });
    }

    // Update project status based on resolution
    project.status = resolution;
    project.disputeResolution = {
      resolvedBy: req.user.id,
      resolution,
      refundAmount,
      resolvedAt: new Date()
    };

    // If refunding, process the refund
    if (refundAmount > 0) {
      const refund = await stripe.refunds.create({
        payment_intent: project.paymentIntentId,
        amount: Math.round(refundAmount * 100), // Convert to cents
        reason: 'dispute_resolution'
      });

      project.refunds.push({
        amount: refundAmount,
        refundId: refund.id,
        reason: 'dispute_resolution'
      });
    }

    await project.save();

    res.json({ message: 'Dispute resolved successfully', project });
  } catch (error) {
    console.error('Dispute Resolution Error:', error);
    res.status(500).json({ message: 'Failed to resolve dispute' });
  }
});

// Get all disputes
router.get('/disputes', auth, isAdmin, async (req, res) => {
  try {
    const disputes = await Project.find({ status: 'disputed' })
      .populate('employer', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    res.json(disputes);
  } catch (error) {
    console.error('Admin Disputes Error:', error);
    res.status(500).json({ message: 'Failed to fetch disputes' });
  }
});

// Get dispute details
router.get('/disputes/:projectId', auth, isAdmin, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate('employer', 'name email')
      .populate('assignedTo', 'name email')
      .populate('dispute.createdBy', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.status !== 'disputed') {
      return res.status(400).json({ message: 'Project is not in dispute' });
    }

    res.json(project);
  } catch (error) {
    console.error('Dispute Details Error:', error);
    res.status(500).json({ message: 'Failed to fetch dispute details' });
  }
});

module.exports = router; 