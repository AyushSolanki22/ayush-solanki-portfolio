import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT || 3000);
const production = process.env.NODE_ENV === 'production';
const rootDir = path.dirname(fileURLToPath(import.meta.url));

for (const key of ['MONGODB_URI', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'JWT_SECRET']) {
  if (!process.env[key]) throw new Error(`Missing ${key} in .env`);
}

if (process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters.');
}

app.disable('x-powered-by');
app.use(express.json({ limit: '30kb' }));
app.use(helmet());

const messageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    read: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    summary: { type: String, required: true, trim: true, maxlength: 280 },
    description: { type: String, default: '', trim: true, maxlength: 3000 },
    stack: [{ type: String, trim: true, maxlength: 40 }],
    githubUrl: { type: String, default: '', trim: true },
    liveUrl: { type: String, default: '', trim: true },
    featured: { type: Boolean, default: false },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  },
  { timestamps: true },
);

const certificateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    issuer: { type: String, required: true, trim: true, maxlength: 120 },
    year: { type: String, required: true, trim: true, maxlength: 40 },
    imageUrl: { type: String, required: true, trim: true, maxlength: 500 },
    credentialUrl: { type: String, default: '', trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    order: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

const portfolioContentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'main' },
    heroLine: { type: String, default: '', trim: true, maxlength: 160 },
    about: { type: String, default: '', trim: true, maxlength: 2000 },
    availability: { type: String, default: '', trim: true, maxlength: 120 },
    photoUrl: { type: String, default: '', trim: true, maxlength: 500 },
    resumeUrl: { type: String, default: '', trim: true, maxlength: 500 },
    github: { type: String, default: '', trim: true, maxlength: 500 },
    linkedin: { type: String, default: '', trim: true, maxlength: 500 },
    skills: [{ type: String, trim: true, maxlength: 100 }],
    education: [{ type: String, trim: true, maxlength: 300 }],
    experience: [{ type: String, trim: true, maxlength: 300 }],
  },
  { timestamps: true },
);



const Message = mongoose.model('Message', messageSchema);
const Project = mongoose.model('Project', projectSchema);
const Certificate = mongoose.model('Certificate', certificateSchema);
const PortfolioContent = mongoose.model(
  'PortfolioContent',
  portfolioContentSchema,
);


const adminPasswordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
const cookieOptions = {
  httpOnly: true,
  secure: production,
  sameSite: 'strict',
  path: '/api/admin',
};

app.use((req, _res, next) => {
  const token = (req.headers.cookie || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('adminToken='))
    ?.slice('adminToken='.length);

  req.adminToken = token ? decodeURIComponent(token) : null;
  next();
});

function requireAdmin(req, res, next) {
  try {
    if (!req.adminToken) throw new Error('Missing token');
    req.admin = jwt.verify(req.adminToken, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Please sign in again.' });
  }
}

const contactLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5 });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 });

app.post('/api/contact', contactLimiter, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body ?? {};
    if (![name, email, subject, message].every(
      (value) => typeof value === 'string' && value.trim(),
    )) {
      return res.status(400).json({ error: 'Please complete every field.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email.' });
    }

    await Message.create({ name, email, subject, message });
    res.status(201).json({ message: 'Message received.' });
  } catch (error) {
    console.error('Saving contact message failed:', error.message);
    res.status(500).json({ error: 'Could not save the message. Please try again.' });
  }
});

app.post('/api/admin/login', loginLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  const emailMatches = email === process.env.ADMIN_EMAIL.trim().toLowerCase();
  const passwordMatches = await bcrypt.compare(password, adminPasswordHash);

  if (!emailMatches || !passwordMatches) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const token = jwt.sign(
    { sub: email, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  );

  res.cookie('adminToken', token, { ...cookieOptions, maxAge: 8 * 60 * 60 * 1000 });
  res.json({ message: 'Signed in.' });
});

app.get('/api/admin/me', requireAdmin, (_req, res) => {
  res.json({ email: process.env.ADMIN_EMAIL });
});

app.post('/api/admin/logout', requireAdmin, (_req, res) => {
  res.clearCookie('adminToken', cookieOptions);
  res.json({ message: 'Signed out.' });
});

app.get('/api/admin/overview', requireAdmin, async (_req, res) => {
  const [messages, unread, projects, published, certificates, publishedCertificates] = await Promise.all([
    Message.countDocuments({ archived: false }),
    Message.countDocuments({ archived: false, read: false }),
    Project.countDocuments(),
    Project.countDocuments({ status: 'published' }),
    Certificate.countDocuments(),
    Certificate.countDocuments({ status: 'published' }),
  ]);

  res.json({ messages, unread, projects, published, certificates, publishedCertificates });
});

app.get('/api/admin/messages', requireAdmin, async (req, res) => {
  const filter = req.query.archived === 'true'
    ? { archived: true }
    : { archived: false };

  if (req.query.unread === 'true') filter.read = false;

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  res.json({ messages });
});

app.patch('/api/admin/messages/:id', requireAdmin, async (req, res) => {
  const updates = {};

  if (typeof req.body?.read === 'boolean') updates.read = req.body.read;
  if (typeof req.body?.archived === 'boolean') updates.archived = req.body.archived;

  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'No valid changes provided.' });
  }

  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid message ID.' });
  }

  const message = await Message.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true },
  ).lean();

  if (!message) return res.status(404).json({ error: 'Message not found.' });
  res.json({ message });
});

app.get('/api/admin/projects', requireAdmin, async (_req, res) => {
  const projects = await Project.find().sort({ updatedAt: -1 }).lean();
  res.json({ projects });
});


function validCertificateUrl(value, optional = false) {
  if (optional && value === '') return true;
  if (typeof value !== 'string' || !value.trim()) return false;

  const url = value.trim();

  // Permit same-site paths and HTTPS URLs only.
  if (url.startsWith('/') && !url.startsWith('//')) return true;

  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

function readCertificate(body = {}) {
  const data = {
    title: String(body.title || '').trim(),
    issuer: String(body.issuer || '').trim(),
    year: String(body.year || '').trim(),
    imageUrl: String(body.imageUrl || '').trim(),
    credentialUrl: String(body.credentialUrl || '').trim(),
    status: body.status === 'published' ? 'published' : 'draft',
    order: Number(body.order ?? 0),
  };

  if (!data.title || !data.issuer || !data.year || !data.imageUrl) {
    return { error: 'Title, issuer, year, and certificate image URL are required.' };
  }

  if (data.title.length > 120 || data.issuer.length > 120 ||
      data.year.length > 40 || data.imageUrl.length > 500 ||
      data.credentialUrl.length > 500) {
    return { error: 'One or more fields are too long.' };
  }

  if (!Number.isInteger(data.order) || data.order < 0) {
    return { error: 'Display order must be a non-negative whole number.' };
  }

  if (!validCertificateUrl(data.imageUrl) ||
      !validCertificateUrl(data.credentialUrl, true)) {
    return { error: 'Use a site path or an HTTPS URL for certificate links.' };
  }

  return { data };
}

app.get('/api/admin/certificates', requireAdmin, async (_req, res) => {
  const certificates = await Certificate.find()
    .sort({ order: 1, createdAt: -1 })
    .lean();

  res.json({ certificates });
});

app.post('/api/admin/certificates', requireAdmin, async (req, res) => {
  const result = readCertificate(req.body);
  if (result.error) return res.status(400).json({ error: result.error });

  const certificate = await Certificate.create(result.data);
  res.status(201).json({ certificate });
});

app.put('/api/admin/certificates/:id', requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid certificate ID.' });
  }

  const result = readCertificate(req.body);
  if (result.error) return res.status(400).json({ error: result.error });

  const certificate = await Certificate.findByIdAndUpdate(
    req.params.id,
    { $set: result.data },
    { new: true, runValidators: true },
  ).lean();

  if (!certificate) {
    return res.status(404).json({ error: 'Certificate not found.' });
  }

  res.json({ certificate });
});

app.delete('/api/admin/certificates/:id', requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid certificate ID.' });
  }

  const certificate = await Certificate.findByIdAndDelete(req.params.id);
  if (!certificate) {
    return res.status(404).json({ error: 'Certificate not found.' });
  }

  res.json({ message: 'Certificate deleted.' });
});

app.get('/api/portfolio/certificates', async (_req, res) => {
  const certificates = await Certificate.find({ status: 'published' })
    .sort({ order: 1, createdAt: -1 })
    .lean();

  res.json({ certificates });
});


app.post('/api/admin/projects', requireAdmin, async (req, res) => {
  const project = await Project.create(req.body);
  res.status(201).json({ project });
});

app.put('/api/admin/projects/:id', requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid project ID.' });
  }

  const project = await Project.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true },
  );

  if (!project) return res.status(404).json({ error: 'Project not found.' });
  res.json({ project });
});

app.delete('/api/admin/projects/:id', requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid project ID.' });
  }

  const project = await Project.findByIdAndDelete(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  res.json({ message: 'Project deleted.' });
});

// Public endpoint: only published projects are returned.
app.get('/api/portfolio/projects', async (_req, res) => {
  const projects = await Project.find({ status: 'published' })
    .sort({ featured: -1, updatedAt: -1 })
    .lean();

  res.json({ projects });
});

app.get('/api/admin/content', requireAdmin, async (_req, res) => {
  const content = await PortfolioContent.findOneAndUpdate(
    { key: 'main' },
    { $setOnInsert: { key: 'main' } },
    { new: true, upsert: true },
  ).lean();

  res.json({ content });
});

app.put('/api/admin/content', requireAdmin, async (req, res) => {
  const allowed = [
    'heroLine', 'about', 'availability', 'photoUrl', 'resumeUrl',
    'github', 'linkedin', 'skills', 'education', 'experience',
  ];

  const updates = Object.fromEntries(
    Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)),
  );

  const content = await PortfolioContent.findOneAndUpdate(
    { key: 'main' },
    { $set: updates, $setOnInsert: { key: 'main' } },
    { new: true, upsert: true, runValidators: true },
  ).lean();

  res.json({ content });
});

app.get('/api/portfolio/content', async (_req, res) => {
  const content = await PortfolioContent.findOne({ key: 'main' }).lean();
  res.json({ content });
});


if (production) {
  app.use(express.static(path.join(rootDir, 'dist')));
}

async function start() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  app.listen(port, () => {
    console.log(`Portfolio server running on port ${port}`);
  });
}

start().catch((error) => {
  console.error('Server startup failed:', error.message);
  process.exit(1);
});