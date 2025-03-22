const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const adminController = require('../controllers/adminController');

// Validation middleware
const releasePaymentValidation = [
  body('escrowId').notEmpty().withMessage('Escrow ID is required'),
  body('milestoneId').notEmpty().withMessage('Milestone ID is required')
];

const refundValidation = [
  body('escrowId').notEmpty().withMessage('Escrow ID is required')
];

// Routes
router.get('/payments', auth, checkRole('admin'), adminController.getAllEscrowPayments);
router.get('/payments/:escrowId', auth, checkRole('admin'), adminController.getEscrowPaymentDetails);
router.post('/payments/release', auth, checkRole('admin'), releasePaymentValidation, adminController.releaseMilestonePayment);
router.post('/payments/refund', auth, checkRole('admin'), refundValidation, adminController.refundEscrowPayment);
router.get('/statistics', auth, checkRole('admin'), adminController.getPaymentStatistics);

module.exports = router; 