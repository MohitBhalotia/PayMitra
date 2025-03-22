const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const {auth, checkRole} = require('../middleware/auth');
const User = require('../models/User');
const Project = require('../models/Project');
const Escrow = require('../models/Escrow');

// Create a Stripe Connect account for a freelancer
router.post('/connect', auth, async (req, res) => {
  try {
    console.log('Starting Stripe Connect process...');
    console.log('User ID:', req.user.id);
    
    const user = await User.findById(req.user.id);
    console.log('Found user:', user ? 'Yes' : 'No');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role !== 'freelancer') {
      return res.status(403).json({ message: 'Only freelancers can connect Stripe accounts' });
    }

    // For testing, return a mock URL
    if (process.env.NODE_ENV === 'test') {
      return res.json({ url: 'https://test.stripe.com/connect' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not set');
      return res.status(500).json({ message: 'Stripe configuration is missing' });
    }

    if (!process.env.FRONTEND_URL) {
      console.error('FRONTEND_URL is not set');
      return res.status(500).json({ message: 'Frontend URL configuration is missing' });
    }

    console.log('Creating Stripe account...');
    // Create a Stripe Connect account with required capabilities
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
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
    console.log('Stripe account created:', account.id);

    // Save the Stripe account ID and status to the user
    user.stripeAccountId = account.id;
    user.stripeAccountStatus = 'pending';
    await user.save();
    console.log('Updated user with Stripe account ID and status');

    // Create an account link for onboarding
    console.log('Creating account link...');
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL}/stripe/connect/refresh`,
      return_url: `${process.env.FRONTEND_URL}/stripe/connect/success`,
      type: 'account_onboarding'
    });
    console.log('Account link created');

    res.json({ url: accountLink.url });
  } catch (error) {
    console.error('Stripe Connect Error:', {
      message: error.message,
      type: error.type,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ 
      message: 'Failed to create Stripe Connect account',
      error: error.message 
    });
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
    
    // Update user's Stripe account status based on capabilities
    if (account.capabilities.transfers && account.capabilities.card_payments) {
      user.stripeAccountStatus = 'active';
    } else {
      user.stripeAccountStatus = 'pending';
    }
    await user.save();

    res.json({
      connected: true,
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
      chargesEnabled: account.charges_enabled,
      capabilities: account.capabilities,
      status: user.stripeAccountStatus
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
    console.log('Attempting to release payment:', { projectId, milestoneId });
    
    // First, get the escrow record
    const escrow = await Escrow.findOne({ project: projectId });
    if (!escrow) {
      return res.status(404).json({ message: 'Escrow not found' });
    }

    // Get the project and freelancer details
    const project = await Project.findById(projectId).populate('freelancer');
    console.log('Project details:', {
      id: project?._id,
      hasFreelancer: !!project?.freelancer,
      freelancerId: project?.freelancer?._id,
      stripeAccountId: project?.freelancer?.stripeAccountId
    });
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!project.freelancer || !project.freelancer.stripeAccountId) {
      console.log('Freelancer details:', project.freelancer);
      return res.status(400).json({ message: 'Freelancer has not connected their Stripe account' });
    }

    // Get the freelancer's Stripe account details
    const account = await stripe.accounts.retrieve(project.freelancer.stripeAccountId);
    console.log('Stripe account details:', {
      id: account.id,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted
    });

    if (!account.payouts_enabled) {
      return res.status(400).json({ 
        message: 'Freelancer needs to complete their bank account setup to receive payments',
        details: 'Payouts not enabled'
      });
    }

    const milestone = project.milestones.id(milestoneId);
    console.log('Milestone details:', {
      id: milestone?._id,
      status: milestone?.status,
      amount: milestone?.amount
    });

    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    if (milestone.status !== 'approved') {
      return res.status(400).json({ message: 'Milestone must be approved before payment release' });
    }

    // Find the milestone in escrow
    const escrowMilestone = escrow.milestones.find(m => m.milestoneId.toString() === milestoneId);
    if (!escrowMilestone) {
      return res.status(404).json({ message: 'Milestone not found in escrow' });
    }

    if (escrowMilestone.status !== 'pending') {
      return res.status(400).json({ message: 'Milestone payment has already been processed' });
    }

    console.log('Creating payout to freelancer:', project.freelancer.stripeAccountId);
    // Create a payout to the freelancer's connected bank account
    const payout = await stripe.payouts.create({
      amount: Math.round(milestone.amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        projectId: project._id,
        milestoneId: milestone._id
      }
    }, {
      stripeAccount: project.freelancer.stripeAccountId
    });
    console.log('Payout created:', payout.id);

    // Update milestone status in both project and escrow
    milestone.status = 'paid';
    milestone.paymentId = payout.id;
    await project.save();

    escrowMilestone.status = 'released';
    escrowMilestone.releaseDate = new Date();
    escrowMilestone.approvedBy = req.user._id;
    escrowMilestone.approvedAt = new Date();
    await escrow.save();

    console.log('Milestone status updated to paid');

    res.json({ 
      message: 'Payment released successfully', 
      payout,
      bankAccount: account.external_accounts.data[0] // Return the bank account details
    });
  } catch (error) {
    console.error('Payment Release Error:', {
      message: error.message,
      type: error.type,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ 
      message: 'Failed to release payment',
      error: error.message 
    });
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

// Add test balance to Stripe Connect account
router.post('/add-test-balance', auth, async (req, res) => {
  try {
    const { amount = 1000 } = req.body; // Default to $10.00
    console.log('Adding test balance:', { amount });
    
    const user = await User.findById(req.user.id);
    if (!user || !user.stripeAccountId) {
      return res.status(400).json({ message: 'User has no connected Stripe account' });
    }

    // Create a test payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: {
        userId: user._id,
        type: 'test_balance'
      }
    });

    // Create a test card payment method
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: '4242424242424242',
        exp_month: 12,
        exp_year: 2024,
        cvc: '314',
        billing_details: {
          name: user.name,
          email: user.email
        }
      }
    });

    // Attach the payment method to the payment intent
    await stripe.paymentIntents.update(paymentIntent.id, {
      payment_method: paymentMethod.id
    });

    // Capture the payment
    const capturedPayment = await stripe.paymentIntents.capture(paymentIntent.id);

    // Transfer the funds to the connected account
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      destination: user.stripeAccountId,
      transfer_group: `test_balance_${Date.now()}`
    });

    console.log('Test balance added:', {
      paymentIntent: capturedPayment.id,
      transfer: transfer.id,
      amount
    });

    res.json({
      message: 'Test balance added successfully',
      amount,
      paymentIntent: capturedPayment.id,
      transfer: transfer.id
    });
  } catch (error) {
    console.error('Add Test Balance Error:', {
      message: error.message,
      type: error.type,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({
      message: 'Failed to add test balance',
      error: error.message
    });
  }
});

module.exports = router; 