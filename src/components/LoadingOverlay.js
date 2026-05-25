import React from "react";

const LoadingOverlay = ({ cargando, procesandoPdf, procesandoReporte, progreso }) => {
  if (!cargando && !procesandoPdf && !procesandoReporte) return null;

  const getMensaje = () => {
    if (cargando) return "Analizando Excel...";
    if (procesandoPdf) return "Generando PDF...";
    return "Generando Reporte Final...";
  };

  return (
    <div className="loading-overlay">
      <div className="overlay-content">
        <div className="spinner-large"></div>
        <h3>{getMensaje()}</h3>
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progreso}%` }}></div>
        </div>
        <div className="percentage-display">{progreso}%</div>
      </div>
    </div>
  );
};

export default LoadingOverlay;