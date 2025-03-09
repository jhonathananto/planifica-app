const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a MongoDB sin opciones obsoletas
mongoose.connect('mongodb://administrador:admin123@localhost:27017/planificacion_docente?authMechanism=DEFAULT')
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('No se pudo conectar a MongoDB', err));

// Esquema y modelo de Syllabus
const SyllabusSchema = new mongoose.Schema({
    NombreAsignatura: String,
    CodigoAsignatura: String,
    Carrera: String,
});

const Syllabus = mongoose.model('Syllabus', SyllabusSchema, 'Syllabus');

// Esquema y modelo de Docentes
const DocenteSchema = new mongoose.Schema({
    _id: String,
    titulo: String,
    nombres: String,
    apellidos: String,
    nombre_completo: String,
    abreviatura: String,
});

const Docente = mongoose.model('Docentes', DocenteSchema, 'Docentes');

// Ruta para obtener todos los syllabus
app.get('/api/syllabus', async (req, res) => {
    try {
        const syllabus = await Syllabus.find();
        res.json(syllabus);
    } catch (error) {
        res.status(500).json({
            message: 'Error al obtener los syllabus',
            error
        });
    }
});

// Ruta para obtener todos los docentes
app.get('/api/docentes', async (req, res) => {
    try {
        const docentes = await Docente.find();
        res.json(docentes);
    } catch (error) {
        res.status(500).json({
            message: 'Error al obtener los docentes',
            error
        });
    }
});

// Iniciar el servidor
app.listen(3000, () => {
    console.log('Backend running on http://localhost:3000');
});