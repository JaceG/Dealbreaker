const express = require('express')
const router = express.Router()
const FlagHistory = require('../models/FlagHistory')

// Get all history entries for a flag
router.get('/:profileId/:flagId', async (req, res) => {
  try {
    const { profileId, flagId } = req.params
    const history = await FlagHistory.find({ profileId, flagId })
      .sort({ timestamp: -1 }) // Newest first
      .exec()

    res.json(history)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Add a new history entry
router.post('/', async (req, res) => {
  try {
    console.log('Received data:', JSON.stringify(req.body, null, 2))

    // Extract data with defaults
    const {
      profileId = '',
      profileName = '',
      flagId = '',
      flagTitle = '',
      previousStatus = '',
      newStatus = '',
      reason = '',
      attachments = []
    } = req.body

    // Validate required fields with better error messages
    if (!profileId) {
      console.log('Validation error: Missing profileId')
      return res.status(400).json({ message: 'profileId is required' })
    }

    if (!profileName) {
      console.log('Validation error: Missing profileName')
      return res.status(400).json({ message: 'profileName is required' })
    }

    if (!flagId) {
      console.log('Validation error: Missing flagId')
      return res.status(400).json({ message: 'flagId is required' })
    }

    if (!flagTitle) {
      console.log('Validation error: Missing flagTitle')
      return res.status(400).json({ message: 'flagTitle is required' })
    }

    // More flexible validation with type conversion if needed
    const cleanPreviousStatus = String(previousStatus).toLowerCase()
    const cleanNewStatus = String(newStatus).toLowerCase()

    if (!['white', 'yellow', 'red'].includes(cleanPreviousStatus)) {
      console.log('Validation error: Invalid previousStatus', previousStatus)
      return res.status(400).json({
        message: 'previousStatus must be white, yellow, or red',
        received: previousStatus
      })
    }

    if (!['white', 'yellow', 'red'].includes(cleanNewStatus)) {
      console.log('Validation error: Invalid newStatus', newStatus)
      return res.status(400).json({
        message: 'newStatus must be white, yellow, or red',
        received: newStatus
      })
    }

    // Create a sanitized document
    const cleanData = {
      profileId: String(profileId),
      profileName: String(profileName),
      flagId: String(flagId),
      flagTitle: String(flagTitle),
      previousStatus: cleanPreviousStatus,
      newStatus: cleanNewStatus,
      reason: String(reason || ''),
      attachments: Array.isArray(attachments) ? attachments : [],
      timestamp: new Date()
    }

    // Create and save the history entry
    const historyEntry = new FlagHistory(cleanData)
    const savedEntry = await historyEntry.save()

    console.log('Successfully saved entry:', savedEntry._id)
    res.status(201).json(savedEntry)
  } catch (error) {
    console.error('Error in POST /flagHistory:', error.message)
    if (error.name === 'ValidationError') {
      console.log(
        'Mongoose validation error details:',
        Object.keys(error.errors)
          .map(key => `${key}: ${error.errors[key].message}`)
          .join(', ')
      )
      return res.status(400).json({
        message: 'Validation error',
        details: Object.values(error.errors).map(err => err.message)
      })
    }
    res.status(400).json({ message: error.message })
  }
})

// Add attachment to a history entry
router.post('/:historyId/attachment', async (req, res) => {
  try {
    const { historyId } = req.params
    const { attachment } = req.body

    const result = await FlagHistory.findByIdAndUpdate(
      historyId,
      { $push: { attachments: attachment } },
      { new: true }
    )

    if (!result) {
      return res.status(404).json({ message: 'History entry not found' })
    }

    res.json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// Sync pending changes
router.post('/sync', async (req, res) => {
  try {
    console.log('Received sync request:', JSON.stringify(req.body, null, 2))

    const { changes } = req.body

    if (!changes || !Array.isArray(changes)) {
      console.log('Validation error: changes is not an array')
      return res.status(400).json({ message: 'changes must be an array' })
    }

    if (changes.length === 0) {
      console.log('No changes to sync')
      return res.json({ success: true, count: 0, results: [] })
    }

    const results = []

    for (const change of changes) {
      if (!change.action) {
        console.log('Validation error: change is missing action')
        continue
      }

      if (change.action === 'addFlagHistory') {
        try {
          // Extract and validate required fields
          const {
            profileId,
            profileName,
            flagId,
            flagTitle,
            previousStatus,
            newStatus,
            timestamp,
            title // Also look for title field
          } = change.data

          // Create a sanitized object with validated fields
          const safeData = {
            profileId: String(profileId || ''),
            profileName: String(profileName || 'Unknown Profile'),
            flagId: String(flagId || ''),
            flagTitle: String(flagTitle || title || `Flag ${flagId}`), // Try both flagTitle and title
            previousStatus: String(previousStatus || 'white'),
            newStatus: String(newStatus || 'white'),
            timestamp: timestamp ? new Date(timestamp) : new Date(),
            reason: change.data.reason || '',
            attachments: Array.isArray(change.data.attachments)
              ? change.data.attachments
              : []
          }

          console.log('Creating history entry with data:', safeData)
          const historyEntry = new FlagHistory(safeData)
          const savedEntry = await historyEntry.save()
          console.log('Saved entry:', savedEntry._id)
          results.push(savedEntry)
        } catch (error) {
          console.error('Error saving history entry:', error.message)
          if (error.name === 'ValidationError') {
            console.error(
              'Validation errors:',
              Object.keys(error.errors)
                .map(key => `${key}: ${error.errors[key].message}`)
                .join(', ')
            )
          }
        }
      }
    }

    console.log(
      `Successfully processed ${results.length} of ${changes.length} changes`
    )
    res.json({ success: true, count: results.length, results })
  } catch (error) {
    console.error('Error in sync endpoint:', error.message)
    res.status(400).json({ message: error.message })
  }
})

module.exports = router
