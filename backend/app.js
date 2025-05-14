import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import Candidate from "./models/candidate.js";
import Voter from "./models/Voter.js";

// Configuración
dotenv.config();
const app = express();
const { MONGO_URI, PORT = 3000 } = process.env;

// Middleware
app.use(express.json());
app.use(cors());

// Conexión a MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Conectado a la base de datos"))
  .catch((err) => console.log("Error al conectar a la base de datos", err));

// RUTAS PARA CANDIDATOS
// Crear candidato
app.post("/candidates", async (req, res) => {
  try {
    const candidate = new Candidate(req.body);
    const savedCandidate = await candidate.save();
    res.status(201).json(savedCandidate);
  } catch (error) {
    res.status(400).json({ message: "Error al crear candidato", error });
  }
});

// Obtener todos los candidatos
app.get("/candidates", async (req, res) => {
  try {
    const candidates = await Candidate.find();
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener candidatos", error });
  }
});

// RUTAS PARA VOTANTES
// Registrar votante
app.post("/voters", async (req, res) => {
  try {
    const voter = new Voter(req.body);
    const savedVoter = await voter.save();
    res.status(201).json(savedVoter);
  } catch (error) {
    res.status(400).json({ message: "Error al registrar votante", error });
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
    res.status(500).json({ message: "Error al verificar votante", error });
  }
});

// VOTAR
app.post("/vote", async (req, res) => {
  const { voterId, candidateId } = req.body;

  if (!voterId || !candidateId) {
    return res.status(400).json({ message: "Se requiere ID del votante y del candidato" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Verificar si el votante existe y no ha votado
    const voter = await Voter.findOne({ identifier: voterId }).session(session);
    if (!voter) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Votante no encontrado" });
    }

    if (voter.hasVoted) {
      await session.abortTransaction();
      return res.status(400).json({ message: "El votante ya ha emitido su voto" });
    }

    // Verificar si el candidato existe
    const candidate = await Candidate.findById(candidateId).session(session);
    if (!candidate) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Candidato no encontrado" });
    }

    // Incrementar votos del candidato
    candidate.votes += 1;
    await candidate.save({ session });

    // Marcar al votante como votado
    voter.hasVoted = true;
    voter.candidate = candidateId;
    await voter.save({ session });

    await session.commitTransaction();
    res.status(200).json({ message: "Voto registrado con éxito" });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: "Error al procesar el voto", error });
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
    res.status(500).json({ message: "Error al obtener resultados", error });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});