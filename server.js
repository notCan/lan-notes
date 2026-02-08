const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const PORT = 3334;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const JWT_SECRET = process.env.JWT_SECRET || 'lan-notlar-secret-change-in-production';
const COOKIE_NAME = 'token';
const REMEMBER_ME_DAYS = 30;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: false } });

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
  }
}

async function readUsers() {
  const data = await fs.readFile(USERS_FILE, 'utf8');
  return JSON.parse(data);
}

async function writeUsers(data) {
  await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2));
}

function getUserNotesPath(userId) {
  return path.join(DATA_DIR, 'users', userId, 'notes.json');
}

async function ensureUserDirs(userId) {
  const userDataDir = path.join(DATA_DIR, 'users', userId);
  const userUploadsDir = path.join(UPLOADS_DIR, userId);
  await fs.mkdir(userDataDir, { recursive: true });
  await fs.mkdir(userUploadsDir, { recursive: true });
}

async function readNotes(userId) {
  const filePath = getUserNotesPath(userId);
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return { notes: [] };
  }
}

async function writeNotes(userId, data) {
  await ensureUserDirs(userId);
  const filePath = getUserNotesPath(userId);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

function broadcastNotesToUser(userId, notes) {
  io.to(userId).emit('notes', notes);
}

function authFromCookie(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return { id: payload.userId, username: payload.username };
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = authFromCookie(req);
  if (!user) return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
  req.user = user;
  next();
}

// Auth: register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
    const trimmed = username.trim().toLowerCase();
    if (trimmed.length < 2) return res.status(400).json({ error: 'Kullanıcı adı en az 2 karakter olmalı' });
    const data = await readUsers();
    if (data.users.some(u => u.username.toLowerCase() === trimmed)) return res.status(400).json({ error: 'Bu kullanıcı adı alınmış' });
    const hash = await bcrypt.hash(password, 10);
    const user = { id: uuidv4(), username: trimmed, passwordHash: hash };
    data.users.push(user);
    await writeUsers(data);
    await ensureUserDirs(user.id);
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: REMEMBER_ME_DAYS + 'd' });
    res.cookie(COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax', maxAge: REMEMBER_ME_DAYS * 24 * 60 * 60 * 1000 });
    res.status(201).json({ user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kayıt olunamadı' });
  }
});

// Auth: login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
    const data = await readUsers();
    const user = data.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
    const maxAge = rememberMe ? REMEMBER_ME_DAYS * 24 * 60 * 60 * 1000 : undefined;
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: rememberMe ? REMEMBER_ME_DAYS + 'd' : '1d' });
    res.cookie(COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax', maxAge });
    res.json({ user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Giriş yapılamadı' });
  }
});

// Auth: logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.status(204).end();
});

// Auth: me
app.get('/api/auth/me', (req, res) => {
  const user = authFromCookie(req);
  if (!user) return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
  res.json({ user: { id: user.id, username: user.username } });
});

// Notes API (all require auth)
app.get('/api/notes', requireAuth, async (req, res) => {
  try {
    const data = await readNotes(req.user.id);
    res.json(data.notes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Notlar yüklenemedi' });
  }
});

app.get('/api/notes/:id', requireAuth, async (req, res) => {
  try {
    const data = await readNotes(req.user.id);
    const note = data.notes.find(n => n.id === req.params.id);
    if (!note) return res.status(404).json({ error: 'Not bulunamadı' });
    res.json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Not yüklenemedi' });
  }
});

app.post('/api/notes', requireAuth, async (req, res) => {
  try {
    const data = await readNotes(req.user.id);
    const note = {
      id: uuidv4(),
      title: req.body.title || 'Yeni not',
      updatedAt: new Date().toISOString(),
      sections: Array.isArray(req.body.sections) ? req.body.sections : [],
      topLevelItems: Array.isArray(req.body.topLevelItems) ? req.body.topLevelItems : []
    };
    note.sections = note.sections.map(s => ({
      id: s.id || uuidv4(),
      subTitle: s.subTitle || '',
      items: (s.items || []).map(i => ({ id: i.id || uuidv4(), type: i.type || 'text', content: i.content, name: i.name, url: i.url }))
    }));
    note.topLevelItems = note.topLevelItems.map(i => ({ id: i.id || uuidv4(), type: i.type || 'text', content: i.content, name: i.name, url: i.url }));
    data.notes.push(note);
    await writeNotes(req.user.id, data);
    broadcastNotesToUser(req.user.id, data.notes);
    res.status(201).json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Not oluşturulamadı' });
  }
});

app.put('/api/notes/:id', requireAuth, async (req, res) => {
  try {
    const data = await readNotes(req.user.id);
    const idx = data.notes.findIndex(n => n.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not bulunamadı' });
    const note = data.notes[idx];
    note.title = req.body.title ?? note.title;
    note.updatedAt = new Date().toISOString();
    note.sections = Array.isArray(req.body.sections)
      ? req.body.sections.map(s => ({
          id: s.id || uuidv4(),
          subTitle: s.subTitle || '',
          items: (s.items || []).map(i => ({ id: i.id || uuidv4(), type: i.type || 'text', content: i.content, name: i.name, url: i.url }))
        }))
      : note.sections;
    note.topLevelItems = Array.isArray(req.body.topLevelItems)
      ? req.body.topLevelItems.map(i => ({ id: i.id || uuidv4(), type: i.type || 'text', content: i.content, name: i.name, url: i.url }))
      : note.topLevelItems;
    await writeNotes(req.user.id, data);
    broadcastNotesToUser(req.user.id, data.notes);
    res.json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Not güncellenemedi' });
  }
});

app.delete('/api/notes/:id', requireAuth, async (req, res) => {
  try {
    const data = await readNotes(req.user.id);
    const idx = data.notes.findIndex(n => n.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not bulunamadı' });
    data.notes.splice(idx, 1);
    await writeNotes(req.user.id, data);
    broadcastNotesToUser(req.user.id, data.notes);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Not silinemedi' });
  }
});

// Upload: per-user directory, auth required
app.post('/api/upload', requireAuth, async (req, res, next) => {
  await ensureUserDirs(req.user.id);
  const userUploadsDir = path.join(UPLOADS_DIR, req.user.id);
  const storage = multer.diskStorage({
    destination: (_, __, cb) => cb(null, userUploadsDir),
    filename: (_, file, cb) => cb(null, uuidv4() + (path.extname(file.originalname) || ''))
  });
  multer({ storage }).single('file')(req, res, (err) => {
    if (err) return next(err);
    if (!req.file) return res.status(400).json({ error: 'Dosya yok' });
    const url = '/files/' + req.user.id + '/' + req.file.filename;
    res.json({ url, name: req.file.originalname || req.file.filename });
  });
});

// Serve uploaded file: only own user's files
app.get('/files/:userId/:filename', requireAuth, (req, res) => {
  if (req.params.userId !== req.user.id) return res.status(403).end();
  const file = path.join(UPLOADS_DIR, req.params.userId, req.params.filename);
  const base = path.resolve(UPLOADS_DIR, req.user.id);
  const resolved = path.resolve(file);
  if (!resolved.startsWith(base)) return res.status(400).end();
  res.sendFile(resolved, (err) => { if (err) res.status(404).end(); });
});

// Socket.IO: auth via cookie, join user room, emit notes
io.use((socket, next) => {
  const cookie = (socket.request.headers.cookie || '');
  const match = cookie.match(new RegExp('(?:^|;\\s*)' + COOKIE_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
  const token = match ? match[1] : null;
  if (!token) return next(new Error('unauthorized'));
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.userId = payload.userId;
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});

io.on('connection', async (socket) => {
  const userId = socket.userId;
  try {
    const data = await readNotes(userId);
    socket.join(userId);
    socket.emit('notes', data.notes);
  } catch (e) {
    socket.emit('notes', []);
  }
});

server.listen(PORT, '0.0.0.0', async () => {
  await ensureDirs();
  const os = require('os');
  let lanIp = 'localhost';
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const n of nets[name]) {
      if (n.family === 'IPv4' && !n.internal) { lanIp = n.address; break; }
    }
  }
  console.log(`Server: http://0.0.0.0:${PORT}`);
  console.log(`LAN:    http://${lanIp}:${PORT}`);
});
