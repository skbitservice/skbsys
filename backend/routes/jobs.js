const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Jobs list endpoint' });
});

module.exports = router;
