const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth, checkRole, isProjectParticipant } = require('../middleware/auth');
const {
  createProject,
  getProjects,
  getProject,
  updateProject,
  applyForProject,
  submitMilestone,
  reviewMilestone
} = require('../controllers/projectController');

// Validation middleware
const projectValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('budget').isFloat({ min: 0 }).withMessage('Budget must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('skills').isArray().withMessage('Skills must be an array'),
  body('deadline').isISO8601().withMessage('Invalid deadline date'),
  body('milestones').isArray().withMessage('Milestones must be an array')
];

const milestoneValidation = [
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('attachments').optional().isArray()
];

const reviewValidation = [
  body('status').isIn(['approved', 'rejected']).withMessage('Invalid status'),
  body('feedback').optional().trim()
];

// Routes
router.post('/', auth ,checkRole('employer'), projectValidation, createProject);
router.get('/', auth, getProjects);
router.get('/:projectId', auth, isProjectParticipant, getProject);
router.put('/:projectId', auth, checkRole('employer'), isProjectParticipant, projectValidation, updateProject);
router.post('/:projectId/apply', auth, checkRole('freelancer'), applyForProject);
router.post('/:projectId/milestone/:milestoneId/submit', auth, checkRole('freelancer'), isProjectParticipant, milestoneValidation, submitMilestone);
router.post('/:projectId/milestone/:milestoneId/review', auth, checkRole('employer'), isProjectParticipant, reviewValidation, reviewMilestone);

module.exports = router; 