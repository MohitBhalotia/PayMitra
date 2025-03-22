const { validationResult } = require('express-validator');
const Milestone = require('../models/milestone');
const Project = require('../models/Project');
const Escrow = require('../models/Escrow');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create a new milestone
exports.createMilestone = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const project = await Project.findById(req.body.projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Only project owner can create milestones
        if (project.employer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to create milestones for this project' });
        }

        const milestone = new Milestone({
            ...req.body,
            status: 'pending',
            project: req.body.projectId,
            createdBy: req.user.id
        });

        await milestone.save();
        res.status(201).json(milestone);
    } catch (error) {
        res.status(500).json({ message: 'Error creating milestone', error: error.message });
    }
};

// Get all milestones for a project
exports.getMilestones = async (req, res) => {
    try {
        const milestones = await Milestone.find({ project: req.params.projectId })
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
        res.json(milestones);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching milestones', error: error.message });
    }
};

// Get specific milestone
exports.getMilestoneById = async (req, res) => {
    try {
        const milestone = await Milestone.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('project', 'title employer freelancer');
        
        if (!milestone) {
            return res.status(404).json({ message: 'Milestone not found' });
        }

        res.json(milestone);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching milestone', error: error.message });
    }
};

// Update milestone
exports.updateMilestone = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const milestone = await Milestone.findById(req.params.id);
        if (!milestone) {
            return res.status(404).json({ message: 'Milestone not found' });
        }

        const project = await Project.findById(milestone.project);
        if (project.employer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this milestone' });
        }

        if (milestone.status !== 'pending') {
            return res.status(400).json({ message: 'Cannot update milestone that is not pending' });
        }

        const updatedMilestone = await Milestone.findByIdAndUpdate(
            req.params.id,
            { ...req.body },
            { new: true }
        );

        res.json(updatedMilestone);
    } catch (error) {
        res.status(500).json({ message: 'Error updating milestone', error: error.message });
    }
};

// Delete milestone
exports.deleteMilestone = async (req, res) => {
    try {
        const milestone = await Milestone.findById(req.params.id);
        if (!milestone) {
            return res.status(404).json({ message: 'Milestone not found' });
        }

        const project = await Project.findById(milestone.project);
        if (project.employer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this milestone' });
        }

        if (milestone.status !== 'pending') {
            return res.status(400).json({ message: 'Cannot delete milestone that is not pending' });
        }

        await milestone.remove();
        res.json({ message: 'Milestone deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting milestone', error: error.message });
    }
};

// Submit milestone for review
exports.submitMilestoneForReview = async (req, res) => {
    try {
        const milestone = await Milestone.findById(req.params.id);
        if (!milestone) {
            return res.status(404).json({ message: 'Milestone not found' });
        }

        const project = await Project.findById(milestone.project);
        if (project.freelancer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to submit this milestone' });
        }

        if (milestone.status !== 'pending') {
            return res.status(400).json({ message: 'Milestone is not in pending state' });
        }

        milestone.status = 'submitted';
        milestone.submittedAt = Date.now();
        await milestone.save();

        res.json(milestone);
    } catch (error) {
        res.status(500).json({ message: 'Error submitting milestone', error: error.message });
    }
};

// Approve milestone
exports.approveMilestone = async (req, res) => {
    try {
        const milestone = await Milestone.findById(req.params.id);
        if (!milestone) {
            return res.status(404).json({ message: 'Milestone not found' });
        }

        const project = await Project.findById(milestone.project);
        if (project.employer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to approve this milestone' });
        }

        if (milestone.status !== 'submitted') {
            return res.status(400).json({ message: 'Milestone must be submitted before approval' });
        }

        // Find escrow for this project
        const escrow = await Escrow.findOne({ project: milestone.project });
        if (!escrow) {
            return res.status(400).json({ message: 'No escrow found for this project' });
        }

        if (escrow.status !== 'funded') {
            return res.status(400).json({ message: 'Escrow is not funded' });
        }

        // Find milestone in escrow
        const escrowMilestone = escrow.milestones.find(m => m.milestoneId.toString() === milestone._id.toString());
        if (!escrowMilestone) {
            return res.status(400).json({ message: 'Milestone not found in escrow' });
        }

        if (escrowMilestone.status !== 'pending') {
            return res.status(400).json({ message: 'Milestone payment already processed' });
        }

        // Update milestone status
        milestone.status = 'approved';
        milestone.approvedAt = Date.now();
        await milestone.save();

        // Update escrow milestone status
        escrowMilestone.status = 'pending';
        escrowMilestone.approvedBy = req.user.id;
        escrowMilestone.approvedAt = Date.now();
        await escrow.save();

        res.json({
            message: 'Milestone approved successfully',
            milestone
        });
    } catch (error) {
        res.status(500).json({ message: 'Error approving milestone', error: error.message });
    }
};

// Reject milestone
exports.rejectMilestone = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const milestone = await Milestone.findById(req.params.id);
        if (!milestone) {
            return res.status(404).json({ message: 'Milestone not found' });
        }

        const project = await Project.findById(milestone.project);
        if (project.employer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to reject this milestone' });
        }

        if (milestone.status !== 'submitted') {
            return res.status(400).json({ message: 'Milestone must be submitted before rejection' });
        }

        milestone.status = 'rejected';
        milestone.rejectionReason = req.body.reason;
        milestone.rejectedAt = Date.now();
        await milestone.save();

        res.json(milestone);
    } catch (error) {
        res.status(500).json({ message: 'Error rejecting milestone', error: error.message });
    }
}; 