const mongoose = require('mongoose')

const visitorSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  visitDate: {
    type: Date,
    default: Date.now
  },
  page: {
    type: String,
    default: 'home'
  }
}, {
  timestamps: true
})

// Create indexes for performance
visitorSchema.index({ ip: 1, visitDate: 1 })
visitorSchema.index({ visitDate: 1 })

module.exports = mongoose.model('Visitor', visitorSchema)
