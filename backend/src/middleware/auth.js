const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Project = require('../models/Project');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.id });

    if (!user) {
      throw new Error();
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate.' });
  }
};

const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.' 
      });
    }
    next();
  };
};

const isProjectParticipant = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    if (project.employer?._id.toString() !== req.user._id.toString() && 
        project.freelancer?._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Access denied. You are not a participant of this project.' 
      });
    }

    req.project = project;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  auth,
  checkRole,
  isProjectParticipant
}; 