import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import MilestoneManagement from './MilestoneManagement';
import ProjectApplication from './ProjectApplication';
import { toast } from 'react-hot-toast';

const ProjectDetails = ({ project, onProjectUpdate }) => {
  const { user } = useAuth();

  const handleApplicationSubmit = (updatedProject) => {
    onProjectUpdate(updatedProject);
  };

  const handleMilestoneUpdate = (updatedMilestone) => {
    const updatedProject = {
      ...project,
      milestones: project.milestones.map(milestone =>
        milestone._id === updatedMilestone._id ? updatedMilestone : milestone
      )
    };
    onProjectUpdate(updatedProject);
  };

  const handleRejectProject = async () => {
    try {
      const reason = prompt('Please provide a reason for rejecting the project:');
      if (!reason) return;

      const response = await fetch(`/api/projects/${project._id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject project');
      }

      const updatedProject = await response.json();
      onProjectUpdate(updatedProject);
    } catch (error) {
      console.error('Error rejecting project:', error);
      alert('Failed to reject project');
    }
  };

  const handleRaiseDispute = async () => {
    try {
      const reason = prompt('Please provide a reason for the dispute:');
      if (!reason) return;

      const description = prompt('Please provide a detailed description of the dispute:');
      if (!description) return;

      const response = await fetch(`/api/projects/${project._id}/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason, description }),
      });

      if (!response.ok) {
        throw new Error('Failed to raise dispute');
      }

      const updatedProject = await response.json();
      onProjectUpdate(updatedProject);
    } catch (error) {
      console.error('Error raising dispute:', error);
      alert('Failed to raise dispute');
    }
  };

  const isEmployer = user?.role === 'employer' && project.employer?._id === user._id;
  const isFreelancer = user?.role === 'freelancer' && project.freelancer?._id === user._id;
  const isAdmin = user?.role === 'admin';

  // Add detailed debug logging
  console.log('Debug ProjectDetails:', {
    user: {
      id: user?._id,
      role: user?.role,
      name: user?.name
    },
    project: {
      id: project._id,
      status: project.status,
      employer: project.employer,
      freelancer: project.freelancer
    },
    isEmployer,
    employerId: project.employer?._id,
    userId: user?._id,
    employerMatch: user?._id === project.employer?._id,
    statusMatch: ['active', 'in_progress'].includes(project.status)
  });

  // Add a check for employer data
  if (!project.employer || !project.employer._id) {
    console.error('Project employer data is not properly populated:', project.employer);
  }

  return (
    <div className="space-y-8">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{project.title}</h1>
            <p className="text-gray-600 mt-2">{project.description}</p>
            <div className="mt-4 flex flex-wrap gap-4">
              <div className="bg-gray-100 px-3 py-1 rounded">
                <span className="font-medium">Budget:</span> ${project.budget}
              </div>
              <div className="bg-gray-100 px-3 py-1 rounded">
                <span className="font-medium">Category:</span> {project.category}
              </div>
              <div className="bg-gray-100 px-3 py-1 rounded">
                <span className="font-medium">Status:</span>{" "}
                <span className={`font-semibold ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
              </div>
              <div className="bg-gray-100 px-3 py-1 rounded">
                <span className="font-medium">Deadline:</span>{" "}
                {new Date(project.deadline).toLocaleDateString()}
              </div>
            </div>
            <div className="mt-4">
              <h3 className="font-semibold">Required Skills:</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {project.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {project.status === 'open' && !isEmployer && (
        <ProjectApplication
          project={project}
          onApplicationSubmit={handleApplicationSubmit}
        />
      )}

      {(isEmployer || isFreelancer) && project.status === 'active' && (
        <MilestoneManagement
          project={project}
          onMilestoneUpdate={handleMilestoneUpdate}
        />
      )}

      {isEmployer && ['active', 'in_progress'].includes(project.status) && (
        <div className="bg-white shadow rounded-lg p-6 mt-4">
          <h2 className="text-2xl font-bold mb-4">Project Actions</h2>
          <div className="space-y-4">
            <button
              onClick={() => handleRejectProject()}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Reject Project
            </button>
          </div>
        </div>
      )}

      {(isEmployer || isFreelancer) && ['active', 'rejected'].includes(project.status) && (
        <div className="bg-white shadow rounded-lg p-6 mt-4">
          <h2 className="text-2xl font-bold mb-4">Dispute Actions</h2>
          <div className="space-y-4">
            <button
              onClick={() => handleRaiseDispute()}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            >
              Raise Dispute
            </button>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Admin Actions</h2>
          <div className="space-y-4">
            {project.status === 'active' && (
              <button
                onClick={() => handleAdminAction('complete')}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Mark as Completed
              </button>
            )}
            {project.status === 'active' && (
              <button
                onClick={() => handleAdminAction('dispute')}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 ml-4"
              >
                Mark as Disputed
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case 'open':
      return 'text-blue-600';
    case 'active':
      return 'text-green-600';
    case 'completed':
      return 'text-purple-600';
    case 'disputed':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

export default ProjectDetails; 