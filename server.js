require('@dotenvx/dotenvx').config();

const mongoose = require('mongoose');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();
const PORT = 3002;

const postApi = require('./routes/postApi')
const getApi = require('./routes/getApi')
const patchApi = require('./routes/patchApi')
const deleteApi = require('./routes/deleteApi')

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    // Update this to include both your development and production URLs
    origin: ['http://localhost:3000', 'https://your-production-domain.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

mongoose.connect(process.env.DB_URI, {
  tls: true, // Enables TLS/SSL
  tlsAllowInvalidCertificates: true // Allow invalid certificates (not recommended for production)
})
.then(() => {
  app.use('/api', postApi, getApi, patchApi, deleteApi);
  app.listen(PORT, () => {console.log(`Server running on port ${PORT}`)});
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
});