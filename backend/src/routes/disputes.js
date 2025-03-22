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
const Dispute = require('../models/Dispute');

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

// Create a new dispute
router.post('/', auth, async (req, res) => {
  try {
    const dispute = new Dispute({
      projectId: req.body.projectId,
      raisedBy: req.user.id,
      reason: req.body.reason,
      description: req.body.description,
      status: 'pending'
    });
    await dispute.save();
    res.status(201).json(dispute);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all disputes (admin only)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const disputes = await Dispute.find()
      .populate('projectId')
      .populate('raisedBy', 'name email');
    res.json(disputes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get dispute by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate('projectId')
      .populate('raisedBy', 'name email');
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }
    res.json(dispute);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update dispute status (admin only)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }
    dispute.status = req.body.status;
    dispute.resolution = req.body.resolution;
    await dispute.save();
    res.json(dispute);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 