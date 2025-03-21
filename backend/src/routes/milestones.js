const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {auth} = require('../middleware/auth');
const { 
    createMilestone,
    getMilestones,
    getMilestoneById,
    updateMilestone,
    deleteMilestone,
    submitMilestoneForReview,
    approveMilestone,
    rejectMilestone
} = require('../controllers/milestone');

// Validation middleware
const milestoneValidation = [
    body('title').notEmpty().trim().withMessage('Milestone title is required'),
    body('description').notEmpty().trim().withMessage('Description is required'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('dueDate').isISO8601().withMessage('Valid due date is required'),
    body('projectId').notEmpty().withMessage('Project ID is required')
];

// Create a new milestone
router.post('/', 
    auth,
    milestoneValidation,
    createMilestone
);

// Get all milestones for a project
router.get('/project/:projectId', 
    auth,
    getMilestones
);

// Get specific milestone
router.get('/:id', 
    auth,
    getMilestoneById
);

// Update milestone
router.put('/:id', 
    auth,
    milestoneValidation,
    updateMilestone
);

// Delete milestone
router.delete('/:id', 
    auth,
    deleteMilestone
);

// Submit milestone for review
router.post('/:id/submit', 
    auth,
    submitMilestoneForReview
);

// Approve milestone
router.post('/:id/approve', 
    auth,
    approveMilestone
);

// Reject milestone
router.post('/:id/reject', 
    auth,
    // [
    //     body('reason').notEmpty().trim().withMessage('Rejection reason is required')
    // ],
    rejectMilestone
);

module.exports = router; 