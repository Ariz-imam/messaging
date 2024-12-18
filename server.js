const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

// Environment variables for Render
const PORT = process.env.PORT || 3001; // Dynamic port for Render
const DB_URL = process.env.DB_URL || 'mongodb://localhost:27017/messagingApp'; // MongoDB connection string
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000'; // Frontend origin for CORS

// Express and Socket setup
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

// MongoDB connection
mongoose
  .connect(DB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Message schema
const MessageSchema = new mongoose.Schema({
  sender: String,
  content: String,
  type: String, // text, image, voice
  timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model('Message', MessageSchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer for image and voice uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

const upload = multer({ storage });

// Routes
app.post('/send-message', async (req, res) => {
  const { sender, content, type } = req.body;
  const message = new Message({ sender, content, type });
  await message.save();
  io.emit('new-message', message);
  res.status(200).send(message);
});

app.post('/upload-file', upload.single('file'), (req, res) => {
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(200).send({ url: fileUrl });
});

app.get('/get-messages', async (req, res) => {
  const messages = await Message.find().sort({ timestamp: 1 });
  res.status(200).send(messages);
});

app.delete('/delete-message/:id', async (req, res) => {
  const { id } = req.params;
  const { sender } = req.body;

  try {
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.sender !== sender) return res.status(403).json({ error: 'Unauthorized' });

    await Message.deleteOne({ _id: id });
    res.status(200).json({ success: 'Message deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// WebSocket connection
io.on('connection', (socket) => {
  console.log('User connected');
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
