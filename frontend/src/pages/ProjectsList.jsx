import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import paymentService from '../services/paymentService';
import { toast } from 'react-hot-toast';

const ProjectsList = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    minBudget: '',
    maxBudget: ''
  });
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    fetchProjects();
  }, [filters, sortBy]);

  const fetchProjects = async () => {
    try {
      const data = await paymentService.getProjects(filters, sortBy);
      setProjects(data || []);
    } catch (error) {
      setError(error.message || 'Failed to fetch projects');
      toast.error(error.message || 'Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
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

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        {user?.role === 'employer' && (
          <Link
            to="/create-project"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create project
          </Link>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="minBudget"
              className="block text-sm font-medium text-gray-700"
            >
              Min budget ($)
            </label>
            <input
              type="number"
              id="minBudget"
              name="minBudget"
              value={filters.minBudget}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label
              htmlFor="maxBudget"
              className="block text-sm font-medium text-gray-700"
            >
              Max budget ($)
            </label>
            <input
              type="number"
              id="maxBudget"
              name="maxBudget"
              value={filters.maxBudget}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label
              htmlFor="sortBy"
              className="block text-sm font-medium text-gray-700"
            >
              Sort by
            </label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={handleSortChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="budget_high">Highest budget</option>
              <option value="budget_low">Lowest budget</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Link
            key={project._id}
            to={`/projects/${project._id}`}
            className="block bg-white shadow rounded-lg hover:shadow-md transition-shadow duration-200"
          >
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium text-gray-900">
                  {project.title}
                </h3>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${project.status === 'open'
                    ? 'bg-green-100 text-green-800'
                    : project.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800'
                      : project.status === 'completed'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                >
                  {project.status?.replace('_', ' ')}
                </span>
              </div>

              <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                {project.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {(project.requiredSkills || []).map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <div>
                  <span className="font-medium">${project.budget}</span>
                  <span className="mx-2">•</span>
                  <span>
                    Due{' '}
                    {new Date(project.deadline).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  {project.assignedTo ? (
                    <span>Assigned to {project.assignedTo.name}</span>
                  ) : (
                    <span>No freelancer assigned</span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No projects found. Try adjusting your filters.</p>
        </div>
      )}
    </div>
  );
};

export default ProjectsList; 