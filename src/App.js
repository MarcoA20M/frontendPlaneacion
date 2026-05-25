import React from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";

// Screens (Pantallas Principales)
import ProduccionScreen from "./screens/ProduccionScreen";
import MantenimientoScreen from "./screens/MantenimientoScreen";
import OperariosScreen from "./screens/OperariosScreen"; // <-- IMPORTANTE

// Componentes de Familias
import { VistaFamiliasScreen } from "./components/VistaFamiliasScreen";
import { VistaProductosFamilia } from "./components/ExploradorFamilias";

// Wrapper para el detalle de familias
function FamiliaDetalleWrapper() {
  const navigate = useNavigate();
  return (
    <div className="familias-full-screen">
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
        
        {/* Rutas de Mantenimiento */}
        <Route path="/mantenimiento" element={<MantenimientoScreen />} />
        <Route path="/mantenimiento/operarios" element={<OperariosScreen />} /> {/* <-- NUEVA RUTA */}

        {/* RUTAS: Explorador de Familias */}
        <Route path="/familias" element={
          <div className="familias-full-screen">
            <VistaFamiliasScreen />
          </div>
        } />

        <Route path="/familia/:idFamilia" element={<FamiliaDetalleWrapper />} />

        <Route path="*" element={<ProduccionScreen />} />
      </Routes>
    </Router>
  );
}