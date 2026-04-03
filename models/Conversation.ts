import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema({
  isGroup: {
    type: Boolean,
    default: false,
  },
  groupName: {
    type: String,
    default: "",
  },
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }
  ],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
    default: null,
  },
  lastMessageTime: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

const Conversation = mongoose.models.Conversation || mongoose.model("Conversation", ConversationSchema);

export default Conversation;