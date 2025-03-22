const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const escrowController = require('../controllers/escrowController');

// Validation middleware
const escrowValidation = [
  body('projectId').notEmpty().withMessage('Project ID is required')
];

const releasePaymentValidation = [
  body('escrowId').notEmpty().withMessage('Escrow ID is required'),
  body('milestoneId').notEmpty().withMessage('Milestone ID is required')
];

const refundValidation = [
  body('escrowId').notEmpty().withMessage('Escrow ID is required')
];

// Routes
router.post('/create', auth, escrowValidation, escrowController.createEscrow);
router.post('/webhook', express.raw({ type: 'application/json' }), escrowController.handleEscrowWebhook);
router.post('/release', auth, releasePaymentValidation, escrowController.releaseMilestonePayment);
router.get('/:projectId', auth, escrowController.getEscrowDetails);
router.post('/refund', auth, checkRole('admin'), refundValidation, escrowController.refundEscrowPayment);

module.exports = router; 