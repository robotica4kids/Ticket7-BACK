// routes/comercios.routes.js
const express = require('express');
const router = express.Router();

const admin = require('firebase-admin'); // ← AGREGÁ ESTA LÍNEA
const db = require('../firebase-admin'); // ya la tenías




// Ruta de prueba (opcional)
router.get('/test', (req, res) => {
  res.json({ message: 'Ruta comercios funciona (prueba)' });
});


// routes/comercios.routes.js (o el archivo que uses)
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (req) {
    console.log("ID de comercio: ", id)
  } else {
    console.log("Sin params!!")
  }

  try {
    const comercioDoc = await db.collection('comercios').doc(id).get();

    if (!comercioDoc.exists) {
      return res.status(404).json({ error: 'Comercio no encontrado' });
    }

    res.json(comercioDoc.data());
  } catch (error) {
    console.error('Error get comercio:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});



// routes/comercios.routes.js
// router.post('/crear', async (req, res) => {
//   const { nombreComercio, email, pass } = req.body;

  
//   console.log("Dentro de CREAR!!");


//   if (req.body){
//     console.log("Nombre Comercio:: ", nombreComercio);
//     console.log("EMAIL:: ", email);
//     console.log("PASS:: ", pass);
//   } else {
//     console.log("No hay datos entrantes!!");

//   }


//   if (!nombreComercio || !email || !pass) return res.status(400).json({ error: "Datos requeridos" });

//   try {
//     // Crear usuario en Firebase Auth
//     const user = await admin.auth().createUser({
//       email,
//       password: pass,
//       displayName: nombreComercio,
//     });

//     // Crear documento en Firestore
//     const comercioDoc = await db.collection('comercios').add({
//       nombreComercio,
//       usuarioUid: user.uid, // Guardamos UID de Auth en vez de usuario/pass
//       creadoEn: new Date(),
//     });

//     res.json({ success: true, comercioId: comercioDoc.id });
//   } catch (error) {
//     console.error("Error creando comercio:", error);
//     res.status(500).json({ error: "Error interno" });
//   }
// });

router.post('/crear', async (req, res) => {
  const { nombreComercio, direccion, telefono, horario, email, pass } = req.body;

  if (!nombreComercio || !direccion || !email || !pass || pass.length < 6) {
    return res.status(400).json({ error: "Datos incompletos o contraseña muy corta" });
  }

  try {
    const user = await admin.auth().createUser({
      email,
      password: pass,
      displayName: nombreComercio,
    });

    const comercioDoc = await db.collection('comercios').add({
      nombreComercio,
      direccion,
      telefono,
      horario,
      email,
      usuarioUid: user.uid,
      creadoEn: new Date(),
    });

    res.json({ success: true, comercioId: comercioDoc.id });
  } catch (error) {
    console.error("Error creando comercio:", error);
    res.status(500).json({ error: error.message || "Error interno" });
  }
});




module.exports = router;