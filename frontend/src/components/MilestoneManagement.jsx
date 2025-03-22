import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const MilestoneManagement = ({ project, onMilestoneUpdate }) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);

  // Debug logging
  console.log('MilestoneManagement Debug:', {
    currentUser: user,
    projectEmployer: project.employer,
    isEmployer: user?._id === project.employer?._id,
    projectStatus: project.status,
    milestones: project.milestones
  });

  const handleSubmitMilestone = async (milestoneId) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${project._id}/milestones/${milestoneId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submission: {
            description: 'Milestone completed',
            submittedAt: new Date()
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit milestone');
      }

      const updatedProject = await response.json();
      onMilestoneUpdate(updatedProject);
      toast.success('Milestone submitted successfully');
    } catch (error) {
      console.error('Error submitting milestone:', error);
      toast.error('Failed to submit milestone');
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
      onMilestoneUpdate(updatedProject);
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
      onMilestoneUpdate(updatedProject);
      toast.success('Milestone rejected successfully');
    } catch (error) {
      console.error('Error rejecting milestone:', error);
      toast.error('Failed to reject milestone');
    }
  };

  const handleRaiseDispute = async (milestoneId) => {
    try {
      const reason = prompt('Please provide a reason for the dispute:');
      if (!reason) return;

      const description = prompt('Please provide additional details for the dispute:');
      if (!description) return;

      const response = await fetch(`/api/projects/${project._id}/disputes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          milestoneId,
          reason,
          description
        })
      });

      if (!response.ok) {
        throw new Error('Failed to raise dispute');
      }

      toast.success('Dispute raised successfully');
    } catch (error) {
      console.error('Error raising dispute:', error);
      toast.error('Failed to raise dispute');
    }
  };

  // Check if the current user is the employer or freelancer
  const isEmployer = user?._id === project.employer?._id;
  const isFreelancer = user?._id === project.freelancer?._id;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Milestones</h2>
      {project.milestones?.map((milestone) => {
        // Debug log for each milestone
        console.log('Milestone Debug:', {
          id: milestone._id,
          status: milestone.status,
          isEmployer,
          shouldShowButtons: milestone.status === 'submitted' && isEmployer
        });

        return (
          <div key={milestone._id} className="border rounded-lg p-6">
            <div className="flex flex-col space-y-4">
              <div>
                <h3 className="text-xl font-semibold">{milestone.title}</h3>
                <p className="text-gray-600 mt-1">{milestone.description}</p>
                <div className="mt-2 text-sm text-gray-500">
                  <p>Amount: ${milestone.amount}</p>
                  <p>Deadline: {new Date(milestone.deadline).toLocaleDateString()}</p>
                  <p>Status: <span className={`font-semibold ${getStatusColor(milestone.status)}`}>{milestone.status}</span></p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                {/* Submit button for freelancer */}
                {milestone.status === 'pending' && isFreelancer && (
                  <button
                    onClick={() => handleSubmitMilestone(milestone._id)}
                    disabled={isSubmitting}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Milestone'}
                  </button>
                )}

                {/* Approve/Reject buttons for employer */}
                {milestone.status === 'submitted' && isEmployer && (
                  <>
                    <button
                      onClick={() => handleApproveMilestone(milestone._id)}
                      disabled={isApproving}
                      className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {isApproving ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleRejectMilestone(milestone._id)}
                      className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </>
                )}

                {/* Dispute button */}
                {(milestone.status === 'rejected' || milestone.status === 'disputed') &&
                  (isEmployer || isFreelancer) && (
                    <button
                      onClick={() => handleRaiseDispute(milestone._id)}
                      className="bg-yellow-600 text-white px-6 py-2 rounded hover:bg-yellow-700"
                    >
                      Raise Dispute
                    </button>
                  )}
              </div>
            </div>

            {/* Show submission details */}
            {milestone.status === 'submitted' && (
              <div className="mt-4">
                <h4 className="font-semibold">Submission Details</h4>
                <p className="text-gray-600">{milestone.submission?.description || 'No description provided'}</p>
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

            {/* Show rejection feedback */}
            {milestone.status === 'rejected' && milestone.feedback && (
              <div className="mt-4 bg-red-50 p-4 rounded-md">
                <h4 className="font-semibold text-red-700">Rejection Feedback</h4>
                <p className="text-red-600 mt-1">{milestone.feedback.comment}</p>
              </div>
            )}
          </div>
        );
      })}
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
    case 'rejected':
      return 'text-red-600';
    case 'disputed':
      return 'text-orange-600';
    case 'released':
      return 'text-purple-600';
    default:
      return 'text-gray-600';
  }
};

export default MilestoneManagement; 