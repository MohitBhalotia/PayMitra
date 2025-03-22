const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth, checkRole } = require('../middleware/auth');
const {
  createPaymentIntent,
  handleWebhook,
  getPaymentHistory,
  refundPayment
} = require('../controllers/paymentController');

// Validation middleware
const paymentIntentValidation = [
  body('projectId').notEmpty().withMessage('Project ID is required'),
  body('milestoneId').notEmpty().withMessage('Milestone ID is required')
];

const refundValidation = [
  body('paymentIntentId').notEmpty().withMessage('Payment Intent ID is required')
];

// Routes
router.post('/create-payment-intent', auth,checkRole('employer'), paymentIntentValidation, createPaymentIntent);
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);
router.get('/history', auth, getPaymentHistory);
router.post('/refund', auth, checkRole('admin'), refundValidation, refundPayment);

module.exports = router; 