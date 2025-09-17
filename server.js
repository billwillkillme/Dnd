const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// In-memory user store: { username: { password } }
const users = {};

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Simple session management (cookie-based, not for production)
function authMiddleware(req, res, next) {
  const username = req.cookies.username;
  if (username && users[username]) {
    req.user = username;
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Registration endpoint
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  if (users[username]) return res.status(400).json({ error: 'User exists' });
  users[username] = { password };
  res.json({ success: true });
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  if (!users[username] || users[username].password !== password)
    return res.status(401).json({ error: 'Invalid credentials' });
  res.cookie('username', username, { httpOnly: false });
  res.json({ success: true });
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  res.clearCookie('username');
  res.json({ success: true });
});

// Authenticated route example
app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ username: req.user });
});

// Serve index.html for logged in users, otherwise redirect to login
app.get('/', (req, res, next) => {
  if (req.cookies.username && users[req.cookies.username]) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.redirect('/login.html');
  }
});

// Socket.IO for multiplayer
io.use((socket, next) => {
  const username = socket.handshake.auth.username;
  if (username && users[username]) {
    socket.username = username;
    return next();
  }
  return next(new Error("Unauthorized"));
});
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.username}`);
  socket.broadcast.emit('user-joined', { username: socket.username });

  socket.on('chat', (msg) => {
    io.emit('chat', { username: socket.username, message: msg });
  });

  socket.on('disconnect', () => {
    io.emit('user-left', { username: socket.username });
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
