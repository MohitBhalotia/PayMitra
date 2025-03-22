const request = require('supertest');
const mongoose = require('mongoose');
process.env.NODE_ENV = 'test';
const app = require('../server');
const User = require('../src/models/User');
const Project = require('../src/models/Project');
const Escrow = require('../src/models/Escrow');
const jwt = require('jsonwebtoken');

let testUser;
let testFreelancer;
let testProject;
let testToken;
let testFreelancerToken;

beforeAll(async () => {
  // Create test users
  testUser = await User.create({
    name: 'Test Employer',
    email: 'test@employer.com',
    password: 'password123',
    role: 'employer'
  });

  testFreelancer = await User.create({
    name: 'Test Freelancer',
    email: 'test@freelancer.com',
    password: 'password123',
    role: 'freelancer'
  });

  // Create test project
  testProject = await Project.create({
    title: 'Test Project',
    description: 'Test Description',
    budget: 1000,
    category: 'Web Development',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    requiredSkills: ['JavaScript', 'Node.js'],
    milestones: [
      {
        title: 'Milestone 1',
        description: 'First milestone',
        amount: 500,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      }
    ],
    employer: testUser._id
  });

  // Create test escrow
  await Escrow.create({
    project: testProject._id,
    amount: 1000,
    employer: testUser._id,
    paymentIntentId: 'test_payment_intent',
    milestones: [
      {
        milestoneId: testProject.milestones[0]._id,
        amount: 500,
        status: 'pending'
      }
    ]
  });

  // Generate test tokens
  testToken = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET);
  testFreelancerToken = jwt.sign({ id: testFreelancer._id }, process.env.JWT_SECRET);
});

afterAll(async () => {
  // Clean up test data
  await User.deleteMany({ email: { $in: ['test@employer.com', 'test@freelancer.com'] } });
  await Project.deleteMany({ title: 'Test Project' });
  await Escrow.deleteMany({ project: testProject._id });
});

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'new@user.com',
          password: 'password123',
          role: 'freelancer'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('name');
      expect(res.body.user).toHaveProperty('email');
      expect(res.body.user).toHaveProperty('role');
    });

    it('should not register with existing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@employer.com',
          password: 'password123',
          role: 'freelancer'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message', 'User already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@employer.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
    });

    it('should not login with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@employer.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message', 'Invalid credentials');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get current user profile', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('email');
      expect(res.body).toHaveProperty('role');
    });

    it('should not get profile without token', async () => {
      const res = await request(app)
        .get('/api/auth/profile');

      expect(res.status).toBe(401);
    });
  });
});

describe('Project Routes', () => {
  describe('GET /api/projects', () => {
    it('should get all projects', async () => {
      const res = await request(app)
        .get('/api/projects');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBeTruthy();
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'New Project',
          description: 'New Description',
          budget: 2000,
          category: 'Mobile Development',
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          requiredSkills: ['React', 'Node.js'],
          milestones: [
            {
              title: 'Milestone 1',
              description: 'First milestone',
              amount: 1000,
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('title');
      expect(res.body).toHaveProperty('employer');
    });
  });

  describe('POST /api/projects/:id/apply', () => {
    it('should apply to a project', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject._id}/apply`)
        .set('Authorization', `Bearer ${testFreelancerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('freelancer');
      expect(res.body.freelancer.toString()).toBe(testFreelancer._id.toString());
    });
  });
});

describe('Stripe Routes', () => {
  describe('POST /api/stripe/connect', () => {
    it('should create Stripe Connect account for freelancer', async () => {
      const res = await request(app)
        .post('/api/stripe/connect')
        .set('Authorization', `Bearer ${testFreelancerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('url');
    });

    it('should not create Stripe account for employer', async () => {
      const res = await request(app)
        .post('/api/stripe/connect')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('message', 'Only freelancers can connect Stripe accounts');
    });
  });

  describe('GET /api/stripe/connect/status', () => {
    it('should get Stripe Connect status', async () => {
      const res = await request(app)
        .get('/api/stripe/connect/status')
        .set('Authorization', `Bearer ${testFreelancerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('connected');
    });
  });
});

describe('Admin Routes', () => {
  let adminToken;
  let adminUser;
  
  beforeAll(async () => {
    // Delete any existing admin user first
    await User.deleteOne({ email: 'test@admin.com' });
    
    adminUser = await User.create({
      name: 'Test Admin',
      email: 'test@admin.com',
      password: 'password123',
      role: 'admin'
    });
    adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET);
  });

  afterAll(async () => {
    await User.deleteOne({ email: 'test@admin.com' });
  });

  describe('GET /api/admin/projects', () => {
    it('should get all projects for admin', async () => {
      const res = await request(app)
        .get('/api/admin/projects')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBeTruthy();
    });

    it('should not allow non-admin access', async () => {
      const res = await request(app)
        .get('/api/admin/projects')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/admin/statistics', () => {
    it('should get payment statistics for admin', async () => {
      const res = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalProjects');
      expect(res.body).toHaveProperty('totalFreelancers');
      expect(res.body).toHaveProperty('totalEmployers');
      expect(res.body).toHaveProperty('totalEscrowAmount');
    });
  });
}); 