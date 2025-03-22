import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const MilestoneManagement = ({ project, onMilestoneUpdate }) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const handleSubmitMilestone = async (milestoneId, submission) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/milestones/${milestoneId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(submission)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit milestone');
      }

      toast.success('Milestone submitted successfully!');
      onMilestoneUpdate(data.milestone);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveMilestone = async (milestoneId) => {
    setIsApproving(true);
    try {
      const response = await fetch(`/api/projects/${project._id}/milestones/${milestoneId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to approve milestone');
      }

      const updatedProject = await response.json();
      const updatedMilestone = updatedProject.milestones.find(m => m._id === milestoneId);
      onMilestoneUpdate(updatedMilestone);
      toast.success('Milestone approved successfully');
    } catch (error) {
      console.error('Error approving milestone:', error);
      toast.error('Failed to approve milestone');
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectMilestone = async (milestoneId) => {
    try {
      const reason = prompt('Please provide a reason for rejecting the milestone:');
      if (!reason) return;

      const response = await fetch(`/api/projects/${project._id}/milestones/${milestoneId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw new Error('Failed to reject milestone');
      }

      const updatedProject = await response.json();
      const updatedMilestone = updatedProject.milestones.find(m => m._id === milestoneId);
      onMilestoneUpdate(updatedMilestone);
      toast.success('Milestone rejected successfully');
    } catch (error) {
      console.error('Error rejecting milestone:', error);
      toast.error('Failed to reject milestone');
    }
  };

  const isEmployer = user?.id === project.employer;
  const isFreelancer = user?.id === project.freelancer;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Milestones</h2>
      {project.milestones.map((milestone) => (
        <div key={milestone._id} className="border rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold">{milestone.title}</h3>
              <p className="text-gray-600 mt-1">{milestone.description}</p>
              <div className="mt-2 text-sm text-gray-500">
                <p>Amount: ${milestone.amount}</p>
                <p>Deadline: {new Date(milestone.deadline).toLocaleDateString()}</p>
                <p>Status: <span className={`font-semibold ${getStatusColor(milestone.status)}`}>{milestone.status}</span></p>
              </div>
            </div>
            {milestone.status === 'pending' && isFreelancer && (
              <button
                onClick={() => handleSubmitMilestone(milestone._id, {})}
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Milestone'}
              </button>
            )}
            {milestone.status === 'submitted' && isEmployer && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleApproveMilestone(milestone._id)}
                  disabled={isApproving}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {isApproving ? 'Approving...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleRejectMilestone(milestone._id)}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
          {milestone.status === 'submitted' && (
            <div className="mt-4">
              <h4 className="font-semibold">Submission Details</h4>
              <p className="text-gray-600">{milestone.submission?.description}</p>
              {milestone.submission?.attachments?.length > 0 && (
                <div className="mt-2">
                  <h5 className="font-medium">Attachments:</h5>
                  <ul className="list-disc list-inside">
                    {milestone.submission.attachments.map((attachment, index) => (
                      <li key={index}>
                        <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {attachment.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case 'pending':
      return 'text-yellow-600';
    case 'submitted':
      return 'text-blue-600';
    case 'approved':
      return 'text-green-600';
    case 'released':
      return 'text-purple-600';
    default:
      return 'text-gray-600';
  }
};

export default MilestoneManagement; 