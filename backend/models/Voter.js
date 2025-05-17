import mongoose from "mongoose";

const voterSchema = new mongoose.Schema(
  {
    identifier: { type: String, required: true, unique: true }, // Ej: número de documento, correo, etc.
    hasVoted: { type: Boolean, default: false },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", default: null }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Voter", voterSchema);