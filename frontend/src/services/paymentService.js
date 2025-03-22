import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';

// Ensure API_URL always includes /api prefix
const API_URL = (import.meta.env.VITE_API_URL)

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_URL}/api`
});

// Add request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const paymentService = {
  // Initialize Stripe
  initStripe: async () => {
    const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHER_KEY);
    return stripe;
  },

  // Create payment intent for project escrow
  createProjectEscrow: async (projectData) => {
    try {
      const response = await api.post('/projects', projectData);
      console.log('Project creation response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Project creation error:', error.response?.data || error.message);
      console.error('Request URL:', error.config?.url); // Debug log for request URL
      throw new Error(error.response?.data?.message || 'Failed to create project escrow');
    }
  },

  // Handle project payment
  handleProjectPayment: async (projectId, paymentMethodId) => {
    try {
      const response = await api.post(`/projects/${projectId}/pay`, { paymentMethodId });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to process payment');
    }
  },

  // Get escrow details
  getEscrowDetails: async (projectId) => {
    try {
      const response = await api.get(`/projects/${projectId}/escrow`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch escrow details');
    }
  },

  // Get payment history
  getPaymentHistory: async () => {
    try {
      const response = await api.get('/payments/history');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get payment history');
    }
  },

  // Admin: Get all escrow payments
  getAllEscrowPayments: async () => {
    try {
      // Get all projects that have milestones
      const response = await api.get('/projects');
      console.log('Admin projects response:', response.data); // Debug log
      
      // Filter projects to only include those with milestones
      const projectsWithMilestones = response.data.filter(project => 
        project.milestones && project.milestones.length > 0
      );
      
      return { projects: projectsWithMilestones };
    } catch (error) {
      console.error('Admin projects error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch payments');
    }
  },

  // Admin: Get payment statistics
  getPaymentStatistics: async () => {
    try {
      const response = await api.get('/admin/statistics');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get payment statistics');
    }
  },

  // Admin: Release milestone payment
  releaseMilestonePayment: async (projectId, milestoneId) => {
    try {
      console.log('Attempting milestone payment release:', { projectId, milestoneId }); // Debug log
      const result = await paymentService.releasePayment(projectId, milestoneId);
      console.log('Milestone payment release result:', result); // Debug log
      return result;
    } catch (error) {
      console.error('Milestone payment release error:', error);
      throw error;
    }
  },

  // Admin: Process refund
  refundEscrowPayment: async (escrowId) => {
    try {
      const response = await api.post('/admin/payments/refund', { escrowId });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to process refund');
    }
  },

  // Admin: Get payment details
  getEscrowPaymentDetails: async (escrowId) => {
    try {
      const response = await api.get(`/admin/payments/${escrowId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get payment details');
    }
  },

  // Project functions
  getProjects: async (filters = {}, sortBy = 'newest') => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.minBudget) queryParams.append('minBudget', filters.minBudget);
      if (filters.maxBudget) queryParams.append('maxBudget', filters.maxBudget);
      queryParams.append('sortBy', sortBy);

      const response = await api.get(`/projects?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch projects');
    }
  },

  getProjectDetails: async (projectId) => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch project details');
    }
  },

  applyForProject: async (projectId, proposal) => {
    try {
      const response = await api.post(`/projects/${projectId}/apply`, { proposal });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to apply for project');
    }
  },

  submitMilestone: async (projectId, milestoneId, submission) => {
    try {
      const response = await api.post(
        `/projects/${projectId}/milestones/${milestoneId}/submit`,
        { submission }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to submit milestone');
    }
  },

  approveMilestone: async (projectId, milestoneId) => {
    try {
      const response = await api.post(
        `/projects/${projectId}/milestones/${milestoneId}/approve`
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to approve milestone');
    }
  },

  // Create a Stripe Connect account for a freelancer
  createStripeConnectAccount: async () => {
    try {
      console.log('Attempting to create Stripe Connect account...');
      const response = await api.post('/stripe/connect');
      console.log('Stripe Connect response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Stripe Connect Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });
      throw new Error(error.response?.data?.message || error.response?.data?.error || 'Failed to create Stripe Connect account');
    }
  },

  // Get the status of a freelancer's Stripe Connect account
  getStripeConnectStatus: async () => {
    try {
      const response = await api.get('/stripe/connect/status');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get Stripe Connect status');
    }
  },

  // Release payment to freelancer
  releasePayment: async (projectId, milestoneId) => {
    try {
      // First, get the project details to check milestone status
      const projectResponse = await api.get(`/projects/${projectId}`);
      const project = projectResponse.data;
      console.log('Project details:', project); // Debug log

      const milestone = project.milestones?.find(m => m._id === milestoneId);
      if (!milestone) {
        throw new Error('Milestone not found');
      }
      console.log('Milestone details:', milestone); // Debug log

      if (milestone.status !== 'approved') {
        throw new Error('Milestone must be approved before payment can be released');
      }

      // Check if freelancer has Stripe account
      if (!project.freelancer?.stripeAccountId) {
        console.log('Freelancer details:', project.freelancer); // Debug log
        throw new Error('Freelancer has not connected their Stripe account');
      }

      console.log('Attempting payment release:', { projectId, milestoneId }); // Debug log
      const response = await api.post('/stripe/release-payment', { 
        projectId, 
        milestoneId 
      });
      console.log('Payment release response:', response.data); // Debug log
      return response.data;
    } catch (error) {
      console.error('Payment release error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });
      throw new Error(error.response?.data?.message || error.message || 'Failed to release payment');
    }
  },

  // Approve a project application
  approveApplication: async (projectId, applicationId) => {
    try {
      const response = await api.post(`/projects/${projectId}/applications/${applicationId}/approve`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to approve application');
    }
  },
};

export default paymentService;