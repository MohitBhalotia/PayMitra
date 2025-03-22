import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const ProjectApplication = ({ project, onApplicationSubmit }) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    proposal: '',
    estimatedTime: '',
    relevantExperience: '',
    portfolio: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${project._id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit application');
      }

      toast.success('Application submitted successfully!');
      onApplicationSubmit(data.project);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || user.role !== 'freelancer') {
    return null;
  }

  return (
    <div className="border rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Apply for this Project</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Proposal</label>
          <textarea
            name="proposal"
            value={formData.proposal}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            rows="4"
            required
            placeholder="Explain why you're the best fit for this project..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Estimated Time</label>
          <input
            type="text"
            name="estimatedTime"
            value={formData.estimatedTime}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
            placeholder="e.g., 2 weeks, 1 month"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Relevant Experience</label>
          <textarea
            name="relevantExperience"
            value={formData.relevantExperience}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            rows="3"
            required
            placeholder="Describe your relevant experience..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Portfolio Link</label>
          <input
            type="url"
            name="portfolio"
            value={formData.portfolio}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="https://your-portfolio.com"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>
    </div>
  );
};

export default ProjectApplication; 