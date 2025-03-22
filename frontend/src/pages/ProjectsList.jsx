import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import paymentService from "../services/paymentService";
import { toast } from "react-hot-toast";

const ProjectsList = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    minBudget: "",
    maxBudget: "",
  });
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    fetchProjects();
  }, [filters, sortBy]);

  const fetchProjects = async () => {
    try {
      const data = await paymentService.getProjects(filters, sortBy);
      setProjects(data || []);
      console.log(data);
    } catch (error) {
      setError(error.message || "Failed to fetch projects");
      toast.error(error.message || "Failed to fetch projects");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  const getApplicationStatus = (project) => {
    if (!user || !project || user.role !== 'freelancer') return null;

    // Check if user is assigned to this project
    if (project.freelancer && project.freelancer._id === user._id) {
      return 'assigned';
    }

    // Check for application status
    const application = project.applications?.find(
      app => app.freelancer && app.freelancer._id && app.freelancer._id === user._id
    );

    // Debug log to verify the comparison
    if (project.applications && project.applications.length > 0) {
      console.log('Application check:', {
        userId: user._id,
        applications: project.applications.map(app => ({
          freelancerId: app.freelancer?._id,
          status: app.status
        }))
      });
    }

    return application?.status || null;
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
        {user?.role === "employer" && (
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
              Min Budget
            </label>
            <input
              type="number"
              id="minBudget"
              name="minBudget"
              value={filters.minBudget}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Min budget"
            />
          </div>

          <div>
            <label
              htmlFor="maxBudget"
              className="block text-sm font-medium text-gray-700"
            >
              Max Budget
            </label>
            <input
              type="number"
              id="maxBudget"
              name="maxBudget"
              value={filters.maxBudget}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Max budget"
            />
          </div>

          <div>
            <label
              htmlFor="sortBy"
              className="block text-sm font-medium text-gray-700"
            >
              Sort By
            </label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={handleSortChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="budget_high">Highest Budget</option>
              <option value="budget_low">Lowest Budget</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <div key={project._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  <Link to={`/projects/${project._id}`} className="hover:text-blue-600">
                    {project.title}
                  </Link>
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Posted by {project.employer?.name || 'Unknown'} on{' '}
                  {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col items-end">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${project.status === 'open' ? 'bg-green-100 text-green-800' :
                  project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    project.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                  }`}>
                  {project.status?.replace('_', ' ')}
                </span>
                {user?.role === 'freelancer' && (
                  <span className="mt-1 text-xs text-gray-500">
                    {(() => {
                      const status = getApplicationStatus(project);
                      if (status === 'assigned') {
                        return <span className="text-green-600 font-medium">Assigned to you</span>;
                      } else if (status === 'pending') {
                        return <span className="text-yellow-600 font-medium">Application pending</span>;
                      } else if (status === 'approved') {
                        return <span className="text-green-600 font-medium">Application approved</span>;
                      } else if (status === 'rejected') {
                        return <span className="text-red-600 font-medium">Application rejected</span>;
                      }
                      return null;
                    })()}
                  </span>
                )}
              </div>
            </div>
            <p className="mt-2 text-gray-600 line-clamp-2">{project.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-900">${project.budget}</span>
                <span className="text-sm text-gray-500">
                  Due: {new Date(project.deadline).toLocaleDateString()}
                </span>
              </div>
              {user?.role === 'freelancer' && project.status === 'open' && !getApplicationStatus(project) && (
                <Link
                  to={`/projects/${project._id}`}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Apply Now
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            No projects found. Try adjusting your filters.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectsList;
