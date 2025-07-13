import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import CreateRoomPage from "./pages/CreateRoomPage.jsx"; // 你等会儿要创建的页面
import "./index.css";
import PlayerConfigPage from "./pages/PlayerConfigPage.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/create" element={<CreateRoomPage />} />
        <Route path="/players" element={<PlayerConfigPage />} />;
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
