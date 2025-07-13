import { useNavigate } from "react-router-dom";

function App() {
  const navigate = useNavigate();

  console.log("App loaded");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 to-purple-200">
      <h1 className="text-4xl font-extrabold text-indigo-700 mb-4">
        狼人杀主持助手
      </h1>
      <p className="text-gray-600 text-lg mb-6">
        让每一位玩家轻松上手成为“上帝”
      </p>
      <button
        onClick={() => navigate("/create")}
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xl font-semibold rounded-xl transition"
      >
        创建房间
      </button>
    </div>
  );
}

export default App;
