import React from 'react';

const PanelEspeciales = ({ 
    cargasEspeciales, 
    mostrarEspeciales, 
    setMostrarEspeciales, 
    handleDragStart, 
    seleccionarCarga 
}) => {
    if (cargasEspeciales.length === 0) return null;

    return (
        <div className="contenedor-especiales-premium">
            <div className="header-especial" onClick={() => setMostrarEspeciales(!mostrarEspeciales)}>
                <div className="titulo-especial">
                    <span className="alarma-dot"></span>
                    ESPECIALES PENDIENTES ({cargasEspeciales.length})
                </div>
                <button className="toggle-view-btn">{mostrarEspeciales ? 'OCULTAR' : 'VER'}</button>
            </div>
            {mostrarEspeciales && (
                <div className="grid-especial-premium">
                    {cargasEspeciales.map((c, i) => (
                        <div
                            key={i}
                            className="card-especial-v2"
                            draggable
                            onDragStart={(e) => handleDragStart(e, { tipo: 'especial', index: i })}
                            onClick={() => seleccionarCarga(c)}
                        >
                            <div className="card-header-ex">
                                <span className="code-badge">{c.codigoProducto}</span>
                                <span className="litros-badge">Lote: {c.folio}</span>
                            </div>
                            <div className="card-body-ex">{c.descripcion}</div>
                            <div className="card-footer-ex">
                                Cubriente: <strong>{c.nivelCubriente}</strong> | {c.litros.toFixed(1)} L
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PanelEspeciales;