const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["super_admin", "admin", "manager", "developer"],
      default: "developer",
    },
    // Multi-tenancy: Every non-admin user must belong to an Admin's workspace
    adminRef: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    
    // Billing & Limits (Only applicable if role is 'admin')
    maxUsersLimit: {
      type: Number,
      default: 3,
    },
    subscriptionTier: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },
    totalUsersCreated: {
      type: Number,
      default: 0,
    },

    mobileNumber: String,
    department: {
      type: String,
    },
    jobDescription: String,
    companyName: String,
    profileImage: String,
    companyLogo: String,
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "light",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      index: true,
    },
    emailVerificationExpires: {
      type: Date,
    },

    resetPasswordToken: {
      type: String,
      index: true, 
    },
    resetPasswordExpires: {
      type: Date,
    },

    googleId: {
      type: String,
      sparse: true,
    },

    lastLogin: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpires;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpires;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for reset password queries
userSchema.index({ resetPasswordToken: 1, resetPasswordExpires: 1 });
userSchema.index({ emailVerificationToken: 1, emailVerificationExpires: 1 });
userSchema.index({ adminRef: 1 });
userSchema.index({ adminRef: 1, manager: 1 });

const User = mongoose.model("User", userSchema);
module.exports = User;
