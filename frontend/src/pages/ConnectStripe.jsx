import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import  paymentService  from '../services/paymentService';
import { toast } from 'react-hot-toast';

const ConnectStripe = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const handleConnectStripe = async () => {
        try {
            setIsLoading(true);
            const { url } = await paymentService.createStripeConnectAccount();
            window.location.href = url;
        } catch (error) {
            toast.error(error.message || 'Failed to connect Stripe account');
        } finally {
            setIsLoading(false);
        }
    };

    if (!user || user.role !== 'freelancer') {
        return (
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
                    <p className="mt-2 text-gray-600">
                        Only freelancers can connect their Stripe accounts.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="bg-white shadow rounded-lg p-6">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Connect Your Stripe Account
                    </h2>
                    <p className="mt-2 text-gray-600">
                        Connect your Stripe account to receive payments for completed projects.
                    </p>
                    <div className="mt-6">
                        <button
                            onClick={handleConnectStripe}
                            disabled={isLoading}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <svg
                                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    Connecting...
                                </>
                            ) : (
                                'Connect with Stripe'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConnectStripe; 