import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import paymentService from '../services/paymentService';
import { toast } from 'react-hot-toast';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with error handling
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHER_KEY)
  .then(stripe => {
    if (!stripe) {
      throw new Error('Failed to initialize Stripe');
    }
    return stripe;
  })
  .catch(error => {
    console.error('Stripe initialization error:', error);
    return null;
  });

const PaymentForm = ({ clientSecret, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!stripe || !elements) {
      return;
    }
    // Log when Stripe is ready
    console.log('Stripe Elements ready');
  }, [stripe, elements]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    if (!stripe || !elements) {
      setError('Stripe is not initialized');
      setIsProcessing(false);
      return;
    }

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      if (stripeError) {
        setError(stripeError.message);
        toast.error(stripeError.message);
      } else if (paymentIntent.status === 'succeeded') {
        toast.success('Payment successful!');
        onSuccess();
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError('Payment failed. Please try again.');
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>
      {error && (
        <div className="text-red-500 text-sm text-center">{error}</div>
      )}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isProcessing ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
};

const CreateProject = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    category: '',
    requiredSkills: '',
    deadline: '',
    milestones: [{ title: '', description: '', amount: '', dueDate: '' }]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMilestoneChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      milestones: prev.milestones.map((milestone, i) =>
        i === index ? { ...milestone, [field]: value } : milestone
      )
    }));
  };

  const addMilestone = () => {
    setFormData((prev) => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        {
          title: '',
          description: '',
          amount: '',
          dueDate: ''
        }
      ]
    }));
  };

  const removeMilestone = (index) => {
    setFormData((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    if (!formData.title || !formData.description || !formData.budget || !formData.deadline || !formData.category) {
      setError('Please fill in all required fields');
      return false;
    }

    if (formData.milestones.length === 0) {
      setError('Please add at least one milestone');
      return false;
    }

    const totalMilestoneAmount = formData.milestones.reduce(
      (sum, milestone) => sum + Number(milestone.amount || 0),
      0
    );

    if (totalMilestoneAmount !== Number(formData.budget)) {
      setError('Total milestone amounts must equal the project budget');
      return false;
    }

    for (const milestone of formData.milestones) {
      if (!milestone.title || !milestone.description || !milestone.amount || !milestone.dueDate) {
        setError('Please fill in all milestone fields');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      // Format the data before sending
      const formattedData = {
        ...formData,
        requiredSkills: formData.requiredSkills.split(',').map(skill => skill.trim()),
        budget: Number(formData.budget),
        deadline: new Date(formData.deadline).toISOString(),
        milestones: formData.milestones.map(milestone => ({
          ...milestone,
          amount: Number(milestone.amount),
          dueDate: new Date(milestone.dueDate).toISOString()
        }))
      };

      // Log the formatted data being sent
      console.log('Submitting project data:', formattedData);

      const response = await paymentService.createProjectEscrow(formattedData);

      // Log the response
      console.log('Project creation response:', response);

      if (response.clientSecret) {
        setClientSecret(response.clientSecret);
        setShowPaymentForm(true);
      } else {
        toast.error('Failed to initialize payment');
      }
    } catch (error) {
      console.error('Project creation error:', error);
      setError(error.response?.data?.message || 'Failed to create project');
      toast.error(error.response?.data?.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = () => {
    toast.success('Project created and payment successful!');
    navigate('/projects');
  };

  if (!user) {
    return <div>Please log in to create a project</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create New Project</h1>

      {!showPaymentForm ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700"
            >
              Project title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700"
            >
              Project Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            >
              <option value="">Select a category</option>
              <option value="Web Development">Web Development</option>
              <option value="Mobile Development">Mobile Development</option>
              <option value="UI/UX Design">UI/UX Design</option>
              <option value="Graphic Design">Graphic Design</option>
              <option value="Content Writing">Content Writing</option>
              <option value="Digital Marketing">Digital Marketing</option>
              <option value="Video Production">Video Production</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
            >
              Project description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="budget"
                className="block text-sm font-medium text-gray-700"
              >
                Total budget ($)
              </label>
              <input
                type="number"
                id="budget"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label
                htmlFor="deadline"
                className="block text-sm font-medium text-gray-700"
              >
                Project deadline
              </label>
              <input
                type="date"
                id="deadline"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="requiredSkills"
              className="block text-sm font-medium text-gray-700"
            >
              Required skills (comma-separated)
            </label>
            <input
              type="text"
              id="requiredSkills"
              name="requiredSkills"
              value={formData.requiredSkills}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., JavaScript, React, Node.js"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Milestones</h3>
              <button
                type="button"
                onClick={addMilestone}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add milestone
              </button>
            </div>

            {formData.milestones.map((milestone, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 mb-4 bg-gray-50"
              >
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium text-gray-900">
                    Milestone {index + 1}
                  </h4>
                  {formData.milestones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMilestone(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`milestone-title-${index}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      Title
                    </label>
                    <input
                      type="text"
                      id={`milestone-title-${index}`}
                      value={milestone.title}
                      onChange={(e) =>
                        handleMilestoneChange(index, 'title', e.target.value)
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`milestone-amount-${index}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      Amount ($)
                    </label>
                    <input
                      type="number"
                      id={`milestone-amount-${index}`}
                      value={milestone.amount}
                      onChange={(e) =>
                        handleMilestoneChange(index, 'amount', e.target.value)
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor={`milestone-description-${index}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      Description
                    </label>
                    <textarea
                      id={`milestone-description-${index}`}
                      value={milestone.description}
                      onChange={(e) =>
                        handleMilestoneChange(index, 'description', e.target.value)
                      }
                      rows={2}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`milestone-due-date-${index}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      Due date
                    </label>
                    <input
                      type="date"
                      id={`milestone-due-date-${index}`}
                      value={milestone.dueDate}
                      onChange={(e) =>
                        handleMilestoneChange(index, 'dueDate', e.target.value)
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating Project...' : 'Create Project'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Complete Payment</h2>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm
              clientSecret={clientSecret}
              onSuccess={handlePaymentSuccess}
            />
          </Elements>
        </div>
      )}
    </div>
  );
};

export default CreateProject; 