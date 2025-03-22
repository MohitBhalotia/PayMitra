const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Escrow = require('../models/Escrow');
const Project = require('../models/Project');
const { validationResult } = require('express-validator');

// Create escrow for project
exports.createEscrow = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectId } = req.body;

    const project = await Project.findById(projectId)
      .populate('employer', 'stripeAccountId')
      .populate('freelancer', 'stripeAccountId');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is the employer
    if (project.employer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Create payment intent for escrow
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(project.budget * 100), // Convert to cents
      currency: 'inr',
      metadata: {
        projectId,
        type: 'escrow'
      }
    });

    // Create escrow record
    const escrow = new Escrow({
      project: projectId,
      amount: project.budget,
      employer: project.employer._id,
      freelancer: project.freelancer._id,
      paymentIntentId: paymentIntent.id,
      milestones: project.milestones.map(milestone => ({
        milestoneId: milestone._id,
        amount: milestone.amount,
        status: 'pending'
      }))
    });

    await escrow.save();

    res.status(201).json({
      escrow,
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Handle escrow webhook
exports.handleEscrowWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      if (paymentIntent.metadata.type === 'escrow') {
        try {
          const escrow = await Escrow.findOne({ paymentIntentId: paymentIntent.id });
          if (escrow) {
            escrow.status = 'funded';
            await escrow.save();
          }
        } catch (error) {
          console.error('Error processing escrow payment:', error);
        }
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};

// Release milestone payment
exports.releaseMilestonePayment = async (req, res) => {
  try {
    const { escrowId, milestoneId } = req.body;

    const escrow = await Escrow.findById(escrowId);
    if (!escrow) {
      return res.status(404).json({ message: 'Escrow not found' });
    }

    // Check if user is the employer
    if (escrow.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const milestone = escrow.milestones.find(m => m.milestoneId.toString() === milestoneId);
    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found in escrow' });
    }

    if (milestone.status !== 'pending') {
      return res.status(400).json({ message: 'Milestone payment already processed' });
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

// Get escrow details
exports.getEscrowDetails = async (req, res) => {
  try {
    const { projectId } = req.params;

    // First check if the project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Find the escrow record
    const escrow = await Escrow.findOne({ project: projectId });

    // If no escrow exists yet, return a 404
    if (!escrow) {
      return res.status(404).json({ message: 'Escrow not found for this project' });
    }

    // Populate only the fields that exist
    const populatedEscrow = await Escrow.findOne({ project: projectId })
      .populate('employer', 'name email')
      .populate('freelancer', 'name email')
      .populate('project', 'title budget');

    // Check if user is involved in the project
    if (populatedEscrow.employer._id.toString() !== req.user._id.toString() &&
        (!populatedEscrow.freelancer || populatedEscrow.freelancer._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to view escrow details' });
    }

    res.json(populatedEscrow);
  } catch (error) {
    console.error('Error in getEscrowDetails:', error);
    res.status(500).json({ 
      message: 'Server error while fetching escrow details',
      error: error.message 
    });
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

    // Check if user is the employer
    if (escrow.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
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