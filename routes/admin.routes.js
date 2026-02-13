// routes/admin.routes.js
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Login admin (hardcodeado por seguridad - solo tú)
router.post('/login', (req, res) => {
  const { usuario, password } = req.body;

if (req.body){
    console.log("USUARIO:: ", usuario)
    console.log("PASSWORD:: ", password)
}


  if (usuario === 'admin@admin' && password === 'Logan1301...!!') {
    res.json({ success: true, message: "Login admin correcto" });
  } else {
    res.status(401).json({ error: "Credenciales incorrectas" });
  }
});

// Crear vendedor
router.post('/crear-vendedor', async (req, res) => {
  const { email, password, nombre } = req.body;

  if (!email || !password || password.length < 6 || !nombre) {
    return res.status(400).json({ error: "Datos incompletos o contraseña muy corta" });
  }

  try {
    // 1. Crear usuario en Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: nombre,
    });

    const uid = userRecord.uid; // ← Este es el UID correcto

    // 2. Crear documento en vendedores con ID = UID
    await db.collection('vendedores').doc(uid).set({
      nombre,
      email,
      deleted: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ 
      success: true, 
      uid: uid,
      message: "Vendedor creado correctamente"
    });
  } catch (error) {
    console.error("Error creando vendedor:", error);
    res.status(500).json({ error: error.message || "Error interno" });
  }
});

// Listar vendedores (activos y borrados)
router.get('/vendedores', async (req, res) => {
  try {
    const snapshot = await db.collection('vendedores').get();
    const vendedores = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
    }));
    res.json(vendedores);
  } catch (error) {
    res.status(500).json({ error: "Error listando vendedores" });
  }
});

// Borrado lógico de vendedor
router.post('/borrar-vendedor', async (req, res) => {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: "UID requerido" });

  try {
    await db.collection('vendedores').doc(uid).update({
      deleted: true,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error borrando vendedor" });
  }
});

// Reactivar vendedor
router.post('/reactivar-vendedor', async (req, res) => {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: "UID requerido" });

  try {
    await db.collection('vendedores').doc(uid).update({
      deleted: false,
      deletedAt: null,
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error reactivando" });
  }
});

module.exports = router;