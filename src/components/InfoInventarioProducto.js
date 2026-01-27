import React from "react";
import { litrosPorEnvasado, litrosATexto } from "../constants/config";
import "../styles/InfoInventarioProducto.css";

const InfoInventarioProducto = ({ producto, cantidades, setCantidades, totalLitrosActuales }) => {
    
    const extraerLitrosDeArticulo = (art) => {
        if (!art) return 0;
        const parteNumerica = String(art).split('-')[0];
        let valor = parseFloat(parteNumerica) || 0;
        if (valor >= 100) return valor / 1000;
        return valor;
    };

    const calcularDatosEnvase = (env) => {
        const id = env.id;
        const pz = parseInt(cantidades[id] || 0);
        const capacidadSistema = Number(litrosPorEnvasado(id));

        const infoPlanificador = producto.datosPlanificador?.find(item => {
            const litrosPlan = extraerLitrosDeArticulo(item.articulo);
            return Math.abs(litrosPlan - capacidadSistema) < 0.001;
        });
        
        const salidas = infoPlanificador ? parseInt(infoPlanificador.salidas) : 0;
        const existencia = infoPlanificador ? parseInt(infoPlanificador.existencia) : 0;
        const alcanceActual = infoPlanificador ? parseInt(infoPlanificador.alcance) : 0;

        const divisorCaja = (capacidadSistema >= 3 && capacidadSistema <= 5) ? 2 : (capacidadSistema <= 1 ? 6 : 1);
        const cajaCerrada = pz > 0 ? (pz / divisorCaja).toFixed(1) : 0;

        const nuevoInv = existencia + pz;
        const factorC2 = 24;
        const diasEstCalc = salidas > 0 ? ((existencia + pz) / salidas) * factorC2 : 0;
        const diasEstStr = Math.round(diasEstCalc).toString();

        return {
            id, pz, capacidadSistema, salidas, existencia,
            alcanceActual, cajaCerrada, nuevoInv, diasEstCalc, diasEstStr
        };
    };

    const renderFilaInventario = (env) => {
        const d = calcularDatosEnvase(env);
        
        const alcanceClass = d.alcanceActual < 3 ? "status-danger" : "status-warning";
        const diasEstClass = d.diasEstCalc < 24 ? "status-danger" : "status-success";

        return (
            <tr key={d.id}>
                <td className="col-envase">{litrosATexto(d.capacidadSistema)}</td>
                <td className={d.pz > 0 ? "col-produccion-active" : "col-produccion-inactive"}>
                    {d.pz}
                </td>
                <td className="col-caja-cerrada">{d.cajaCerrada}</td>
                <td>{d.salidas}</td>
                
                {/* EXISTENCIA RESALTADA */}
                <td className="col-highlight">{d.existencia}</td>
                
                <td>
                    <div className="badge-container">
                        <span className={`badge-status ${alcanceClass}`}>{d.alcanceActual}</span>
                    </div>
                </td>

                {/* NUEVO INV RESALTADO */}
                <td className="col-highlight">{d.nuevoInv}</td>

                <td>
                    <div className="badge-container">
                        <span className={`badge-status ${diasEstClass}`}>{d.diasEstStr}</span>
                    </div>
                </td>
            </tr>
        );
    };

    const renderTablaInventario = () => {
        if (!producto?.envasados?.length) {
            return (
                <tr>
                    <td colSpan="8" style={{ color: '#666', padding: '15px', textAlign: 'center' }}>
                        Busque un producto para ver el análisis de stock...
                    </td>
                </tr>
            );
        }

        return [...producto.envasados]
            .sort((a, b) => litrosPorEnvasado(a.id) - litrosPorEnvasado(b.id))
            .map(env => renderFilaInventario(env));
    };

    const renderColumnaEnvasado = () => {
        if (!producto?.envasados?.length) return null;

        return (
            <div className="envasado-column">
                <div className="tabla">
                    {[...producto.envasados]
                        .sort((a, b) => litrosPorEnvasado(a.id) - litrosPorEnvasado(b.id))
                        .map(env => (
                            <div className="fila" key={env.id}>
                                <span className="litros-text">{litrosATexto(litrosPorEnvasado(env.id))}</span>
                                <input
                                    type="number"
                                    value={cantidades[env.id] || 0}
                                    onChange={(e) => setCantidades({ ...cantidades, [env.id]: Number(e.target.value) })}
                                />
                            </div>
                        ))}
                </div>
                <div className="contador-litros">Total: <span>{totalLitrosActuales.toFixed(2)} L</span></div>
            </div>
        );
    };

    return (
        <div className="layout-dinamico-produccion">
            {renderColumnaEnvasado()}
            <div className="inventario-column">
                <table className="tabla-inventario-tecnica">
                    <thead>
                        <tr>
                            <th>ENVASE</th>
                            <th>PZ P</th>
                            <th>CJA CERRADA</th>
                            <th>SALIDAS</th>
                            <th>EXISTENCIA</th>
                            <th>ALCANCE</th>
                            <th>NUEVO INV.</th>
                            <th>DÍAS EST.</th>
                            
                        </tr>
                    </thead>
                    <tbody>
                        {renderTablaInventario()}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InfoInventarioProducto;