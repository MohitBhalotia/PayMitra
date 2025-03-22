import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';

// Ensure API_URL always includes /api prefix
const API_URL = (import.meta.env.VITE_API_URL)

const paymentService = {
  // Initialize Stripe
  initStripe: async () => {
    const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHER_KEY);
    return stripe;
  },

  // Create payment intent for project escrow
  createProjectEscrow: async (projectData) => {
    try {
      const response = await axios.post(`${API_URL}/api/projects`, projectData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
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
      const response = await axios.post(
        `${API_URL}/api/projects/${projectId}/pay`,
        { paymentMethodId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to process payment');
    }
  },

  // Get escrow details
  getEscrowDetails: async (projectId) => {
    try {
      const response = await axios.get(`${API_URL}/api/escrow/${projectId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get escrow details:', error.response?.data || error.message);
      // If escrow not found, return null instead of throwing error
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(error.response?.data?.message || 'Failed to get escrow details');
    }
  },

  // Get payment history
  getPaymentHistory: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/payments/history`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get payment history');
    }
  },

  // Admin: Get all escrow payments
  getAllEscrowPayments: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/payments`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get escrow payments');
    }
  },

  // Admin: Get payment statistics
  getPaymentStatistics: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/statistics`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get payment statistics');
    }
  },

  // Admin: Release milestone payment
  releaseMilestonePayment: async (escrowId, milestoneId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/admin/payments/release`,
        { escrowId, milestoneId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to release payment');
    }
  },

  // Admin: Process refund
  refundEscrowPayment: async (escrowId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/admin/payments/refund`,
        { escrowId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to process refund');
    }
  },

  // Admin: Get payment details
  getEscrowPaymentDetails: async (escrowId) => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/payments/${escrowId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get payment details');
    }
  },

  // Project functions
  getProjects: async (filters = {}, sortBy = 'newest') => {
    try {
      const response = await axios.get(`${API_URL}/api/projects`, {
        params: { ...filters, sortBy },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data || [];
    } catch (error) {
      if (error.response?.status === 404) {
        return [];
      }
      throw new Error(error.response?.data?.message || 'Failed to get projects');
    }
  },

  getProjectDetails: async (projectId) => {
    try {
      const response = await axios.get(`${API_URL}/api/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get project details');
    }
  },

  applyForProject: async (projectId, proposal) => {
    try {
      const response = await axios.post(
        `${API_URL}/projects/${projectId}/apply`,
        { proposal },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to apply for project');
    }
  },

  submitMilestone: async (projectId, milestoneId, submission) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/projects/${projectId}/milestones/${milestoneId}/submit`,
        { submission },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to submit milestone');
    }
  },

  approveMilestone: async (projectId, milestoneId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/projects/${projectId}/milestones/${milestoneId}/approve`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to approve milestone');
    }
  },

  // Create a Stripe Connect account for a freelancer
  createStripeConnectAccount: async () => {
    try {
      const response = await axios.post(`${API_URL}/api/stripe/connect`, {}, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create Stripe Connect account');
    }
  },

  // Get the status of a freelancer's Stripe Connect account
  getStripeConnectStatus: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/stripe/connect/status`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get Stripe Connect status');
    }
  },

  // Release payment to freelancer
  releasePayment: async (projectId, milestoneId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/stripe/release-payment`,
        { projectId, milestoneId },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to release payment');
    }
  },

  // Approve a project application
  approveApplication: async (projectId, applicationId) => {
    try {
      const response = await axios.post(
        `${API_URL}/projects/${projectId}/applications/${applicationId}/approve`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to approve application');
    }
  },
};

export default paymentService;