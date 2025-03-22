const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Project = require('../models/Project');
const { validationResult } = require('express-validator');

// Create payment intent for milestone
exports.createPaymentIntent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectId, milestoneId } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const milestone = project.milestones.id(milestoneId);
    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(milestone.amount * 100), // Convert to cents
      currency: 'inr',
      metadata: {
        projectId,
        milestoneId
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Handle payment webhook
exports.handleWebhook = async (req, res) => {
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

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      const { projectId, milestoneId } = paymentIntent.metadata;

      try {
        const project = await Project.findById(projectId);
        if (!project) {
          throw new Error('Project not found');
        }

        const milestone = project.milestones.id(milestoneId);
        if (!milestone) {
          throw new Error('Milestone not found');
        }

        milestone.status = 'paid';
        await project.save();
      } catch (error) {
        console.error('Error processing payment:', error);
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
  try {
    const { projectId } = req.query;
    const query = {};

    if (projectId) {
      query.metadata = { projectId };
    }

    const paymentIntents = await stripe.paymentIntents.list(query, {
      limit: 100
    });

    res.json(paymentIntents.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Refund payment
exports.refundPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId
    });

    res.json(refund);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}; 