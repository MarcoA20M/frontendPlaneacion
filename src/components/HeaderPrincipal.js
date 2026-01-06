import React from 'react';

export default function HeaderPrincipal({ tipoPintura, setTipoPintura, fechaTrabajo, setFechaTrabajo }) {
  const moverSemana = (offset) => {
    const nueva = new Date(fechaTrabajo);
    nueva.setDate(nueva.getDate() + (offset * 7));
    setFechaTrabajo(nueva);
  };

  return (
    <div className="header-panel">
      <div className="titulo-app">
        <h1>Gestión de Pinturas</h1>
        {tipoPintura === "Vinílica" && (
          <div className="planificador-semanal">
            <button onClick={() => moverSemana(-1)}>◀</button>
            <div className="fecha-actual-view">
              <strong>Semana:</strong> {fechaTrabajo.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </div>
            <button onClick={() => moverSemana(1)}>▶</button>
            <button className="btn-hoy-reset" onClick={() => setFechaTrabajo(new Date())}>Hoy</button>
          </div>
        )}
      </div>

      <div className="selector-tipo">
        {["Vinílica", "Esmalte"].map(t => (
          <button key={t} className={tipoPintura === t ? "active" : ""} onClick={() => setTipoPintura(t)}>{t}</button>
        ))}
      </div>
    </div>
  );
}