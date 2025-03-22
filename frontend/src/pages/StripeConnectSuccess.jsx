import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import paymentService from '../services/paymentService';
import { toast } from 'react-hot-toast';

const StripeConnectSuccess = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        const checkStripeStatus = async () => {
            try {
                const status = await paymentService.getStripeConnectStatus();
                if (status.connected) {
                    toast.success('Stripe account connected successfully!');
                    navigate('/profile');
                } else {
                    toast.error('Failed to connect Stripe account. Please try again.');
                    navigate('/connect-stripe');
                }
            } catch (error) {
                console.error('Error checking Stripe status:', error);
                toast.error('Failed to verify Stripe connection. Please try again.');
                navigate('/connect-stripe');
            }
        };

        checkStripeStatus();
    }, [navigate]);

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="bg-white shadow rounded-lg p-6">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Connecting your Stripe account...
                    </h2>
                    <p className="mt-2 text-gray-600">
                        Please wait while we verify your Stripe connection.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default StripeConnectSuccess; 