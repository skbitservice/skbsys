const express = require('express');
const router = express.Router();

// GET all engineers
router.get('/', (req, res) => {
  res.json({ message: 'Engineers list endpoint' });
});

module.exports = router;
