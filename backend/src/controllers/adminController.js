const Escrow = require('../models/Escrow');
const Project = require('../models/Project');
const User = require('../models/User');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Get all escrow payments
exports.getAllEscrowPayments = async (req, res) => {
  try {
    const escrows = await Escrow.find()
      .populate('project', 'title')
      .populate('employer', 'name email')
      .populate('freelancer', 'name email')
      .sort({ createdAt: -1 });

    res.json(escrows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get escrow payment details
exports.getEscrowPaymentDetails = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.escrowId)
      .populate('project', 'title description')
      .populate('employer', 'name email')
      .populate('freelancer', 'name email')
      .populate('milestones.approvedBy', 'name email');

    if (!escrow) {
      return res.status(404).json({ message: 'Escrow not found' });
    }

    res.json(escrow);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Release milestone payment
exports.releaseMilestonePayment = async (req, res) => {
  try {
    const { escrowId, milestoneId } = req.body;

    const escrow = await Escrow.findById(escrowId)
      .populate('project', 'freelancer')
      .populate('freelancer', 'stripeAccountId');

    if (!escrow) {
      return res.status(404).json({ message: 'Escrow not found' });
    }

    const milestone = escrow.milestones.find(m => m.milestoneId.toString() === milestoneId);
    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found in escrow' });
    }

    if (milestone.status !== 'pending') {
      return res.status(400).json({ message: 'Milestone payment already processed' });
    }

    if (!escrow.freelancer.stripeAccountId) {
      return res.status(400).json({ message: 'Freelancer has not set up their Stripe account' });
    }

    // Transfer funds to freelancer
    const transfer = await stripe.transfers.create({
      amount: Math.round(milestone.amount * 100),
      currency: 'inr',
      destination: escrow.freelancer.stripeAccountId
    });

    // Update milestone status
    milestone.status = 'released';
    milestone.releaseDate = Date.now();
    await escrow.save();

    res.json({
      message: 'Payment released successfully',
      transfer
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Refund escrow payment
exports.refundEscrowPayment = async (req, res) => {
  try {
    const { escrowId } = req.body;

    const escrow = await Escrow.findById(escrowId);
    if (!escrow) {
      return res.status(404).json({ message: 'Escrow not found' });
    }

    if (escrow.status !== 'funded') {
      return res.status(400).json({ message: 'Escrow is not funded' });
    }

    // Create refund
    const refund = await stripe.refunds.create({
      payment_intent: escrow.paymentIntentId
    });

    // Update escrow status
    escrow.status = 'refunded';
    escrow.milestones.forEach(milestone => {
      if (milestone.status === 'pending') {
        milestone.status = 'refunded';
      }
    });
    await escrow.save();

    res.json({
      message: 'Escrow refunded successfully',
      refund
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get payment statistics
exports.getPaymentStatistics = async (req, res) => {
  try {
    const stats = await Escrow.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const totalProjects = await Project.countDocuments();
    const totalFreelancers = await User.countDocuments({ role: 'freelancer' });
    const totalEmployers = await User.countDocuments({ role: 'employer' });

    res.json({
      paymentStats: stats,
      totalProjects,
      totalFreelancers,
      totalEmployers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}; 