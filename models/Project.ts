import mongoose from "mongoose";

export interface IProject {
  _id: string;
  userId: string;
  projectName: string;
  budget: number;
  timeline: number;
  description: string;
  status: "draft" | "in-review" | "approved" | "rejected";
  analysis?: {
    score: number;
    risks: string[];
    recommendations: string[];
  };
  createdAt: Date;
  updatedAt?: Date;
}

const ProjectSchema = new mongoose.Schema<IProject>({
  _id: { 
    type: String, 
    required: true 
  },
  userId: { 
    type: String, 
    required: true,
    index: true 
  },
  projectName: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200 
  },
  budget: { 
    type: Number, 
    required: true,
    min: 0,
    max: 1000000000 
  },
  timeline: { 
    type: Number, 
    required: true,
    min: 1,
    max: 365 
  },
  description: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 5000 
  },
  status: {
    type: String,
    enum: ["draft", "in-review", "approved", "rejected"],
    default: "draft",
  },
  analysis: {
    score: { 
      type: Number, 
      min: 0, 
      max: 100 
    },
    risks: [String],
    recommendations: [String],
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date 
  },
});

// Indexes for better query performance
ProjectSchema.index({ userId: 1, createdAt: -1 });
ProjectSchema.index({ userId: 1, status: 1 });

// Update the updatedAt timestamp on save
ProjectSchema.pre("save", function (next) {
  if (!this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

export default mongoose.models.Project || 
  mongoose.model<IProject>("Project", ProjectSchema);

