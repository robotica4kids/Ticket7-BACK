// // controllers/turnos.controller.js
// const db = require('../firebase-admin');
// const { collection, doc, getDocs, query, orderBy, addDoc, deleteDoc, updateDoc, writeBatch, serverTimestamp } = require('firebase-admin/firestore');

// exports.getTurnos = async (req, res) => {
//   const { comercio } = req.query;
//   if (!comercio) return res.status(400).json({ error: "comercio requerido" });

//   try {
//     const q = query(collection(db, `comercios/${comercio}/turnos`), orderBy('posicion'));
//     const snapshot = await getDocs(q);
//     const turnos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
//     res.json(turnos);
//   } catch (error) {
//     console.error("Error getTurnos:", error);
//     res.status(500).json({ error: "Error interno" });
//   }
// };

// exports.agregarTurno = async (req, res) => {
//   const { comercioId, nombre, telefono, especial } = req.body;
//   if (!comercioId || !nombre || !telefono) return res.status(400).json({ error: "Datos incompletos" });

//   try {
//     const turnosSnap = await getDocs(query(collection(db, `comercios/${comercioId}/turnos`), orderBy('posicion')));
//     const turnos = turnosSnap.docs.map(d => d.data());

//     const posiciones = turnos.filter(t => !t.sobreturno).map(t => t.posicion);
//     const nuevaPosicion = posiciones.length ? Math.max(...posiciones) + 1 : 1;

//     await addDoc(collection(db, `comercios/${comercioId}/turnos`), {
//       nombre: nombre.trim(),
//       telefono: telefono.trim(),
//       posicion: nuevaPosicion,
//       especial: !!especial,
//       sobreturno: false,
//       ocupado: false,
//       cancelado: false,
//       timestamp: serverTimestamp(),
//     });

//     // Regenerar sobreturnos
//     const batch = db.batch();
//     const sobreturnosLibres = turnos.filter(t => t.sobreturno && !t.ocupado);
//     sobreturnosLibres.forEach(t => batch.delete(doc(db, `comercios/${comercioId}/turnos`, t.id)));

//     const clientes = turnos.filter(t => !t.sobreturno).sort((a, b) => a.posicion - b.posicion);
//     for (let i = 0; i < clientes.length - 1; i++) {
//       const pos = clientes[i].posicion + 0.5;
//       const yaExiste = turnos.some(t => t.sobreturno && Math.abs(t.posicion - pos) < 0.01);
//       if (!yaExiste) {
//         const nuevoRef = doc(collection(db, `comercios/${comercioId}/turnos`));
//         batch.set(nuevoRef, {
//           nombre: `SOBRETURNO ${pos}`,
//           telefono: "",
//           posicion: pos,
//           especial: false,
//           sobreturno: true,
//           ocupado: false,
//           cancelado: false,
//           timestamp: serverTimestamp(),
//         });
//       }
//     }
//     await batch.commit();

//     res.json({ success: true, posicion: nuevaPosicion });
//   } catch (error) {
//     console.error("Error agregarTurno:", error);
//     res.status(500).json({ error: "Error interno" });
//   }
// };

// // Puedes agregar aquí avanzarTurno, cancelarTurno, ocuparSobreturno cuando quieras


// ================================================================
// ================================================================

// controllers/turnos.controller.js
const admin = require('firebase-admin');
const db = require('../firebase-admin');





exports.getTurnos = async (req, res) => {
  const { comercio } = req.query;
  if (!comercio) return res.status(400).json({ error: 'comercio requerido' });

  try {
    const snapshot = await db.collection(`comercios/${comercio}/turnos`)
      .orderBy('posicion')
      .get();

    const turnos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(turnos);
  } catch (error) {
    console.error('Error getTurnos:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

exports.agregarTurno = async (req, res) => {
  const { comercioId, nombre, telefono, especial } = req.body;

  if (!comercioId || !nombre || !telefono) {
    return res.status(400).json({ error: "Faltan datos requeridos" });
  }

  try {
    // Obtener turnos actuales (con ID incluido)
    const turnosSnap = await db.collection(`comercios/${comercioId}/turnos`)
      .orderBy('posicion')
      .get();

    const turnos = turnosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const posiciones = turnos.filter(t => !t.sobreturno).map(t => t.posicion);
    const nuevaPosicion = posiciones.length ? Math.max(...posiciones) + 1 : 1;

    // Agregar el nuevo turno
    const nuevoRef = db.collection(`comercios/${comercioId}/turnos`).doc();
    await nuevoRef.set({
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      posicion: nuevaPosicion,
      especial: !!especial,
      sobreturno: false,
      ocupado: false,
      cancelado: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Regenerar sobreturnos
    const batch = db.batch();

    // Borrar sobreturnos libres (ahora con ID)
    const sobreturnosLibres = turnos.filter(t => t.sobreturno && !t.ocupado);
    sobreturnosLibres.forEach(t => {
      if (t.id) {
        batch.delete(db.collection(`comercios/${comercioId}/turnos`).doc(t.id));
      }
    });

    // Crear nuevos sobreturnos
    const clientes = turnos.filter(t => !t.sobreturno).sort((a, b) => a.posicion - b.posicion);
    for (let i = 0; i < clientes.length - 1; i++) {
      const pos = clientes[i].posicion + 0.5;
      const yaExiste = turnos.some(t => t.sobreturno && Math.abs(t.posicion - pos) < 0.01);
      if (!yaExiste) {
        const nuevoSobRef = db.collection(`comercios/${comercioId}/turnos`).doc();
        batch.set(nuevoSobRef, {
          nombre: `SOBRETURNO ${pos}`,
          telefono: "",
          posicion: pos,
          especial: false,
          sobreturno: true,
          ocupado: false,
          cancelado: false,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    await batch.commit();

    // Devolver nombre del comercio
    const comercioDoc = await db.collection('comercios').doc(comercioId).get();
    const nombreComercio = comercioDoc.exists ? comercioDoc.data().nombreComercio : null;

    res.json({ 
      success: true, 
      posicion: nuevaPosicion,
      nombreComercio 
    });
  } catch (error) {
    console.error("Error en POST /turnos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};


// exports.avanzarTurno = async (req, res) => {
//   const { comercioId } = req.body;

//   if (!comercioId) {
//     return res.status(400).json({ error: "comercioId requerido" });
//   }

//   try {
//     // 1. Obtener todos los turnos activos ordenados por posición
//     const turnosSnap = await db.collection(`comercios/${comercioId}/turnos`)
//       .where('cancelado', '==', false)
//       .where('sobreturno', '==', false) // Solo turnos normales
//       .orderBy('posicion')
//       .get();

//     if (turnosSnap.empty) {
//       return res.status(400).json({ error: "No hay turnos para avanzar" });
//     }

//     const turnos = turnosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

//     // 2. El turno actual (el primero no ocupado)
//     const turnoActual = turnos.find(t => !t.ocupado);

//     if (!turnoActual) {
//       return res.status(400).json({ error: "No hay turno en atención" });
//     }

//     const batch = db.batch();

//     // 3. Marcar el turno actual como ocupado (o eliminado, según tu lógica)
//     // Opción A: marcar como ocupado
//     batch.update(db.collection(`comercios/${comercioId}/turnos`).doc(turnoActual.id), {
//       ocupado: true,
//       atendidoEn: admin.firestore.FieldValue.serverTimestamp(),
//     });

//     // Opción B: eliminarlo directamente (si querés que desaparezca de la lista)
//     // batch.delete(db.collection(`comercios/${comercioId}/turnos`).doc(turnoActual.id));

//     // 4. Opcional: regenerar sobreturnos (si tu lógica lo necesita después de avanzar)
//     // Podés llamar a la misma lógica que tenés en agregarTurno, o moverla a una función separada
//     // Por ahora lo dejamos como regeneración simple (igual que en agregarTurno)
//     const clientes = turnos.filter(t => !t.sobreturno && !t.ocupado);
//     const sobreturnosLibres = turnos.filter(t => t.sobreturno && !t.ocupado);

//     // Borrar sobreturnos libres
//     sobreturnosLibres.forEach(t => {
//       if (t.id) {
//         batch.delete(db.collection(`comercios/${comercioId}/turnos`).doc(t.id));
//       }
//     });

//     // Crear nuevos sobreturnos entre clientes
//     for (let i = 0; i < clientes.length - 1; i++) {
//       const pos = clientes[i].posicion + 0.5;
//       const yaExiste = turnos.some(t => t.sobreturno && Math.abs(t.posicion - pos) < 0.01);
//       if (!yaExiste) {
//         const nuevoSobRef = db.collection(`comercios/${comercioId}/turnos`).doc();
//         batch.set(nuevoSobRef, {
//           nombre: `SOBRETURNO ${pos}`,
//           telefono: "",
//           posicion: pos,
//           especial: false,
//           sobreturno: true,
//           ocupado: false,
//           cancelado: false,
//           timestamp: admin.firestore.FieldValue.serverTimestamp(),
//         });
//       }
//     }

//     await batch.commit();

//     res.json({ 
//       success: true, 
//       message: "Turno avanzado correctamente",
//       turnoAtendido: turnoActual.id 
//     });
//   } catch (error) {
//     console.error("Error al avanzar turno:", error);
//     res.status(500).json({ error: "Error interno del servidor" });
//   }
// };

exports.avanzarTurno = async (req, res) => {
  const { comercioId } = req.body;

  console.log(`[avanzarTurno] Inicio - comercioId: ${comercioId}`);

  if (!comercioId) {
    console.log('[avanzarTurno] Error: falta comercioId');
    return res.status(400).json({ error: "comercioId requerido" });
  }

  try {
    console.log(`[avanzarTurno] Consultando subcolección: comercios/${comercioId}/turnos`);

    const turnosSnap = await db.collection(`comercios/${comercioId}/turnos`)
      .where('cancelado', '==', false)
      .where('sobreturno', '==', false)
      .orderBy('posicion')
      .get();

    console.log(`[avanzarTurno] Turnos encontrados: ${turnosSnap.size}`);

    if (turnosSnap.empty) {
      console.log('[avanzarTurno] No hay turnos válidos para avanzar');
      return res.status(400).json({ error: "No hay turnos para avanzar" });
    }

    const turnos = turnosSnap.docs.map(doc => {
      const data = doc.data();
      console.log(`[avanzarTurno] Turno ID ${doc.id}:`, data);
      return { id: doc.id, ...data };
    });

    const turnoActual = turnos.find(t => !t.ocupado);
    if (!turnoActual) {
      console.log('[avanzarTurno] Ningún turno sin ocupar');
      return res.status(400).json({ error: "No hay turno en atención" });
    }

    console.log(`[avanzarTurno] Avanzando turno: ${turnoActual.id} (pos: ${turnoActual.posicion})`);

    const batch = db.batch();

    const turnoRef = db.collection(`comercios/${comercioId}/turnos`).doc(turnoActual.id);
    batch.update(turnoRef, {
      ocupado: true,
      atendidoEn: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('[avanzarTurno] Actualizando turno actual como ocupado');

    // Regeneración de sobreturnos (simplificada para debug)
    // ... tu código de sobreturnos aquí ...

    console.log('[avanzarTurno] Ejecutando batch.commit()');
    await batch.commit();

    console.log('[avanzarTurno] ÉXITO');
    res.json({ success: true, message: "Turno avanzado correctamente" });
  } catch (error) {
    console.error('[avanzarTurno] ERROR COMPLETO:', error);
    console.error(error.stack);
    res.status(500).json({ 
      error: "Error interno del servidor",
      details: error.message 
    });
  }
};





// ... resto de funciones (avanzarTurno, cancelarTurno, ocuparSobreturno, limpiarTurnos) ...