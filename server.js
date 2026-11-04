import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_ROUTE = process.env.ADMIN_ROUTE || 'nti-secure-admin-7789';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'TerraHubSecure2026!';
const LIVE_URL = 'https://nti-com.onrender.com';

const __dirname = path.resolve();

const uploadsDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, 'data');
const publicDir = path.join(__dirname, 'public');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

const dbPath = path.join(dataDir, 'achievements.json');
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify([], null, 2));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// Explicit XML Sitemap Route for Googlebot
app.get('/sitemap.xml', (req, res) => {
  const achievements = JSON.parse(fs.readFileSync(dbPath, 'utf8') || '[]');

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  xml += `  <url>\n`;
  xml += `    <loc>${LIVE_URL}/</loc>\n`;
  xml += `    <changefreq>daily</changefreq>\n`;
  xml += `    <priority>1.0</priority>\n`;
  xml += `  </url>\n`;
  xml += `  <url>\n`;
  xml += `    <loc>${LIVE_URL}/home</loc>\n`;
  xml += `    <changefreq>daily</changefreq>\n`;
  xml += `    <priority>0.9</priority>\n`;
  xml += `  </url>\n`;

  achievements.forEach(item => {
    xml += `  <url>\n`;
    xml += `    <loc>${LIVE_URL}/home#item-${item.id}</loc>\n`;
    xml += `    <lastmod>${item.date || new Date().toISOString().split('T')[0]}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  });

  xml += `</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.status(200).send(xml);
});

// Explicit Robots.txt Route
app.get('/robots.txt', (req, res) => {
  const content = `User-agent: *\nAllow: /\nDisallow: /${ADMIN_ROUTE}\n\nSitemap: ${LIVE_URL}/sitemap.xml`;
  res.header('Content-Type', 'text/plain');
  res.status(200).send(content);
});

// API Routes
app.get('/api/achievements', (req, res) => {
  const achievements = JSON.parse(fs.readFileSync(dbPath, 'utf8') || '[]');
  res.json(achievements);
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Invalid Password' });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

app.post('/api/achievements', upload.single('image'), (req, res) => {
  const { title, subtitle, category, description, date, link } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : '';
  
  const achievements = JSON.parse(fs.readFileSync(dbPath, 'utf8') || '[]');
  const newEntry = {
    id: Date.now(),
    title: title || 'Untitled Project',
    subtitle: subtitle || 'Project Milestone',
    category: category || 'PROJECTS',
    date: date || new Date().toISOString().split('T')[0],
    description: description || '',
    link: link || '#',
    image: imagePath
  };

  achievements.unshift(newEntry);
  fs.writeFileSync(dbPath, JSON.stringify(achievements, null, 2));
  res.status(201).json({ success: true, achievement: newEntry });
});

app.put('/api/achievements/:id', upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { title, subtitle, category, description, date, link } = req.body;
  
  let achievements = JSON.parse(fs.readFileSync(dbPath, 'utf8') || '[]');
  const index = achievements.findIndex(item => item.id == id);

  if (index === -1) return res.status(404).json({ success: false, message: 'Record not found' });

  achievements[index].title = title || achievements[index].title;
  achievements[index].subtitle = subtitle || achievements[index].subtitle;
  achievements[index].category = category || achievements[index].category;
  achievements[index].description = description || achievements[index].description;
  achievements[index].date = date || achievements[index].date;
  achievements[index].link = link !== undefined ? link : achievements[index].link;
  
  if (req.file) {
    achievements[index].image = `/uploads/${req.file.filename}`;
  }

  fs.writeFileSync(dbPath, JSON.stringify(achievements, null, 2));
  res.json({ success: true, achievement: achievements[index] });
});

app.delete('/api/achievements/:id', (req, res) => {
  const { id } = req.params;
  let achievements = JSON.parse(fs.readFileSync(dbPath, 'utf8') || '[]');
  achievements = achievements.filter(item => item.id != id);
  fs.writeFileSync(dbPath, JSON.stringify(achievements, null, 2));
  res.json({ success: true });
});

// Web Routes
app.get(`/${ADMIN_ROUTE}`, (req, res) => {
  res.sendFile(path.join(publicDir, 'admin.html'));
});

app.get('/home', (req, res) => {
  res.sendFile(path.join(publicDir, 'home.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use(express.static(publicDir));

app.listen(PORT, () => {
  console.log(`🚀 NTI Server active at ${LIVE_URL}`);
});
