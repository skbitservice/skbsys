const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Trips & Reimbursement Statements endpoint' });
});

module.exports = router;
