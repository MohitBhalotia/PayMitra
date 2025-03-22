import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProjectList = ({ projects: initialProjects }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState(initialProjects);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    minBudget: '',
    maxBudget: '',
    skills: []
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let filteredProjects = [...initialProjects];

    // Apply category filter
    if (filters.category) {
      filteredProjects = filteredProjects.filter(
        project => project.category === filters.category
      );
    }

    // Apply status filter
    if (filters.status) {
      filteredProjects = filteredProjects.filter(
        project => project.status === filters.status
      );
    }

    // Apply budget filters
    if (filters.minBudget) {
      filteredProjects = filteredProjects.filter(
        project => project.budget >= Number(filters.minBudget)
      );
    }
    if (filters.maxBudget) {
      filteredProjects = filteredProjects.filter(
        project => project.budget <= Number(filters.maxBudget)
      );
    }

    // Apply skills filter
    if (filters.skills.length > 0) {
      filteredProjects = filteredProjects.filter(project =>
        filters.skills.every(skill => project.skills.includes(skill))
      );
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredProjects = filteredProjects.filter(
        project =>
          project.title.toLowerCase().includes(query) ||
          project.description.toLowerCase().includes(query)
      );
    }

    setProjects(filteredProjects);
  }, [initialProjects, filters, searchQuery]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSkillsChange = (e) => {
    const skills = e.target.value.split(',').map(skill => skill.trim());
    setFilters(prev => ({
      ...prev,
      skills
    }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="web">Web Development</option>
              <option value="mobile">Mobile Development</option>
              <option value="design">Design</option>
              <option value="marketing">Marketing</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="disputed">Disputed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Budget Range</label>
            <div className="flex gap-2">
              <input
                type="number"
                name="minBudget"
                value={filters.minBudget}
                onChange={handleFilterChange}
                placeholder="Min"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <input
                type="number"
                name="maxBudget"
                value={filters.maxBudget}
                onChange={handleFilterChange}
                placeholder="Max"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Skills</label>
            <input
              type="text"
              value={filters.skills.join(', ')}
              onChange={handleSkillsChange}
              placeholder="e.g., React, Node.js, MongoDB"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Link
            key={project._id}
            to={`/projects/${project._id}`}
            className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-xl font-semibold mb-2">{project.title}</h3>
            <p className="text-gray-600 mb-4 line-clamp-2">{project.description}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {project.skills.slice(0, 3).map((skill, index) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm"
                >
                  {skill}
                </span>
              ))}
              {project.skills.length > 3 && (
                <span className="text-gray-500 text-sm">
                  +{project.skills.length - 3} more
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">${project.budget}</span>
              <span className={`px-2 py-1 rounded text-sm ${getStatusColor(project.status)}`}>
                {project.status}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No projects found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case 'open':
      return 'bg-blue-100 text-blue-800';
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'completed':
      return 'bg-purple-100 text-purple-800';
    case 'disputed':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default ProjectList; 