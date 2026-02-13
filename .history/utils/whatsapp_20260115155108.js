// // utils/whatsapp.js
// const qrcode = require('qrcode-terminal');
// const { Client, LocalAuth } = require('whatsapp-web.js');
// const db = require('../firebase-admin');

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

// // === ENVÍO DE MENSAJE ===
// async function enviarMensaje(numero, mensaje) {
//   try {
//     const chatId = `${numero}@c.us`;
//     await client.sendMessage(chatId, mensaje);
//     console.log(`Mensaje enviado a ${numero}`);
//   } catch (error) {
//     console.error('Error enviando mensaje:', error.message);
//   }
// }

// // === MONITOREO DE TURNOS ===
// async function cargarNombreComercio(comercioId) {
//   try {
//     const doc = await db.collection('comercios').doc(comercioId).get();
//     return doc.exists ? doc.data().nombreComercio || 'el comercio' : 'el comercio';
//   } catch (error) {
//     return 'el comercio';
//   }
// }

// async function monitorearTurnos(comercioId) {
//   const nombreComercio = await cargarNombreComercio(comercioId);
//   console.log(`Monitoreando: ${nombreComercio} (${comercioId})`);

//   const q = db.collection(`comercios/${comercioId}/turnos`).orderBy('posicion');

//   const estadoAnterior = new Map();

//   q.onSnapshot((snapshot) => {
//     const turnos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

//     const turnosReales = turnos
//       .filter(t => !t.sobreturno && !t.cancelado && t.telefono)
//       .sort((a, b) => a.posicion - b.posicion);

//     const estadoActual = new Map();
//     turnosReales.forEach((t, i) => estadoActual.set(t.telefono, { posicion: i + 1, nombre: t.nombre }));

//     for (const [tel, act] of estadoActual) {
//       const ant = estadoAnterior.get(tel);
//       if ([1, 5, 10].includes(act.posicion) && ant?.posicion !== act.posicion) {
//         const mensajes = {
//           1: `¡*${act.nombre}*! Es tu turno en *${nombreComercio}*. ¡Pasá al frente!`,
//           5: `¡*${act.nombre}*! Quedan solo *5 turnos* en *${nombreComercio}*. ¡Prepárate!`,
//           10: `¡*${act.nombre}*! Estás a *10 turnos* en *${nombreComercio}*. Te avisaremos.`
//         };
//         enviarMensaje(tel, mensajes[act.posicion]);
//       }
//     }

//     estadoAnterior.clear();
//     for (const [t, d] of estadoActual) estadoAnterior.set(t, d);
//   });
// }

// // === EVENTOS DE WHATSAPP ===
// client.on('qr', qr => {
//   console.log('ESCANEÁ ESTE QR:');
//   qrcode.generate(qr, { small: true });
// });

// client.on('authenticated', () => console.log('Autenticado correctamente'));

// client.on('ready', () => {
//   console.log('WhatsApp conectado y listo');
//   monitorearTurnos('TU_ID_REAL_AQUI'); // ← PONÉ TU ID DE PRUEBA
// });

// client.on('disconnected', reason => console.log('Desconectado:', reason));

// client.initialize();

// // Exportamos si querés usar el client en otro lado (opcional)
// module.exports = { client, enviarMensaje };


const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const db = require('../firebase-admin');

let client;
let isConnected = false;
let reconnectTimer = null;

const initializeWhatsApp = () => {
  console.log('Inicializando WhatsApp client...');

  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    },
  });

  // QR
  client.on('qr', (qr) => {
    console.log('Escanea este QR:');
    qrcode.generate(qr, { small: true });
  });

  // Autenticado
  client.on('authenticated', () => {
    console.log('Autenticado correctamente');
  });

  // Listo
  client.on('ready', () => {
    isConnected = true;
    console.log('WhatsApp conectado y listo');
    clearTimeout(reconnectTimer);
    // monitorearTurnos('TU_ID_REAL_AQUI'); // ← descomentá cuando estés listo
  });

  // Desconectado
  client.on('disconnected', (reason) => {
    isConnected = false;
    console.log('WhatsApp desconectado:', reason);

    if (reason !== 'intentional') {
      console.log('Reintentando en 10 segundos...');
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(initializeWhatsApp, 10000);
    }
  });

  // Errores (captura para no matar el server)
  client.on('error', (err) => {
    console.error('Error en WhatsApp client:', err.message);
    isConnected = false;

    // Si es error de red → reintentar
    if (err.message.includes('net::') || err.message.includes('ERR_NAME_NOT_RESOLVED')) {
      console.log('Error de red detectado. Reintentando en 10s...');
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(initializeWhatsApp, 10000);
    }
  });

  // Inicializar con try-catch
  client.initialize().catch((err) => {
    console.error('Fallo al inicializar WhatsApp:', err.message);
    isConnected = false;
    console.log('Reintentando en 10 segundos...');
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(initializeWhatsApp, 10000);
  });
};

// Iniciar la primera vez
initializeWhatsApp();

// Exportamos lo necesario
module.exports = {
  client,
  getStatus: () => isConnected ? 'connected' : 'disconnected',
  enviarMensaje: async (numero, mensaje) => {
    if (!isConnected) {
      console.warn('WhatsApp no está conectado. Mensaje no enviado.');
      return;
    }
    try {
      const chatId = `${numero}@c.us`;
      await client.sendMessage(chatId, mensaje);
      console.log(`Mensaje enviado a ${numero}`);
    } catch (error) {
      console.error('Error enviando mensaje:', error.message);
    }
  },
};