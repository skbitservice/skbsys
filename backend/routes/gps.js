const express = require('express');
const router = express.Router();

router.get('/live', (req, res) => {
  res.json({ message: 'Live GPS fleet radar endpoint' });
});

module.exports = router;
