import React, { useState } from 'react';

export default function BarraAcciones({ produccion, reportes, setMostrarModal }) {
  const [menuCargasAbierto, setMenuCargasAbierto] = useState(false);
  const colaFiltrada = produccion.colaCargas.filter(c => c.tipo === produccion.tipoPintura);

  const handleImportExcelProgreso = async (e) => {
    const idIntervalo = reportes.simularProgreso();
    try {
      await produccion.handleImportExcel(e);
      reportes.setProgreso(100);
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      clearInterval(idIntervalo);
      setTimeout(() => reportes.setProgreso(0), 600);
      setMenuCargasAbierto(false);
    }
  };

  return (
    <div className="botones-cargas">
      <button className="agregar-btn" onClick={produccion.agregarCargaManual}>+ Agregar Carga</button>
      
      <div className="dropdown-container">
        <button className="agregar-btn secondary" onClick={() => setMenuCargasAbierto(!menuCargasAbierto)}>
          📂 Gestión ({colaFiltrada.length})
        </button>
        {menuCargasAbierto && (
          <div className="dropdown-menu">
            <button className="dropdown-item" onClick={() => { setMostrarModal(true); setMenuCargasAbierto(false); }}>📋 Lista Espera</button>
            <label className="dropdown-item label-input">
              📊 Importar Excel 
              <input type="file" hidden accept=".xlsx, .xls" onChange={handleImportExcelProgreso} />
            </label>
          </div>
        )}
      </div>

      <label className="agregar-btn btn-pdf">
        📄 PDF <input type="file" hidden accept=".pdf" onChange={reportes.handlePdfClick} />
      </label>
      
      <button className="agregar-btn btn-reporte" onClick={reportes.handleReporteClick}>📊 Reporte</button>
    </div>
  );
}