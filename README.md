# PayMitra - Secure Freelance Payment Platform

## 📹 Demo Video

Check out the full demo of PayMitra on [YouTube](https://youtu.be/K59FbtdxBmg).

[![Watch the demo video](https://img.youtube.com/vi/K59FbtdxBmg/0.jpg)](https://youtu.be/K59FbtdxBmg)

PayMitra is a full-stack web application that provides a secure and efficient platform for freelancers and employers to manage projects and payments. The platform includes features like milestone-based payments, escrow system, and dispute resolution.

## 🌟 Features

### For Freelancers
- Browse and apply for projects
- Submit milestone deliverables
- Track project progress and payments
- Raise disputes for rejected milestones
- Secure payment processing
- Profile management and portfolio showcase

### For Employers
- Post projects with detailed requirements
- Review freelancer applications
- Manage project milestones
- Approve/reject milestone submissions
- Raise disputes for quality issues
- Secure payment handling through escrow

### For Admins
- Project moderation and management
- Dispute resolution system
- User management
- Payment monitoring
- Platform analytics

## 🛠 Tech Stack

### Frontend
- React.js
- Tailwind CSS
- React Router
- Context API for state management
- React Hot Toast for notifications
- WebSockets for real-time communication
- Redux Toolkit for advanced state management
- Stripe Payment Integration
- Cloudinary for file uploads
- WebSockets for live notifications and chat
- Escrow system for secure payments

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- Stripe Payment Integration
- Cloudinary for file uploads
- WebSockets for live notifications and chat
- Escrow system for secure payments

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Stripe Account
- Cloudinary Account

### Installation

1. Clone the repository

```bash
git clone https://github.com/MohitBhalotia/PayMitra.git
cd PayMitra
```

2. Install dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up environment variables

```bash
# Backend (.env)
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Frontend (.env)
VITE_API_URL=http://localhost:5000
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
```

4. Start the development servers

```bash
# Start backend server
cd backend
npm run dev

# Start frontend server
cd frontend
npm start
```

## 💁‍ Project Structure

```
PayMitra/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   └── public/
└── backend/
    ├── src/
    │   ├── controllers/
    │   ├── models/
    │   ├── routes/
    │   ├── middleware/
    │   └── utils/
    └── config/
```

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting
- CORS protection
- Secure payment processing with Stripe
- File upload security with Cloudinary
- Two-Factor Authentication (2FA)
- WebSockets for secure, real-time communication

## 💰 Payment System

- Milestone-based payment structure
- Escrow system for secure fund holding
- Stripe integration for payment processing
- Automatic payment release upon milestone approval
- Refund handling for disputes

## ⚖ Dispute Resolution

- Automated dispute creation on milestone rejection
- Admin review system
- Resolution tracking
- Communication system between parties
- Multiple resolution options (refund, compromise, etc.)

## 📱 Responsive Design

- Mobile-first approach
- Responsive UI components
- Cross-browser compatibility
- Modern and intuitive interface

## 🚀 Future Enhancements

We are committed to continuous improvement and plan to introduce the following features:

- *Enhanced Automated Payment Release* – Further optimizing the escrow system for better automation and transparency.
- *Feedback & Rating System* – Allowing freelancers and employers to review each other post-project.
- *Advanced Real-Time Communication* – WebSocket-powered chat system for seamless discussions between freelancers and employers.
- *Payment Tracking & Analytics* – A dashboard to track earnings, expenses, and project financials.
- *Time Tracker for Hourly Projects* – Implementing an integrated tracking system for freelancers working on an hourly basis.
- *Improved Two-Factor Authentication (2FA)* – Strengthening security measures for user accounts.
- *AI-Powered Plagiarism Checker* – Ensuring originality and preventing duplicate content submission.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📚 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.



