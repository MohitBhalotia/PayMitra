# PayMitra - Freelancer Payment Platform

PayMitra is a web-based platform designed to improve transparency and fairness in freelancer payments. It implements a milestone-based payment system with work verification and dispute resolution features.

## Features

- **Milestone-Based Payments**: Break down projects into manageable milestones with secure payment handling
- **Work Verification**: Built-in verification system for completed work
- **Dispute Resolution**: Structured process for handling payment disputes
- **Secure Payments**: Integration with secure payment gateways
- **User Roles**: Separate interfaces for freelancers and employers
- **Project Management**: Comprehensive project tracking and management tools

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB
- JWT Authentication
- Stripe Payment Integration

### Frontend
- React.js
- Tailwind CSS
- Headless UI
- Axios

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Stripe Account (for payment processing)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Backend
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Frontend
REACT_APP_API_URL=http://localhost:5000/api
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/paymitra.git
cd paymitra
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

## Running the Application

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend development server:
```bash
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## API Documentation

The API documentation is available at `/api-docs` when running the backend server.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Tailwind CSS](https://tailwindcss.com/)
- [Headless UI](https://headlessui.dev/)
- [Stripe](https://stripe.com/)
