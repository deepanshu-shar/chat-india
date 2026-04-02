export default function ChatWindow() {
  return (
    <div className="w-2/3 bg-gray-50 flex flex-col">

      {/* Chat Header */}
      <div className="flex items-center p-4 bg-white border-b border-gray-300">
        <div className="w-10 h-10 bg-green-400 rounded-full mr-3"></div>
        <div>
          <p className="font-semibold">Rohan</p>
          <p className="text-xs text-gray-500">Online</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* Received Message */}
        <div className="flex mb-3">
          <div className="bg-white p-3 rounded-lg shadow-sm max-w-xs">
            <p className="text-sm">Kya haal hai bhai?</p>
            <p className="text-xs text-gray-400 text-right">10:30</p>
          </div>
        </div>

        {/* Sent Message */}
        <div className="flex justify-end mb-3">
          <div className="bg-green-100 p-3 rounded-lg shadow-sm max-w-xs">
            <p className="text-sm">Sab badhiya!</p>
            <p className="text-xs text-gray-400 text-right">10:31</p>
          </div>
        </div>

      </div>

      {/* Message Input */}
      <div className="flex items-center p-3 bg-white border-t border-gray-300">
        <input
          type="text"
          placeholder="Message likho..."
          className="flex-1 p-2 rounded-full bg-gray-100 outline-none text-sm px-4"
        />
        <button className="ml-3 bg-green-600 text-white p-2 rounded-full w-10 h-10 flex items-center justify-center">
          ➤
        </button>
      </div>

    </div>
  )
}