import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import paymentService  from '../services/paymentService';
import { toast } from 'react-hot-toast';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [escrow, setEscrow] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [submissionText, setSubmissionText] = useState('');

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      const [projectData, escrowData] = await Promise.all([
        paymentService.getProjectDetails(id),
        paymentService.getEscrowDetails(id)
      ]);
      setProject(projectData);
      setEscrow(escrowData);
    } catch (error) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    try {
      await paymentService.applyForProject(id);
      toast.success('Applied for project successfully');
      fetchProjectDetails();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSubmitMilestone = async () => {
    try {
      await paymentService.submitMilestone(id, selectedMilestone.id, submissionText);
      toast.success('Milestone submitted successfully');
      setSelectedMilestone(null);
      setSubmissionText('');
      fetchProjectDetails();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleApproveMilestone = async (milestoneId) => {
    try {
      await paymentService.approveMilestone(id, milestoneId);
      toast.success('Milestone approved successfully');
      fetchProjectDetails();
    } catch (error) {
      toast.error(error.message);
    }
  };

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

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Posted by {project.employer.name} on{' '}
            {new Date(project.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Budget</h3>
              <p className="mt-1 text-sm text-gray-500">${project.budget}</p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Deadline</h3>
              <p className="mt-1 text-sm text-gray-500">
                {new Date(project.deadline).toLocaleDateString()}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Status</h3>
              <p className="mt-1 text-sm text-gray-500 capitalize">{project.status}</p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Assigned to</h3>
              <p className="mt-1 text-sm text-gray-500">
                {project.assignedTo ? project.assignedTo.name : 'Not assigned'}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium text-gray-900">Description</h3>
          <p className="mt-1 text-sm text-gray-500">{project.description}</p>
        </div>

        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium text-gray-900">Required Skills</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {project.requiredSkills.map((skill, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium text-gray-900">Milestones</h3>
          <div className="mt-4 space-y-4">
            {project.milestones.map((milestone) => (
              <div
                key={milestone.id}
                className="border rounded-lg p-4 bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {milestone.title}
                    </h4>
                    <p className="mt-1 text-sm text-gray-500">
                      {milestone.description}
                    </p>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <span>Amount: ${milestone.amount}</span>
                      <span className="mx-2">•</span>
                      <span>
                        Due: {new Date(milestone.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      milestone.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : milestone.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {milestone.status}
                  </span>
                </div>

                {milestone.status === 'pending' && (
                  <div className="mt-4">
                    {user?.role === 'freelancer' &&
                      project.assignedTo?._id === user._id && (
                        <button
                          onClick={() => setSelectedMilestone(milestone)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Submit milestone
                        </button>
                      )}
                    {user?.role === 'employer' &&
                      project.employer._id === user._id &&
                      milestone.submission && (
                        <div>
                          <p className="text-sm text-gray-500">
                            Submission: {milestone.submission}
                          </p>
                          <button
                            onClick={() => handleApproveMilestone(milestone.id)}
                            className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            Approve milestone
                          </button>
                        </div>
                      )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {user?.role === 'freelancer' &&
          !project.assignedTo &&
          project.status === 'open' && (
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <button
                onClick={handleApply}
                className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Apply for project
              </button>
            </div>
          )}
      </div>

      {/* Milestone submission modal */}
      {selectedMilestone && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Submit milestone
            </h3>
            <textarea
              value={submissionText}
              onChange={(e) => setSubmissionText(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Describe your milestone submission..."
            />
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setSelectedMilestone(null);
                  setSubmissionText('');
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitMilestone}
                disabled={!submissionText.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails; 