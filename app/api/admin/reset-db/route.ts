import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Message from "@/models/Message";
import Conversation from "@/models/Conversation";

async function resetDatabase() {
  console.log("🔄 Database reset started...");

  await connectDB();
  console.log("✅ Connected to DB");

  // Delete conversations
  console.log("🗑️  Deleting conversations...");
  const convResult = await Conversation.deleteMany({});
  console.log(`✅ Deleted ${convResult.deletedCount} conversations`);

  // Delete messages
  console.log("🗑️  Deleting messages...");
  const msgResult = await Message.deleteMany({});
  console.log(`✅ Deleted ${msgResult.deletedCount} messages`);

  // Delete users
  console.log("🗑️  Deleting users...");
  const userResult = await User.deleteMany({});
  console.log(`✅ Deleted ${userResult.deletedCount} users`);

  const result = {
    message: "✅ Database reset complete!",
    deleted: {
      users: userResult.deletedCount || 0,
      messages: msgResult.deletedCount || 0,
      conversations: convResult.deletedCount || 0,
    },
  };

  console.log("🎉 Reset done:", result);
  return result;
}

export async function GET(request: Request) {
  try {
    const result = await resetDatabase();
    return Response.json(result, { status: 200 });
  } catch (error: any) {
    console.error("❌ Reset error:", error);
    return Response.json(
      {
        message: "Reset fail ho gaya",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const result = await resetDatabase();
    return Response.json(result, { status: 200 });
  } catch (error: any) {
    console.error("❌ Reset error:", error);
    return Response.json(
      {
        message: "Reset fail ho gaya",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
