const Project = require('../models/Project');
const Escrow = require('../models/Escrow');
const { validationResult } = require('express-validator');

// Initialize Stripe with error handling
let stripe;
try {
  if (!process.env.STRIPE_SECRET_KEY) {    
    throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
  }
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  console.log('Stripe initialized successfully');
} catch (error) {
  console.error('Failed to initialize Stripe:', error.message);
}

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
      status: 'open',
      milestones: milestones.map(milestone => ({
        title: milestone.title,
        description: milestone.description,
        amount: milestone.amount,
        dueDate: milestone.dueDate,
        status: 'pending'
      }))
    });

    await project.save();

    // For testing, we'll skip Stripe integration
    if (process.env.NODE_ENV !== 'test') {
      try {
        if (!stripe) {
          throw new Error('Stripe is not properly initialized');
        }

        // Debug log before Stripe call
        console.log('Creating Stripe payment intent...');
        console.log('Budget:', budget);
        console.log('Amount in cents:', Math.round(budget * 100));
        
        // Create payment intent for escrow
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(budget * 100), // Convert to cents
          currency: 'inr',
          metadata: {
            projectId: project._id,
            type: 'escrow'
          }
        });

        // Debug log after successful Stripe call
        console.log('Stripe payment intent created successfully:', paymentIntent.id);

        // Create escrow record using MongoDB-generated milestone IDs
        const escrow = new Escrow({
          project: project._id,
          amount: budget,
          employer: req.user._id,
          paymentIntentId: paymentIntent.id,
          milestones: project.milestones.map(milestone => ({
            milestoneId: milestone._id, // Use MongoDB-generated _id
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
      } catch (stripeError) {
        console.error('Stripe Error:', stripeError);
        // If Stripe fails, still return the project but without escrow
        return res.status(201).json({
          project,
          message: 'Project created but payment setup failed. Please try again.'
        });
      }
    }

    // For testing, return just the project
    res.status(201).json(project);
  } catch (error) {
    console.error('Project Creation Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all projects (with filters)
exports.getProjects = async (req, res) => {
  try {
    const { status, category, skills, employer, freelancer, minBudget, maxBudget, sortBy } = req.query;
    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (skills) query.requiredSkills = { $in: skills.split(',') };
    if (employer) query.employer = employer;
    if (freelancer) query.freelancer = freelancer;
    if (minBudget) query.budget = { $gte: parseFloat(minBudget) };
    if (maxBudget) query.budget = { ...query.budget, $lte: parseFloat(maxBudget) };

    // Build sort object
    let sort = { createdAt: -1 }; // Default sort
    if (sortBy === 'budget_asc') sort = { budget: 1 };
    if (sortBy === 'budget_desc') sort = { budget: -1 };
    if (sortBy === 'deadline_asc') sort = { deadline: 1 };
    if (sortBy === 'deadline_desc') sort = { deadline: -1 };

    const projects = await Project.find(query)
      .populate('employer', 'name email')
      .populate('freelancer', 'name email')
      .populate('applications.freelancer', 'name email')
      .sort(sort);

    // Return empty array instead of 404 when no projects found
    res.json(projects || []);
  } catch (error) {
    console.error('Get Projects Error:', error);
    res.status(500).json({ message: 'Failed to fetch projects' });
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

    // Check if freelancer has already applied
    const existingApplication = project.applications.find(
      app => app.freelancer.toString() === req.user._id.toString()
    );
    if (existingApplication) {
      return res.status(400).json({ message: 'You have already applied for this project' });
    }

    // Add new application
    project.applications.push({
      freelancer: req.user._id,
      proposal: req.body.proposal || 'I am interested in working on this project.'
    });

    await project.save();
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Approve application (employer)
exports.approveApplication = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is the employer
    if (project.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const application = project.applications.find(
      app => app._id.toString() === req.params.applicationId
    );

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ message: 'Application has already been processed' });
    }

    // Update application status
    application.status = 'approved';

    // Update project with selected freelancer
    project.freelancer = application.freelancer;
    project.status = 'active';

    // Update other applications to rejected
    project.applications.forEach(app => {
      if (app._id.toString() !== application._id.toString()) {
        app.status = 'rejected';
      }
    });

    await project.save();
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