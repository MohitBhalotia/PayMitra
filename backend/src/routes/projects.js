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
const Project = require('../models/Project');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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

// Get all projects
router.get('/all', async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('employer', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    console.error('Get Projects Error:', error);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

// Get single project
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('employer', 'name email')
      .populate('assignedTo', 'name email');
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    console.error('Get Project Error:', error);
    res.status(500).json({ message: 'Failed to fetch project' });
  }
});

// Create project
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, budget, deadline, requiredSkills, milestones } = req.body;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(budget * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        userId: req.user.id
      }
    });

    const project = new Project({
      title,
      description,
      budget,
      deadline,
      requiredSkills,
      milestones,
      employer: req.user.id,
      paymentIntentId: paymentIntent.id
    });

    await project.save();
    res.status(201).json(project);
  } catch (error) {
    console.error('Create Project Error:', error);
    res.status(500).json({ message: 'Failed to create project' });
  }
});

// Apply to project
router.post('/:id/apply', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.assignedTo) {
      return res.status(400).json({ message: 'Project already assigned' });
    }

    project.assignedTo = req.user.id;
    project.status = 'in_progress';
    await project.save();

    res.json(project);
  } catch (error) {
    console.error('Apply to Project Error:', error);
    res.status(500).json({ message: 'Failed to apply to project' });
  }
});

// Submit milestone
router.post('/:id/milestones/:milestoneId/submit', auth, async (req, res) => {
  try {
    const { submission } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const milestone = project.milestones.id(req.params.milestoneId);
    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    milestone.submission = submission;
    milestone.status = 'submitted';
    milestone.submittedAt = new Date();
    await project.save();

    res.json(project);
  } catch (error) {
    console.error('Submit Milestone Error:', error);
    res.status(500).json({ message: 'Failed to submit milestone' });
  }
});

// Approve milestone
router.post('/:id/milestones/:milestoneId/approve', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.employer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const milestone = project.milestones.id(req.params.milestoneId);
    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    milestone.status = 'approved';
    milestone.approvedAt = new Date();
    await project.save();

    res.json(project);
  } catch (error) {
    console.error('Approve Milestone Error:', error);
    res.status(500).json({ message: 'Failed to approve milestone' });
  }
});

// Create dispute
router.post('/:id/dispute', auth, async (req, res) => {
  try {
    const { reason, description, evidence } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.status === 'disputed') {
      return res.status(400).json({ message: 'Project already in dispute' });
    }

    project.status = 'disputed';
    project.dispute = {
      createdBy: req.user.id,
      reason,
      description,
      evidence
    };

    await project.save();
    res.json(project);
  } catch (error) {
    console.error('Create Dispute Error:', error);
    res.status(500).json({ message: 'Failed to create dispute' });
  }
});

module.exports = router; 