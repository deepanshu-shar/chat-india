export default function Sidebar() {
  return (
    <div className="w-1/3 bg-white border-r border-gray-300 flex flex-col">

      {/* Sidebar Header */}
      <div className="p-4 bg-green-600">
        <h1 className="text-white text-xl font-bold">Chat India 🇮🇳</h1>
      </div>

      {/* Search Bar */}
      <div className="p-2 bg-gray-100">
        <input
          type="text"
          placeholder="Search ya new chat"
          className="w-full p-2 rounded-lg bg-white text-sm outline-none"
        />
      </div>

      {/* Chat List */}
      <div className="overflow-y-auto flex-1">
        <div className="flex items-center p-3 hover:bg-gray-100 cursor-pointer border-b">
          <div className="w-12 h-12 bg-green-400 rounded-full mr-3"></div>
          <div>
            <p className="font-semibold">Rohan</p>
            <p className="text-sm text-gray-500">Kya haal hai?</p>
          </div>
          <p className="text-xs text-gray-400 ml-auto">10:30</p>
        </div>
      </div>

    </div>
  )
}