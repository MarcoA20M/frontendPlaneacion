import React from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import ProduccionScreen from "./screens/ProduccionScreen";
import { VistaFamiliasScreen } from "./components/VistaFamiliasScreen";
import { VistaProductosFamilia } from "./components/ExploradorFamilias";

function FamiliaDetalleWrapper() {
  const navigate = useNavigate();
  return (
    <div className="familias-full-screen"> {/* Usa su propio fondo */}
      <div className="header-info">
        <button className="btn-back" onClick={() => navigate("/familias")}>← Volver</button>
      </div>
      <VistaProductosFamilia onSelect={() => navigate("/")} />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ProduccionScreen />} />
        
        <Route path="/familias" element={
          <div className="familias-full-screen">
            <VistaFamiliasScreen />
          </div>
        } />

        <Route path="/familia/:idFamilia" element={<FamiliaDetalleWrapper />} />
      </Routes>
    </Router>
  );
}