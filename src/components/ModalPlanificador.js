import React from 'react';
import '../styles/ModalPlanificador.css'; 

export default function ModalPlanificador({ 
    visible, 
    datos, 
    onClose, 
    onSelectCode, 
    onClear,
    onGuardarEnBD,
    guardandoBD,
    yaGuardadoEnBD
}) {
    if (!visible || !datos || !datos.data) return null;

    return (
        <div className="pl-modal-overlay">
            <div className="pl-modal-container">
                <div className="pl-modal-header">
                    <div className="pl-header-left">
                        <span className="pl-header-icon">📋</span>
                        <div>
                            <h2>Planificador de Producción</h2>
                        
                        </div>
                    </div>
                    <button className="pl-btn-x" onClick={onClose}>&times;</button>
                </div>

                <div className="pl-modal-body">
                    <div className="pl-table-scroll">
                        <table className="pl-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Color</th>
                                    <th className="pl-text-center">Articulo</th>
                                    <th className="pl-text-center">Salidas</th>
                                    <th className="pl-text-center">Existencia Actual</th>
                                    <th className="pl-text-center">Alcance (Días)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {datos.data.map((item, i) => (
                                    <tr key={i} className={item.alcance === 0 ? 'pl-row-critical' : ''}>
                                        <td className="pl-col-min">{i + 1}</td>
                                        <td className="pl-col-bold">{item.color}</td>
                                        <td className="pl-col-bold">{item.articulo}</td>                                      
                                        <td className="pl-text-center">{item.salidas}</td>
                                        <td className="pl-text-center">{item.existencia}</td>
                                        <td className="pl-text-center font-bold">
                                            {item.alcance.toFixed(0)}
                                        </td>
                                       
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="pl-modal-footer">
                    <button 
                        className="pl-btn-guardar-bd" 
                        onClick={onGuardarEnBD}
                        disabled={guardandoBD || yaGuardadoEnBD}
                        style={{
                            background: yaGuardadoEnBD ? '#6b7280' : (guardandoBD ? '#6b7280' : '#10b981'),
                            cursor: (guardandoBD || yaGuardadoEnBD) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {yaGuardadoEnBD ? '✅ Ya guardado' : (guardandoBD ? '💾 Guardando...' : '💾 Guardar en BD')}
                    </button>
                    <button className="pl-btn-clear" onClick={onClear}>Vaciar Planificador</button>
                    <button className="pl-btn-close-modal" onClick={onClose}>Cerrar</button>
                </div>
            </div>
        </div>
    );
}