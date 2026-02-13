// // test.js (ahora con Express)
// const qrcode = require('qrcode-terminal');
// const { Client, LocalAuth } = require('whatsapp-web.js');
// const express = require('express');
// const cors = require('cors');

// const app = express();
// const PORT = 3000;

// app.use(cors());
// app.use(express.json());

// app.get('/status', (req, res) => {
//   res.json({ status: 'Backend + WhatsApp corriendo' });
// });

// const client = new Client({
//   authStrategy: new LocalAuth(),
//   puppeteer: {
//     headless: true,
//     args: [
//       '--no-sandbox',
//       '--disable-setuid-sandbox',
//       '--disable-dev-shm-usage',
//       '--disable-gpu',
//       '--single-process',
//     ]
//   }
// });

// client.on('qr', qr => {
//   console.log('ESCANEÁ ESTE QR:');
//   qrcode.generate(qr, { small: true });
// });

// client.on('authenticated', () => console.log('Autenticado correctamente'));

// client.on('ready', () => {
//   console.log('WhatsApp conectado y listo');
// });

// client.on('disconnected', reason => console.log('Desconectado:', reason));

// client.initialize();

// app.listen(PORT, () => {
//   console.log(`Server corriendo en http://localhost:${PORT}`);
//   console.log(`Probá: http://localhost:${PORT}/status`);
// });



// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require("axios");
const db = require("./firebase-admin");

// === ESTO INICIALIZA WHATSAPP (utils/whatsapp.js) ===
require('./utils/whatsapp'); 

const app = express();
const PORT = process.env.PORT || 3000;
const APP_ID = "ticket7-pro"; // ID consistente para que el front lo encuentre


app.use(cors());
app.use(express.json());


// --- NUEVA FUNCIÓN: SINCRONIZADOR DE IP ---
async function syncIP() {
  try {
    const response = await axios.get('https://ipv4.icanhazip.com/');
    const currentIP = response.data.trim();
    const serverUrl = `http://${currentIP}:${PORT}`;

    if (serverUrl){
      console.log("URL_IP:: ", serverUrl);
    }

    // Guardamos en la ruta que el Front de Vercel va a consultar
    // Usamos la estructura de rutas obligatoria para evitar errores de permisos
    await db.doc(`artifacts/${APP_ID}/public/settings`).set({
      url: serverUrl,
      lastUpdate: new Date().toISOString(),
      status: 'online'
    }, { merge: true });

    console.log(`[DNS Dinámico] IP Sincronizada: ${serverUrl}`);
  } catch (error) {
    console.error('Error sincronizando IP:', error.message);
  }
}





// Rutas
app.use('/api/turnos', require('./routes/turnos.routes'));
app.use('/api/comercio', require('./routes/comercios.routes')); // si lo tenés
// app.use('/api/auth', require('./routes/auth.routes'));

app.use('/api/vendedores', require('./routes/vendedores.routes'));

app.use('/api/admin', require('./routes/admin.routes'));

// app.get('/status', (req, res) => {
//   res.json({ status: 'Backend corriendo con WhatsApp conectado' });
// });
app.get('/status', (req, res) => {
  const whatsappStatus = require('./utils/whatsapp').getStatus();
  res.json({
    server: 'running',
    whatsapp: whatsappStatus,
    timestamp: new Date().toISOString(),
  });
});


app.listen(PORT, () => {


  console.log(`Server corriendo en puerto ${PORT}`);
  
  // Iniciar sincronización de IP
  syncIP(); 
  setInterval(syncIP, 60000); // Cada minuto
});


// Catch global para excepciones no manejadas (no mata el server)
process.on('uncaughtException', (err) => {
  console.error('Excepción no capturada:', err.message);
  console.error(err.stack);
  // NO process.exit() – el server sigue vivo
});

process.on('unhandledRejection', (reason) => {
  console.error('Promesa rechazada no manejada:', reason);
});
