import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import paymentService from '../services/paymentService';
import { toast } from 'react-hot-toast';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState('pending'); // pending, completed, all

  useEffect(() => {
    fetchProjects();
  }, [selectedTab]);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const data = await paymentService.getAllEscrowPayments();
      console.log('Fetched projects data:', data); // Debug log

      if (!data.projects || !Array.isArray(data.projects)) {
        console.error('Invalid projects data:', data);
        throw new Error('Invalid projects data received');
      }

      setProjects(data.projects);
    } catch (error) {
      console.error('Fetch projects error:', error);
      setError(error.message || 'Failed to fetch projects');
      toast.error(error.message || 'Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReleasePayment = async (projectId, milestoneId) => {
    try {
      console.log('Releasing payment for:', { projectId, milestoneId }); // Debug log
      await paymentService.releaseMilestonePayment(projectId, milestoneId);
      toast.success('Payment released successfully');
      await fetchProjects(); // Refresh the list
    } catch (error) {
      console.error('Payment release error:', error);
      toast.error(error.message || 'Failed to release payment');
    }
  };

  const handleRefundPayment = async (projectId) => {
    try {
      await paymentService.refundEscrowPayment(projectId);
      toast.success('Payment refunded successfully');
      fetchProjects(); // Refresh the list
    } catch (error) {
      toast.error(error.message || 'Failed to refund payment');
    }
  };

  const filteredProjects = projects.filter(project => {
    console.log('Filtering project:', project); // Debug log
    if (!project.milestones || !Array.isArray(project.milestones)) {
      console.log('Project has no milestones:', project);
      return false;
    }

    if (selectedTab === 'pending') {
      return project.milestones.some(m =>
        m.status === 'submitted' || m.status === 'approved'
      );
    }
    if (selectedTab === 'completed') {
      return project.milestones.every(m => m.status === 'paid');
    }
    return true;
  });

  // Add debug logging for filtered projects
  useEffect(() => {
    console.log('All projects:', projects);
    console.log('Filtered projects:', filteredProjects);
    console.log('Selected tab:', selectedTab);
  }, [projects, filteredProjects, selectedTab]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setSelectedTab('pending')}
            className={`px-4 py-2 rounded-md ${selectedTab === 'pending'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700'
              }`}
          >
            Pending Payments
          </button>
          <button
            onClick={() => setSelectedTab('completed')}
            className={`px-4 py-2 rounded-md ${selectedTab === 'completed'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700'
              }`}
          >
            Completed
          </button>
          <button
            onClick={() => setSelectedTab('all')}
            className={`px-4 py-2 rounded-md ${selectedTab === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700'
              }`}
          >
            All Projects
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Freelancer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Milestone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project) =>
                  project.milestones?.map((milestone) => (
                    <tr key={`${project._id}-${milestone._id}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {project.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {project.employer?.name || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {project.freelancer?.name || 'Not assigned'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {milestone.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          ${milestone.amount}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${milestone.status === 'submitted'
                            ? 'bg-yellow-100 text-yellow-800'
                            : milestone.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : milestone.status === 'paid'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                        >
                          {milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {milestone.status === 'approved' && (
                          <button
                            onClick={() => handleReleasePayment(project._id, milestone._id)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Release Payment
                          </button>
                        )}
                        {milestone.status === 'submitted' && (
                          <span className="text-yellow-600">
                            Waiting for employer approval
                          </span>
                        )}
                        {milestone.status === 'paid' && (
                          <span className="text-green-600">
                            Payment completed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No projects found matching the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No projects found matching the selected filter.</p>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 