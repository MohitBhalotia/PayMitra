const Project = require('../models/Project');
const Escrow = require('../models/Escrow');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { validationResult } = require('express-validator');

// Create new project
exports.createProject = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      budget,
      category,
      requiredSkills,
      deadline,
      milestones
    } = req.body;

    const project = new Project({
      title,
      description,
      employer: req.user._id,
      budget,
      category,
      requiredSkills,
      deadline,
      milestones
    });

    await project.save();

    // For testing, we'll skip Stripe integration
    if (process.env.NODE_ENV !== 'test') {
      // Create payment intent for escrow
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(budget * 100), // Convert to cents
        currency: 'inr',
        metadata: {
          projectId: project._id,
          type: 'escrow'
        }
      });

      // Create escrow record
      const escrow = new Escrow({
        project: project._id,
        amount: budget,
        employer: req.user._id,
        paymentIntentId: paymentIntent.id,
        milestones: milestones.map(milestone => ({
          milestoneId: milestone._id,
          amount: milestone.amount,
          status: 'pending'
        }))
      });

      await escrow.save();

      return res.status(201).json({
        project,
        escrow,
        clientSecret: paymentIntent.client_secret
      });
    }

    // For testing, return just the project
    res.status(201).json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all projects (with filters)
exports.getProjects = async (req, res) => {
  try {
    const { status, category, skills, employer, freelancer } = req.query;
    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (skills) query.skills = { $in: skills.split(',') };
    if (employer) query.employer = employer;
    if (freelancer) query.freelancer = freelancer;

    const projects = await Project.find(query)
      .populate('employer', 'name email')
      .populate('freelancer', 'name email')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single project
exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate('employer', 'name email')
      .populate('freelancer', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update project
exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is the employer
    if (project.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const {
      title,
      description,
      budget,
      category,
      skills,
      deadline,
      status
    } = req.body;

    if (title) project.title = title;
    if (description) project.description = description;
    if (budget) project.budget = budget;
    if (category) project.category = category;
    if (skills) project.skills = skills;
    if (deadline) project.deadline = deadline;
    if (status) project.status = status;

    await project.save();
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Apply for project (freelancer)
exports.applyForProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.freelancer) {
      return res.status(400).json({ message: 'Project already has a freelancer' });
    }

    // Update project with freelancer
    project.freelancer = req.user._id;
    project.status = 'active';
    await project.save();

    // Update escrow with freelancer
    const escrow = await Escrow.findOne({ project: project._id });
    if (escrow) {
      escrow.freelancer = req.user._id;
      await escrow.save();
    }

    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Submit milestone work
exports.submitMilestone = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    const milestoneId=req.params.milestoneId;
    const { description, attachments } = req.body;

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const milestone = project.milestones.id(milestoneId);
    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    // Check if user is the freelancer
    if (project.freelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    milestone.status = 'submitted';
    milestone.submission = {
      description,
      attachments,
      submittedAt: Date.now()
    };

    await project.save();
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Review milestone submission
exports.reviewMilestone = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    const milestoneId=req.params.milestoneId;
    const {  status, feedback } = req.body;

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const milestone = project.milestones.id(milestoneId);
    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    // Check if user is the employer
    if (project.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    milestone.status = status;
    milestone.feedback = feedback;

    if (status === 'approved') {
      project.totalPaid += milestone.amount;
    }

    await project.save();
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}; 