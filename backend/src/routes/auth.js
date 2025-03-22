const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {auth} = require('../middleware/auth');
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/authController');

// Validation middleware
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .isIn(['freelancer', 'employer', 'admin'])
    .withMessage('Invalid role specified'),
  body('skills').optional({ nullable: true, checkFalsy: true }).isArray(),
  body('bio').optional({ nullable: true, checkFalsy: true }).trim(),
  body('hourlyRate').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 })
];

const loginValidation = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

const updateProfileValidation = [
  body('name').optional().trim().notEmpty(),
  body('bio').optional().trim(),
  body('skills').optional().isArray(),
  body('hourlyRate').optional().isFloat({ min: 0 })
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

// Routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', auth, getProfile);
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfileValidation, updateProfile);
router.put('/change-password', auth, changePasswordValidation, changePassword);

module.exports = router; 