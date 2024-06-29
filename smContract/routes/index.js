const express = require('express');
const { getQrCode } = require('../controllers/whatsappController');

const router = express.Router();

router.get('/', (req, res) => {
  const qrCode = getQrCode();
  if (qrCode) {
    res.send(`<img src="${qrCode}" alt="QR Code">`);
  } else {
    res.send('QR code image not available');
  }
});

module.exports = router;
