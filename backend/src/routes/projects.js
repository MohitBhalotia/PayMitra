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
  reviewMilestone,
  approveApplication
} = require('../controllers/projectController');
const Project = require('../models/Project');
const Escrow = require('../models/Escrow');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Validation middleware
const projectValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('budget').isFloat({ min: 0 }).withMessage('Budget must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('requiredSkills').isArray().withMessage('Skills must be an array'),
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

// Public routes
router.get('/', getProjects);
router.get('/:projectId', getProject);

// Protected routes
router.post('/', auth, checkRole('employer'), projectValidation, createProject);
router.put('/:projectId', auth, checkRole('employer'), isProjectParticipant, projectValidation, updateProject);
router.post('/:projectId/apply', auth, checkRole('freelancer'), applyForProject);
router.post('/:projectId/applications/:applicationId/approve', auth, checkRole('employer'), approveApplication);
router.post('/:projectId/milestones/:milestoneId/submit', auth, checkRole('freelancer'), isProjectParticipant, milestoneValidation, submitMilestone);
router.post('/:projectId/milestones/:milestoneId/review', auth, checkRole('employer'), isProjectParticipant, reviewValidation, reviewMilestone);

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

    // Create escrow record
    const escrow = new Escrow({
      project: project._id,
      amount: budget,
      employer: req.user.id,
      status: 'pending',
      paymentIntentId: paymentIntent.id,
      milestones: milestones.map(milestone => ({
        milestoneId: milestone._id,
        amount: milestone.amount,
        status: 'pending'
      }))
    });

    await escrow.save();

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

// Get escrow details for a project
router.get('/:projectId/escrow', auth, async (req, res) => {
  try {
    console.log('Fetching escrow for project:', req.params.projectId);
    console.log('Current user:', {
      id: req.user.id,
      role: req.user.role,
      email: req.user.email
    });
    
    // First check if the project exists
    const project = await Project.findById(req.params.projectId)
      .populate('employer', 'name email')
      .populate('assignedTo', 'name email');
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    console.log('Project details:', {
      id: project._id,
      employer: project.employer,
      assignedTo: project.assignedTo,
      status: project.status
    });

    const escrow = await Escrow.findOne({ project: req.params.projectId })
      .populate('project')
      .populate('employer', 'name email')
      .populate('freelancer', 'name email');

    if (!escrow) {
      console.log('No escrow found for project:', req.params.projectId);
      return res.status(404).json({ message: 'Escrow not found' });
    }

    console.log('Escrow details:', {
      id: escrow._id,
      employer: escrow.employer,
      freelancer: escrow.freelancer,
      status: escrow.status
    });

    // Check if user is authorized to view escrow details
    const isAdmin = req.user.role === 'admin';
    const isEmployer = escrow.employer._id.toString() === req.user.id;
    const isFreelancer = escrow.freelancer && escrow.freelancer._id.toString() === req.user.id;
    const isProjectFreelancer = project.assignedTo && project.assignedTo.toString() === req.user.id;

    console.log('Authorization check:', {
      isAdmin,
      isEmployer,
      isFreelancer,
      isProjectFreelancer,
      userId: req.user.id,
      employerId: escrow.employer._id,
      freelancerId: escrow.freelancer?._id,
      projectAssignedTo: project.assignedTo
    });

    if (!isAdmin && !isEmployer && !isFreelancer && !isProjectFreelancer) {
      return res.status(403).json({ 
        message: 'Not authorized to view escrow details',
        details: 'User must be admin, employer, or assigned freelancer',
        userRole: req.user.role,
        userId: req.user.id
      });
    }

    console.log('Successfully fetched escrow details');
    res.json(escrow);
  } catch (error) {
    console.error('Get Escrow Error:', {
      message: error.message,
      stack: error.stack,
      projectId: req.params.projectId
    });
    res.status(500).json({ 
      message: 'Failed to fetch escrow details',
      error: error.message 
    });
  }
});

module.exports = router; 