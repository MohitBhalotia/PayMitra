import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import paymentService  from '../services/paymentService';
import { toast } from 'react-hot-toast';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [escrowPayments, setEscrowPayments] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEscrow, setSelectedEscrow] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [paymentsData, statsData] = await Promise.all([
        paymentService.getAllEscrowPayments(),
        paymentService.getPaymentStatistics()
      ]);
      setEscrowPayments(paymentsData);
      setStatistics(statsData);
    } catch (error) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReleasePayment = async (escrowId, milestoneId) => {
    if (!window.confirm('Are you sure you want to release this payment?')) {
      return;
    }

    try {
      await paymentService.releaseMilestonePayment(escrowId, milestoneId);
      toast.success('Payment released successfully!');
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleRefund = async (escrowId) => {
    if (!window.confirm('Are you sure you want to process this refund?')) {
      return;
    }

    try {
      await paymentService.refundEscrowPayment(escrowId);
      toast.success('Refund processed successfully!');
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleViewDetails = async (escrowId) => {
    try {
      const details = await paymentService.getEscrowPaymentDetails(escrowId);
      setSelectedEscrow(details);
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Error</h2>
          <p className="mt-4 text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Projects</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{statistics.totalProjects}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Freelancers</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{statistics.totalFreelancers}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Employers</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{statistics.totalEmployers}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Escrow Amount</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">${statistics.totalEscrowAmount}</p>
          </div>
        </div>

        {/* Escrow Payments Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">Escrow Payments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {escrowPayments.map((escrow) => (
                  <tr key={escrow._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{escrow.project.title}</div>
                      <div className="text-sm text-gray-500">
                        {escrow.employer.name} → {escrow.freelancer?.name || 'Unassigned'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">${escrow.amount}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        {escrow.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                         escrow.status === 'funded' ? 'bg-green-100 text-green-800' :
                         escrow.status === 'released' ? 'bg-blue-100 text-blue-800' :
                         'bg-gray-100 text-gray-800'}">
                        {escrow.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(escrow.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(escrow._id)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View Details
                      </button>
                      {escrow.status === 'funded' && (
                        <button
                          onClick={() => handleRefund(escrow._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Escrow Details Modal */}
      {selectedEscrow && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900">Escrow Payment Details</h3>
              <button
                onClick={() => setSelectedEscrow(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Project</h4>
                <p className="mt-1 text-sm text-gray-900">{selectedEscrow.project.title}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500">Amount</h4>
                <p className="mt-1 text-sm text-gray-900">${selectedEscrow.amount}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500">Status</h4>
                <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                  {selectedEscrow.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                   selectedEscrow.status === 'funded' ? 'bg-green-100 text-green-800' :
                   selectedEscrow.status === 'released' ? 'bg-blue-100 text-blue-800' :
                   'bg-gray-100 text-gray-800'}">
                  {selectedEscrow.status}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500">Milestones</h4>
                <div className="mt-2 space-y-2">
                  {selectedEscrow.milestones.map((milestone) => (
                    <div
                      key={milestone._id}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded"
                    >
                      <div>
                        <p className="text-sm text-gray-900">{milestone.description}</p>
                        <p className="text-sm text-gray-500">${milestone.amount}</p>
                      </div>
                      {milestone.status === 'approved' && selectedEscrow.status === 'funded' && (
                        <button
                          onClick={() => handleReleasePayment(selectedEscrow._id, milestone._id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Release Payment
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 