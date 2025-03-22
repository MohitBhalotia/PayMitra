import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import paymentService from '../services/paymentService';
import { toast } from 'react-hot-toast';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  console.log(user);

  const [project, setProject] = useState(null);
  const [escrow, setEscrow] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [proposal, setProposal] = useState('');

  useEffect(() => {
    if (!authLoading) {
      fetchProjectDetails();
    }
  }, [id, authLoading]);

  // Add debug logging for authentication
  useEffect(() => {
    console.log('Auth state:', {
      authLoading,
      user,
      token: localStorage.getItem('token')
    });
  }, [authLoading, user]);

  const fetchProjectDetails = async () => {
    try {
      const projectData = await paymentService.getProjectDetails(id);
      setProject(projectData);

      // Only fetch escrow details if user is the employer or freelancer
      if (user && (
        projectData.employer._id.toString() === user._id ||
        (projectData.freelancer && projectData.freelancer._id.toString() === user._id)
      )) {
        try {
          const escrowData = await paymentService.getEscrowDetails(id);
          setEscrow(escrowData);
        } catch (error) {
          // If escrow not found or unauthorized, just set it to null
          setEscrow(null);
        }
      }
    } catch (error) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (!proposal.trim()) {
      toast.error('Please enter your proposal');
      return;
    }

    try {
      await paymentService.applyForProject(id, proposal);
      toast.success('Application submitted successfully');
      setProposal('');
      fetchProjectDetails();
    } catch (error) {
      toast.error(error.message || 'Failed to submit application');
    }
  };

  const handleApproveApplication = async (applicationId) => {
    try {
      await paymentService.approveApplication(id, applicationId);
      toast.success('Application approved successfully');
      fetchProjectDetails();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSubmitMilestone = async () => {
    if (!submissionText.trim()) {
      toast.error('Please enter your submission details');
      return;
    }

    try {
      await paymentService.submitMilestone(id, selectedMilestone._id, submissionText);
      toast.success('Milestone submitted successfully');
      setSubmissionText('');
      fetchProjectDetails();
    } catch (error) {
      toast.error(error.message || 'Failed to submit milestone');
    }
  };

  const handleApproveMilestone = async (milestoneId) => {
    try {
      await paymentService.approveMilestone(id, milestoneId);
      toast.success('Milestone approved successfully');
      fetchProjectDetails();
    } catch (error) {
      toast.error(error.message || 'Failed to approve milestone');
    }
  };

  const getApplicationStatus = () => {
    if (!user || user.role !== 'freelancer') return null;
    const application = project?.applications?.find(
      app => app.freelancer._id === user._id
    );
    return application?.status;
  };

  const isAssignedToMe = user && project?.freelancer && project.freelancer._id === user._id;
  const hasApplied = user && project?.applications?.some(app => app.freelancer._id === user._id);

  // Add debug logging
  useEffect(() => {
    console.log('Debug conditions:', {
      isFreelancer: user?.role === 'freelancer',
      projectStatus: project?.status,
      hasApplied,
      isAssignedToMe,
      user,
      project,
      freelancer: project?.freelancer,
      userId: user?._id
    });
  }, [user, project]);

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

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Project not found</p>
      </div>
    );
  }

  const isEmployer = user?.role === 'employer' && project.employer._id === user._id;
  const isFreelancer = user?.role === 'freelancer';
  const isAssignedFreelancer = project.freelancer?._id === user?._id;
  const canApply = isFreelancer && project.status === 'open' && !hasApplied && !isAssignedFreelancer;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project?.title}</h1>
              <p className="mt-1 text-sm text-gray-500">
                Posted by {project?.employer?.name} on{' '}
                {new Date(project?.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-col items-end">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${project?.status === 'open'
                  ? 'bg-green-100 text-green-800'
                  : project?.status === 'in_progress'
                    ? 'bg-blue-100 text-blue-800'
                    : project?.status === 'completed'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-red-100 text-red-800'
                  }`}
              >
                {project?.status?.replace('_', ' ')}
              </span>
              {user?.role === 'freelancer' && (
                <span className="mt-1 text-xs text-gray-500">
                  {isAssignedToMe ? (
                    <span className="text-green-600 font-medium">Assigned to you</span>
                  ) : getApplicationStatus() ? (
                    <span className={`font-medium ${getApplicationStatus() === 'pending' ? 'text-yellow-600' :
                      getApplicationStatus() === 'approved' ? 'text-green-600' :
                        'text-red-600'
                      }`}>
                      {getApplicationStatus().charAt(0).toUpperCase() + getApplicationStatus().slice(1)}
                    </span>
                  ) : null}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="prose max-w-none">
                <h2 className="text-lg font-medium text-gray-900">Description</h2>
                <p className="mt-2 text-gray-600">{project?.description}</p>
              </div>

              <div className="mt-6">
                <h2 className="text-lg font-medium text-gray-900">Required Skills</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(project?.requiredSkills || []).map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-lg p-4">
                <h2 className="text-lg font-medium text-gray-900">Project Details</h2>
                <dl className="mt-4 space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Budget</dt>
                    <dd className="mt-1 text-lg font-medium text-gray-900">
                      ${project?.budget}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Deadline</dt>
                    <dd className="mt-1 text-lg font-medium text-gray-900">
                      {new Date(project?.deadline).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="mt-1 text-lg font-medium text-gray-900">
                      {project?.status?.replace('_', ' ')}
                    </dd>
                  </div>
                  {project?.freelancer && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Assigned To</dt>
                      <dd className="mt-1 text-lg font-medium text-gray-900">
                        {project.freelancer.name}
                      </dd>
                    </div>
                  )}
                </dl>

                {user && user.role === 'freelancer' && project?.status === 'open' && !hasApplied && !isAssignedToMe && (
                  <div className="mt-6">
                    <textarea
                      rows={4}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Write your proposal here..."
                      value={proposal}
                      onChange={(e) => setProposal(e.target.value)}
                    />
                    <button
                      onClick={handleApply}
                      className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Apply for Project
                    </button>
                  </div>
                )}

                {user?.role === 'employer' && project?.status === 'open' && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-900">Applications</h3>
                    <div className="mt-2 space-y-4">
                      {project?.applications?.map((application) => (
                        <div
                          key={application._id}
                          className="bg-white p-4 rounded-lg border border-gray-200"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {application.freelancer.name}
                              </p>
                              <p className="mt-1 text-sm text-gray-500">
                                {application.proposal}
                              </p>
                            </div>
                            {application.status === 'pending' && (
                              <button
                                onClick={() => handleApproveApplication(application._id)}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {project?.milestones?.length > 0 && (
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">Milestones</h2>
            <div className="mt-4 space-y-4">
              {project.milestones.map((milestone) => (
                <div
                  key={milestone._id}
                  className="bg-white p-4 rounded-lg border border-gray-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {milestone.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {milestone.description}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Amount: ${milestone.amount}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Status: {milestone.status}
                      </p>
                    </div>
                    {isAssignedToMe && milestone.status === 'pending' && (
                      <button
                        onClick={() => setSelectedMilestone(milestone)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Submit
                      </button>
                    )}
                    {user?.role === 'employer' && milestone.status === 'submitted' && (
                      <button
                        onClick={() => handleApproveMilestone(milestone._id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                  {milestone.submission && (
                    <div className="mt-2 p-2 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">
                        {typeof milestone.submission === 'string'
                          ? milestone.submission
                          : milestone.submission.text || 'Submission details not available'}
                      </p>
                      {milestone.submission.attachments && milestone.submission.attachments.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-500">Attachments:</p>
                          <ul className="mt-1 space-y-1">
                            {milestone.submission.attachments.map((attachment, index) => (
                              <li key={index} className="text-xs text-blue-600 hover:text-blue-800">
                                <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                  {attachment.name || `Attachment ${index + 1}`}
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
          </div>
        )}

        {selectedMilestone && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full">
              <h3 className="text-lg font-medium text-gray-900">
                Submit Milestone: {selectedMilestone.title}
              </h3>
              <div className="mt-4">
                <textarea
                  rows={4}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Enter your submission details..."
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                />
              </div>
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedMilestone(null)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitMilestone}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetails; 