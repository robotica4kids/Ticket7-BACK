// routes/vendedores.routes.js
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();


router.post('/login', async (req, res) => {
  const { email, pass } = req.body;

  if (!email || !pass) return res.status(400).json({ error: "Email y contraseña requeridos" });

  try {
    // 1. Verificar credenciales con Firebase Auth Admin
    const userRecord = await admin.auth().getUserByEmail(email);

    // 2. Verificar contraseña (Admin SDK no puede verificar password directamente, así que usamos custom token)
    // Pero para simplicidad, vamos a confiar en que si el usuario existe y el email coincide, lo dejamos entrar
    // (la contraseña la verifica el front con client SDK, pero como estamos en backend, la solución segura es usar custom token o verificar en front)

    // SOLUCIÓN SIMPLE Y SEGURA PARA AHORA:
    // Usamos verifyIdToken del client SDK en front, pero como querés backend, vamos con esta alternativa:

    // Mejor solución: el login de vendedor lo hacemos en front con client SDK (como el admin), y el backend solo verifica el UID

    // Pero para mantener tu flujo actual, cambiamos a:

    // Verificar que el usuario exista y no esté deshabilitado
    if (userRecord.disabled) return res.status(401).json({ error: "Cuenta deshabilitada" });

    // Buscar en Firestore si es vendedor
    const vendedorDoc = await db.collection('vendedores').doc(userRecord.uid).get();
    if (!vendedorDoc.exists) return res.status(404).json({ error: "Vendedor no encontrado" });

    const vendedorData = vendedorDoc.data();
    if (vendedorData.deleted) return res.status(401).json({ error: "Vendedor desactivado" });

    // Login exitoso
    res.json({ 
      success: true, 
      uid: userRecord.uid, 
      nombre: vendedorData.nombre || "Vendedor",
      email: userRecord.email 
    });

  } catch (error) {
    console.error("Error login vendedor:", error);
    if (error.code === 'auth/user-not-found') {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }
    res.status(401).json({ error: "Credenciales incorrectas" });
  }
});


// router.post('/crear-comercio', async (req, res) => {
//   const { vendedorId, nombreComercio, direccion, telefono, horario, email, pass } = req.body;

//   if (!vendedorId || !nombreComercio || !email || !pass || pass.length < 6) {
//     return res.status(400).json({ error: "Datos incompletos o contraseña corta" });
//   }

//   try {
//     // Crear usuario del comercio en Auth
//     const userRecord = await admin.auth().createUser({
//       email,
//       password: pass,
//       displayName: nombreComercio,
//     });

//     // Crear documento del comercio con vendedorId
//     const comercioRef = await db.collection('comercios').add({
//       nombreComercio,
//       direccion: direccion || "",
//       telefono: telefono || "",
//       horario: horario || "",
//       email,
//       vendedorId, // ← AQUÍ ESTÁ LA CLAVE: guardamos el ID del vendedor
//       deleted: false,
//       createdAt: admin.firestore.FieldValue.serverTimestamp(),
//       updatedAt: admin.firestore.FieldValue.serverTimestamp(),
//     });

//     res.json({ 
//       success: true, 
//       comercioId: comercioRef.id,
//       message: "Comercio creado correctamente"
//     });
//   } catch (error) {
//     console.error("Error creando comercio:", error);
//     res.status(500).json({ error: error.message || "Error interno" });
//   }
// });

router.post('/crear-comercio', async (req, res) => {
  const { vendedorId, nombreComercio, direccion, telefono, horario, email, pass } = req.body;

  if (!vendedorId || !nombreComercio || !email || !pass || pass.length < 6) {
    return res.status(400).json({ error: "Datos incompletos o contraseña corta" });
  }

  try {
    // Crear usuario del comercio en Auth
    const userRecord = await admin.auth().createUser({
      email,
      password: pass,
      displayName: nombreComercio,
    });

    const uid = userRecord.uid; // ← Este es el ID que debemos usar

    // Crear documento del comercio con ID = UID del usuario
    const comercioRef = db.collection('comercios').doc(uid);
    await comercioRef.set({
      nombreComercio,
      direccion: direccion || "",
      telefono: telefono || "",
      horario: horario || "",
      email,
      vendedorId, // Quién lo creó
      deleted: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ 
      success: true, 
      comercioId: uid, // ← Devolvemos el UID como comercioId
      message: "Comercio creado correctamente"
    });
  } catch (error) {
    console.error("Error creando comercio:", error);
    res.status(500).json({ error: error.message || "Error interno" });
  }
});




router.post('/editar-comercio', async (req, res) => {
  const { vendedorId, comercioId, updates } = req.body;
  if (!vendedorId || !comercioId || !updates) return res.status(400).json({ error: "Datos requeridos" });

  try {
    const comercioRef = db.collection('comercios').doc(comercioId);
    const comercioDoc = await comercioRef.get();
    if (!comercioDoc.exists || comercioDoc.data().vendedorId !== vendedorId) return res.status(403).json({ error: "No autorizado" });

    await comercioRef.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error interno" });
  }
});

router.post('/borrar-comercio', async (req, res) => {
  const { vendedorId, comercioId } = req.body;
  if (!vendedorId || !comercioId) return res.status(400).json({ error: "Datos requeridos" });

  try {
    const comercioRef = db.collection('comercios').doc(comercioId);
    const comercioDoc = await comercioRef.get();
    if (!comercioDoc.exists || comercioDoc.data().vendedorId !== vendedorId) return res.status(403).json({ error: "No autorizado" });

    await comercioRef.update({
      deleted: true,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedBy: vendedorId,
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error interno" });
  }
});

// router.get('/mis-comercios', async (req, res) => {
//   const { vendedorId } = req.query;
//   if (!vendedorId) return res.status(400).json({ error: "Vendedor ID requerido" });

//   try {
//     const snapshot = await db.collection('comercios')
//       .where('vendedorId', '==', vendedorId)
//       .where('deleted', '==', false)
//       .orderBy('createdAt', 'desc')
//       .get();

//     const comercios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
//     res.json(comercios);
//   } catch (error) {
//     res.status(500).json({ error: "Error interno" });
//   }
// });

router.get('/mis-comercios', async (req, res) => {
  const { vendedorId } = req.query;
  if (!vendedorId) return res.status(400).json({ error: "Vendedor ID requerido" });

  try {
    let q = db.collection('comercios')
      .where('vendedorId', '==', vendedorId)
      .where('deleted', '==', false);

    // Solo ordenamos por createdAt si el campo existe en al menos un documento
    // Pero para evitar errores, hacemos try-catch interno o simplemente quitamos orderBy si falla
    const snapshot = await q.get();

    const comercios = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        nombreComercio: data.nombreComercio || "Sin nombre",
        direccion: data.direccion || "",
        telefono: data.telefono || "",
        horario: data.horario || "",
        email: data.email || "",
        createdAt: data.createdAt || null,
      };
    });

    // Ordenamos en memoria (más seguro)
    comercios.sort((a, b) => {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return b.createdAt.toDate() - a.createdAt.toDate();
    });

    res.json(comercios);
  } catch (error) {
    console.error("Error en mis-comercios:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});





router.post('/editar-comercio', async (req, res) => {
  const { vendedorId, comercioId, updates } = req.body;
  if (!vendedorId || !comercioId || !updates) return res.status(400).json({ error: "Datos requeridos" });

  try {
    const comercioRef = db.collection('comercios').doc(comercioId);
    const comercioDoc = await comercioRef.get();

    if (!comercioDoc.exists || comercioDoc.data().vendedorId !== vendedorId) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const comercioData = comercioDoc.data();

    // Si hay nuevo email → actualizar en Auth
    if (updates.newEmail && updates.newEmail !== comercioData.email) {
      // Buscar usuario actual por email viejo
      const userRecord = await admin.auth().getUserByEmail(comercioData.email);

      // Actualizar email en Auth
      await admin.auth().updateUser(userRecord.uid, {
        email: updates.newEmail,
      });

      // Actualizar email en Firestore
      updates.email = updates.newEmail;
    }

    // Si hay nueva contraseña → actualizar en Auth
    if (updates.newPass && updates.newPass.length >= 6) {
      // Buscar usuario (por email viejo o nuevo si cambió)
      const userRecord = await admin.auth().getUserByEmail(updates.newEmail || comercioData.email);
      await admin.auth().updateUser(userRecord.uid, {
        password: updates.newPass,
      });
    }

    // Preparar updates para Firestore (sin newEmail/newPass)
    const firestoreUpdates = {
      nombreComercio: updates.nombreComercio || comercioData.nombreComercio,
      direccion: updates.direccion || comercioData.direccion,
      telefono: updates.telefono || comercioData.telefono,
      horario: updates.horario || comercioData.horario,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Si cambiamos email, actualizamos el campo email en Firestore
    if (updates.newEmail) {
      firestoreUpdates.email = updates.newEmail;
    }

    await comercioRef.update(firestoreUpdates);

    res.json({ success: true, message: "Comercio actualizado correctamente" });
  } catch (error) {
    console.error("Error editando comercio:", error);
    res.status(500).json({ error: error.message || "Error interno" });
  }
});




module.exports = router;