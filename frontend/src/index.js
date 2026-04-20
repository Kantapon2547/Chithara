import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { PlayerProvider } from "./context/PlayerContext";
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <BrowserRouter>
    <PlayerProvider>
      <ToastProvider>
       <AuthProvider>
        <App />
       </AuthProvider>
      </ToastProvider>
    </PlayerProvider>
  </BrowserRouter>
);