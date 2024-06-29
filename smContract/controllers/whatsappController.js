const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { runCompletion } = require('../services/completionService');

let client = new Client();;
let qrCodeImage = null;

function clientInitialize() {
  client.on('qr', async (qr) => {
    // Your QR code logic
    qrCodeImage = await qrcode.toDataURL(qr, { errorCorrectionLevel: 'L' });
  });
  client.on('ready', () => {
    console.log('Client is ready');
  });

  client.on('error', error => {
    console.error('Client error:', error);
  });

  client.on('authenticated', (session) => {
    console.log('Authenticated', session);
  });

  client.on('auth_failure', (msg) => {
    console.error('Authentication failure', msg);
  });


  client.initialize();
}

client.on('message', async (message) => {
  // Your message logic
  const whatsappNumber = message.from;
  const result = await runCompletion(whatsappNumber, message.body);
  await message.reply(result);
});

function getQrCode() {
  return qrCodeImage;
}

module.exports = {
  clientInitialize,
  getQrCode
};
