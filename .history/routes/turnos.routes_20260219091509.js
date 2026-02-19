// routes/turnos.routes.js
const express = require('express');
const router = express.Router();
const { getTurnos, agregarTurno } = require('../controllers/turnos.controller');

router.get('/', getTurnos);
router.post('/', agregarTurno);
router.post('/avanzar', avanzarTurno);

module.exports = router;