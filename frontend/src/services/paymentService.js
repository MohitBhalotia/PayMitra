import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const paymentService = {
  // Initialize Stripe
  initStripe: async () => {
    const stripe = await loadStripe(process.env.VITE_STRIPE_PUBLIC_KEY);
    return stripe;
  },

  // Create payment intent for project escrow
  createProjectEscrow: async (projectData) => {
    try {
      const response = await axios.post(`${API_URL}/projects`, projectData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create project escrow');
    }
  },

  // Handle project payment
  handleProjectPayment: async (projectId, paymentMethodId) => {
    try {
      const response = await axios.post(
        `${API_URL}/projects/${projectId}/pay`,
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
      const response = await axios.get(`${API_URL}/projects/${projectId}/escrow`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get escrow details');
    }
  },

  // Get payment history
  getPaymentHistory: async () => {
    try {
      const response = await axios.get(`${API_URL}/payments/history`, {
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
      const response = await axios.get(`${API_URL}/admin/payments`, {
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
      const response = await axios.get(`${API_URL}/admin/statistics`, {
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
        `${API_URL}/admin/payments/release`,
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
        `${API_URL}/admin/payments/refund`,
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
      const response = await axios.get(`${API_URL}/admin/payments/${escrowId}`, {
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
      const response = await axios.get(`${API_URL}/projects`, {
        params: { ...filters, sortBy },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get projects');
    }
  },

  getProjectDetails: async (projectId) => {
    try {
      const response = await axios.get(`${API_URL}/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get project details');
    }
  },

  applyForProject: async (projectId) => {
    try {
      const response = await axios.post(
        `${API_URL}/projects/${projectId}/apply`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
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
        `${API_URL}/projects/${projectId}/milestones/${milestoneId}/submit`,
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
        `${API_URL}/projects/${projectId}/milestones/${milestoneId}/approve`,
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
  }
};

export default paymentService;