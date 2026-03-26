import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';

const TEMPLATES = [
  {
    id: 'python-basics',
    title: 'Python Programming Basics',
    description: 'Learn Python from scratch — variables, loops, functions, and more.',
    category: 'Programming',
    topics: 5,
    icon: '🐍',
    suggestedTopics: [
      { title: 'Introduction to Python', subtopics: ['What is Python', 'Setting Up Environment', 'Your First Program'] },
      { title: 'Variables and Data Types', subtopics: ['Numbers and Strings', 'Lists and Tuples', 'Dictionaries'] },
      { title: 'Control Flow', subtopics: ['If/Else Statements', 'For Loops', 'While Loops'] },
      { title: 'Functions', subtopics: ['Defining Functions', 'Parameters and Return Values', 'Lambda Functions'] },
      { title: 'File Handling & Modules', subtopics: ['Reading Files', 'Writing Files', 'Importing Modules'] },
    ],
  },
  {
    id: 'digital-marketing',
    title: 'Digital Marketing 101',
    description: 'Master SEO, social media, email marketing, and paid advertising.',
    category: 'Marketing',
    topics: 5,
    icon: '📈',
    suggestedTopics: [
      { title: 'Introduction to Digital Marketing', subtopics: ['Marketing Channels', 'Customer Journey', 'Setting Goals'] },
      { title: 'SEO Fundamentals', subtopics: ['On-Page SEO', 'Keyword Research', 'Link Building'] },
      { title: 'Social Media Marketing', subtopics: ['Platform Strategy', 'Content Calendar', 'Engagement Tactics'] },
      { title: 'Email Marketing', subtopics: ['Building Lists', 'Campaign Design', 'Automation'] },
      { title: 'Paid Advertising', subtopics: ['Google Ads', 'Facebook Ads', 'Budget Optimization'] },
    ],
  },
  {
    id: 'web-development',
    title: 'Web Development Fundamentals',
    description: 'HTML, CSS, JavaScript — build your first website from scratch.',
    category: 'Programming',
    topics: 5,
    icon: '🌐',
    suggestedTopics: [
      { title: 'HTML Basics', subtopics: ['Page Structure', 'Elements and Tags', 'Forms and Inputs'] },
      { title: 'CSS Styling', subtopics: ['Selectors and Properties', 'Flexbox and Grid', 'Responsive Design'] },
      { title: 'JavaScript Fundamentals', subtopics: ['Variables and Functions', 'DOM Manipulation', 'Events'] },
      { title: 'Building a Website', subtopics: ['Project Setup', 'Layout Design', 'Adding Interactivity'] },
      { title: 'Deployment', subtopics: ['Version Control with Git', 'Hosting Options', 'Going Live'] },
    ],
  },
  {
    id: 'photography',
    title: 'Photography Masterclass',
    description: 'Composition, lighting, editing — take stunning photos with any camera.',
    category: 'Creative',
    topics: 4,
    icon: '📷',
    suggestedTopics: [
      { title: 'Camera Basics', subtopics: ['Aperture and Shutter Speed', 'ISO and Exposure', 'Lens Types'] },
      { title: 'Composition', subtopics: ['Rule of Thirds', 'Leading Lines', 'Framing and Depth'] },
      { title: 'Lighting', subtopics: ['Natural Light', 'Golden Hour', 'Studio Lighting Basics'] },
      { title: 'Post-Processing', subtopics: ['Lightroom Basics', 'Color Correction', 'Export Settings'] },
    ],
  },
  {
    id: 'personal-finance',
    title: 'Personal Finance Essentials',
    description: 'Budgeting, saving, investing — take control of your money.',
    category: 'Business',
    topics: 5,
    icon: '💰',
    suggestedTopics: [
      { title: 'Budgeting Basics', subtopics: ['Tracking Expenses', '50/30/20 Rule', 'Emergency Fund'] },
      { title: 'Saving Strategies', subtopics: ['Automating Savings', 'High-Yield Accounts', 'Cutting Costs'] },
      { title: 'Investing 101', subtopics: ['Stocks and Bonds', 'Index Funds', 'Risk Management'] },
      { title: 'Debt Management', subtopics: ['Good vs Bad Debt', 'Payoff Strategies', 'Credit Score'] },
      { title: 'Retirement Planning', subtopics: ['401k and IRA', 'Compound Interest', 'Long-term Strategy'] },
    ],
  },
  {
    id: 'public-speaking',
    title: 'Public Speaking & Presentations',
    description: 'Overcome stage fright and deliver compelling presentations.',
    category: 'Communication',
    topics: 4,
    icon: '🎤',
    suggestedTopics: [
      { title: 'Overcoming Stage Fright', subtopics: ['Understanding Anxiety', 'Breathing Techniques', 'Practice Methods'] },
      { title: 'Structuring Your Talk', subtopics: ['Opening Hooks', 'Story Arc', 'Strong Conclusions'] },
      { title: 'Delivery Skills', subtopics: ['Voice Projection', 'Body Language', 'Eye Contact'] },
      { title: 'Visual Aids', subtopics: ['Slide Design', 'Minimalism', 'Handling Q&A'] },
    ],
  },
];

export const getTemplates = async (_req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
  const simplified = TEMPLATES.map(({ id, title, description, category, topics, icon }) => ({
    id, title, description, category, topics, icon,
  }));
  res.json({ success: true, data: simplified });
};

export const getTemplate = async (req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
  const template = TEMPLATES.find(t => t.id === req.params.id);
  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  res.json({ success: true, data: template });
};
