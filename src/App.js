import React from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";

// Screens (Pantallas Principales)
import ProduccionScreen from "./screens/ProduccionScreen";
import MantenimientoScreen from "./screens/MantenimientoScreen";
import OperariosScreen from "./screens/OperariosScreen";
import { VistaFamiliasScreen } from "./components/VistaFamiliasScreen";
import { VistaProductosFamilia } from "./components/ExploradorFamilias";
import CodigosScreen from "./screens/CodigosScreen";
import FamiliasGestionScreen from "./screens/FamiliasGestionScreen";
import CriticosScreen from "./screens/CriticosScreen.js";
import FormulasScreen from "./screens/FormulasScreen.js";
import MateriasPrimasScreen from "./screens/MateriasPrimasScreen";
import FamiliaProductosScreen from "./screens/FamiliaProductosScreen";
import BasesScreen from './screens/BasesScreen';


// Wrapper para el detalle de familias (MEJORADO)
function FamiliaDetalleWrapper() {
  const navigate = useNavigate();
  const location = useLocation();

  // Obtener los datos pasados desde VistaFamiliasScreen
  const { familias, tipoPintura, returnTo } = location.state || {};

  return (
    <div className="familias-full-screen">
      <div className="header-info">
        <button
          className="btn-back"
          onClick={() => {
            // Regresar CON los datos para que VistaFamiliasScreen los reciba
            navigate("/familias", {
              state: {
                familias: familias,
                tipoPintura: tipoPintura
              }
            });
          }}
        >
          ← Volver
        </button>
      </div>
      <VistaProductosFamilia
        familias={familias}  // Pasar las familias al componente hijo
        tipoPintura={tipoPintura}
        onSelect={() => navigate("/")}
      />
    </div>
  );
}

// Wrapper para VistaFamiliasScreen que maneja el estado
function FamiliasWrapper() {
  const location = useLocation();
  const navigate = useNavigate();

  // Si no hay state, intentar recuperar de sessionStorage
  let { familias, tipoPintura } = location.state || {};

  if (!familias || familias.length === 0) {
    const stored = sessionStorage.getItem('familiasData');
    if (stored) {
      const parsed = JSON.parse(stored);
      familias = parsed.familias;
      tipoPintura = parsed.tipoPintura;
    }
  }

  return (
    <VistaFamiliasScreen
      familias={familias || []}
      tipoPintura={tipoPintura || "Vinílica"}
    />
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ProduccionScreen />} />

        {/* Rutas de Mantenimiento */}
        <Route path="/mantenimiento" element={<MantenimientoScreen />} />
        <Route path="/mantenimiento/operarios" element={<OperariosScreen />} />
        <Route path="/mantenimiento/codigos" element={<CodigosScreen />} />
        <Route path="/mantenimiento/criticos" element={<CriticosScreen />} />
        <Route path="/mantenimiento/formulas" element={<FormulasScreen />} />
        <Route path="/mantenimiento/materias-primas" element={<MateriasPrimasScreen />} />
        <Route path="/familia/:id" element={<FamiliaProductosScreen />} />
        <Route path="/bases" element={<BasesScreen />} />
        <Route path="/mantenimiento/familias" element={<FamiliasGestionScreen />} />
        {/* RUTAS: Explorador de Familias */}
        <Route path="/familias" element={<FamiliasWrapper />} />
        <Route path="/familia/:idFamilia" element={<FamiliaDetalleWrapper />} />

        <Route path="*" element={<ProduccionScreen />} />
      </Routes>
    </Router>
  );
}