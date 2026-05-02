const mongoose = require('mongoose')

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  whatsapp: {
    type: String,
    trim: true,
    default: ''
  },
  projectDetails: {
    type: String,
    required: [true, 'Project details are required'],
    trim: true,
    maxlength: [2000, 'Project details cannot exceed 2000 characters']
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'in-progress', 'completed'],
    default: 'new'
  },
  ip: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  }
}, {
  timestamps: true
})

// Create indexes for performance
contactSchema.index({ email: 1 })
contactSchema.index({ status: 1 })
contactSchema.index({ createdAt: -1 })

module.exports = mongoose.model('Contact', contactSchema)
