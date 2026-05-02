const express = require('express')
const router = express.Router()
const SupabaseService = require('../services/supabaseService')
const sendEmail = require('../utils/sendEmail')
const getClientIp = require('../utils/getClientIp')

// POST /api/submit-form - Submit contact form
router.post('/', async (req, res) => {
  try {
    const { name, email, whatsapp, projectDetails } = req.body

    // Basic validation
    if (!name || !email || !projectDetails) {
      return res.status(400).json({ 
        success: false,
        message: 'Name, email, and project details are required' 
      })
    }

    // Email validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        message: 'Please enter a valid email address' 
      })
    }

    const ip = getClientIp(req)
    const userAgent = req.get('User-Agent') || 'Unknown'

    // Create new contact submission
    const contact = await SupabaseService.create('contacts', {
      name,
      email,
      whatsapp: whatsapp || '',
      project_details: projectDetails,
      ip_address: ip,
      user_agent: userAgent,
      status: 'pending'
    })

    // Send email notification
    try {
      await sendEmail({
        to: process.env.EMAIL_USER,
        subject: 'New Contact Form Submission - Hooria Portfolio',
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>WhatsApp:</strong> ${whatsapp || 'Not provided'}</p>
          <p><strong>Project Details:</strong></p>
          <p>${projectDetails}</p>
          <p><strong>IP Address:</strong> ${ip}</p>
          <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
        `
      })

      // Send confirmation email to client
      await sendEmail({
        to: email,
        subject: 'Thank you for contacting Hooria Zaman Khan',
        html: `
          <h2>Thank you for reaching out!</h2>
          <p>Dear ${name},</p>
          <p>Thank you for your interest in working with me. I have received your message and will get back to you within 24 hours.</p>
          <p><strong>Your message details:</strong></p>
          <p>${projectDetails}</p>
          <p>Best regards,<br>Hooria Zaman Khan</p>
        `
      })
    } catch (emailError) {
      console.error('Error sending email:', emailError)
      // Continue even if email fails
    }

    res.status(201).json({ 
      success: true,
      message: 'Contact form submitted successfully' 
    })
  } catch (error) {
    console.error('Error submitting contact form:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error submitting contact form' 
    })
  }
})

module.exports = router
