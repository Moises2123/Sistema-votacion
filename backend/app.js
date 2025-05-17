import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import Candidate from "./models/candidate.js";
import Voter from "./models/Voter.js";

// Configuración para __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sistema-votacion";

// Middleware
app.use(express.json());
app.use(cors());

// Servir archivos estáticos desde el directorio frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Ruta principal (index.html)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Conexión a MongoDB
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
  })
  .then(() => console.log("✅ Conectado a la base de datos MongoDB"))
  .catch((err) => {
    console.error("❌ Error al conectar a la base de datos MongoDB:", err);
    console.log("\n🔍 Soluciones posibles:");
    console.log("1. Verifica que MongoDB esté instalado y ejecutándose");
    console.log("2. Asegúrate de haber creado el archivo .env con MONGO_URI");
    console.log("3. Prueba usar MongoDB Atlas como alternativa");
  });

// RUTAS API
// Crear candidato
app.post("/candidates", async (req, res) => {
  try {
    const candidate = new Candidate(req.body);
    const savedCandidate = await candidate.save();
    res.status(201).json(savedCandidate);
  } catch (error) {
    res.status(400).json({ message: "Error al crear candidato", error: error.message });
  }
});

// Obtener todos los candidatos
app.get("/candidates", async (req, res) => {
  try {
    const candidates = await Candidate.find();
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener candidatos", error: error.message });
  }
});

// Registrar votante
app.post("/voters", async (req, res) => {
  try {
    const voter = new Voter(req.body);
    const savedVoter = await voter.save();
    res.status(201).json(savedVoter);
  } catch (error) {
    res.status(400).json({ message: "Error al registrar votante", error: error.message });
  }
});

// Verificar si un votante ya votó
app.get("/voters/:identifier", async (req, res) => {
  try {
    const voter = await Voter.findOne({ identifier: req.params.identifier });
    if (!voter) {
      return res.status(404).json({ message: "Votante no encontrado" });
    }
    res.json({ hasVoted: voter.hasVoted });
  } catch (error) {
    res.status(500).json({ message: "Error al verificar votante", error: error.message });
  }
});

// VOTAR
app.post('/vote', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { voterId, candidateId } = req.body;

    // Verifica si el votante existe y no ha votado
    const voter = await Voter.findOne({ identifier: voterId }).session(session);
    if (!voter) {
      return res.status(404).json({ message: 'Votante no encontrado' });
    }

    if (voter.hasVoted) {
      return res.status(400).json({ message: 'El votante ya ha emitido su voto' });
    }

    // Verifica si el candidato existe
    const candidate = await Candidate.findById(candidateId).session(session);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidato no encontrado' });
    }

    // Registra el voto
    voter.hasVoted = true;
    voter.candidate = candidateId;
    await voter.save({ session });

    candidate.votes += 1;
    await candidate.save({ session });

    // Commit de la transacción
    await session.commitTransaction();

    return res.status(200).json({ message: 'Voto emitido correctamente' });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error al procesar el voto:', error);
    return res.status(500).json({ message: 'Error al procesar el voto' });
  } finally {
    session.endSession();
  }
});

// Obtener resultados
app.get("/results", async (req, res) => {
  try {
    const candidates = await Candidate.find().sort({ votes: -1 });
    const winner = candidates.length > 0 ? candidates[0] : null;

    res.json({
      candidates,
      winner
    });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener resultados", error: error.message });
  }
});

// Manejar todas las demás rutas y redirigir al index.html para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
  console.log(`📊 Sistema de votación disponible en http://localhost:${PORT}`);
});
  