const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth, checkRole } = require('../middleware/auth');
const {
  createDispute,
  getDisputes,
  getDispute,
  addMessage,
  updateDisputeStatus
} = require('../controllers/disputeController');

// Validation middleware
const disputeValidation = [
  body('projectId').notEmpty().withMessage('Project ID is required'),
  body('milestoneId').notEmpty().withMessage('Milestone ID is required'),
  body('type')
    .isIn(['quality', 'payment', 'deadline', 'other'])
    .withMessage('Invalid dispute type'),
  body('description').trim().notEmpty().withMessage('Description is required')
];

const messageValidation = [
  body('content').trim().notEmpty().withMessage('Message content is required'),
  body('attachments').optional().isArray()
];

const statusValidation = [
  body('status')
    .isIn(['in_review', 'resolved', 'closed'])
    .withMessage('Invalid status'),
  body('decision')
    .optional()
    .isIn(['employer_favor', 'freelancer_favor', 'compromise', 'refund'])
    .withMessage('Invalid decision'),
  body('notes').optional().trim()
];

// Routes
router.post('/', auth, disputeValidation, createDispute);
router.get('/', auth, getDisputes);
router.get('/:disputeId', auth, getDispute);
router.post('/:disputeId/messages', auth, messageValidation, addMessage);
router.put('/:disputeId/status', auth, checkRole('admin'), statusValidation, updateDisputeStatus);

module.exports = router; 