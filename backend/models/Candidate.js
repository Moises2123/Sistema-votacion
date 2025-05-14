// models/Candidate.js
import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    votes: { type: Number, default: 0 }
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Candidate", candidateSchema);