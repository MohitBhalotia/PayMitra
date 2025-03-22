const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const {auth, checkRole} = require('../middleware/auth');
const User = require('../models/User');
const Project = require('../models/Project');

// Create a Stripe Connect account for a freelancer
router.post('/connect', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.role !== 'freelancer') {
      return res.status(403).json({ message: 'Only freelancers can connect Stripe accounts' });
    }

    // For testing, return a mock URL
    if (process.env.NODE_ENV === 'test') {
      return res.json({ url: 'https://test.stripe.com/connect' });
    }

    // Create a Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'IN',
      email: user.email,
      business_profile: {
        name: user.name,
        url: 'https://paymitra.com'
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      }
    });

    // Save the Stripe account ID to the user
    user.stripeAccountId = account.id;
    await user.save();

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL}/stripe/connect/refresh`,
      return_url: `${process.env.FRONTEND_URL}/stripe/connect/success`,
      type: 'account_onboarding'
    });

    res.json({ url: accountLink.url });
  } catch (error) {
    console.error('Stripe Connect Error:', error);
    res.status(500).json({ message: 'Failed to create Stripe Connect account' });
  }
});

// Get the status of a freelancer's Stripe Connect account
router.get('/connect/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user.stripeAccountId) {
      return res.json({ connected: false });
    }

    const account = await stripe.accounts.retrieve(user.stripeAccountId);
    res.json({
      connected: true,
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
      chargesEnabled: account.charges_enabled
    });
  } catch (error) {
    console.error('Stripe Connect Status Error:', error);
    res.status(500).json({ message: 'Failed to get Stripe Connect status' });
  }
});

// Release payment to freelancer
router.post('/release-payment', auth, async (req, res) => {
  try {
    const { projectId, milestoneId } = req.body;
    const project = await Project.findById(projectId).populate('assignedTo');
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!project.assignedTo || !project.assignedTo.stripeAccountId) {
      return res.status(400).json({ message: 'Freelancer has not connected their Stripe account' });
    }

    const milestone = project.milestones.id(milestoneId);
    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    if (milestone.status !== 'approved') {
      return res.status(400).json({ message: 'Milestone must be approved before payment release' });
    }

    // Transfer the payment to the freelancer's Stripe account
    const transfer = await stripe.transfers.create({
      amount: Math.round(milestone.amount * 100), // Convert to cents
      currency: 'usd',
      destination: project.assignedTo.stripeAccountId
    });

    // Update milestone status
    milestone.status = 'paid';
    milestone.paymentId = transfer.id;
    await project.save();

    res.json({ message: 'Payment released successfully', transfer });
  } catch (error) {
    console.error('Payment Release Error:', error);
    res.status(500).json({ message: 'Failed to release payment' });
  }
});

// Process refund
router.post('/refund', auth, async (req, res) => {
  try {
    const { projectId, amount, reason } = req.body;
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Process refund through Stripe
    const refund = await stripe.refunds.create({
      payment_intent: project.paymentIntentId,
      amount: Math.round(amount * 100), // Convert to cents
      reason: reason || 'requested_by_customer'
    });

    // Record refund in project
    project.refunds.push({
      amount,
      refundId: refund.id,
      reason
    });

    await project.save();

    res.json({ message: 'Refund processed successfully', refund });
  } catch (error) {
    console.error('Refund Error:', error);
    res.status(500).json({ message: 'Failed to process refund' });
  }
});

module.exports = router; 