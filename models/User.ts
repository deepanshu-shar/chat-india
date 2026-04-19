// models/User.ts
//
// CHANGES FROM ORIGINAL:
// + publicKey          → dusre users ko dikhta hai (encrypt karne ke liye chahiye)
// + encryptedPrivateKey → sirf owner ko, naye device pe recover karne ke liye
//
// publicKey kyu store karna? 
// Jab A, B ko message kare → A ko B ki public key chahiye shared secret ke liye.
// Server pe stored hai → API se fetch karo.
//
// encryptedPrivateKey kyu store karna?
// Naye device pe login karo → IndexedDB empty → private key kahan se aayegi?
// Server pe hai (PIN se encrypted) → PIN dalo → decrypt karo → kaam shuru.

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  publicKey?: string;           // Base64 encoded Curve25519 public key
  encryptedPrivateKey?: string; // PIN-encrypted private key (Base64)
}

const UserSchema = new Schema<IUser>(
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
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    // ── E2EE FIELDS ──────────────────────────────────────────────
    publicKey: {
      type: String,
      default: null,
      // Index nahi lagana — sirf userId se fetch hoga
    },
    encryptedPrivateKey: {
      type: String,
      default: null,
      // Ye field sirf logged-in user ke liye API expose karega
      // Dusron ko kabhi mat bhejo
    },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
