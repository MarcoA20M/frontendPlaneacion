// components/InfoInventarioProducto.js
import React from "react";
import { litrosPorEnvasado, litrosATexto } from "../constants/config";

const InfoInventarioProducto = ({ producto, cantidades, setCantidades, totalLitrosActuales }) => {
    
    // Función para extraer litros del artículo del planificador
    const extraerLitrosDeArticulo = (art) => {
        if (!art) return 0;
        const parteNumerica = String(art).split('-')[0];
        let valor = parseFloat(parteNumerica) || 0;
        // Si el valor es 100 o más (250, 500, 750, 900), son mililitros
        // Si el valor es menor a 100 (1, 4, 19, 20), son litros
        if (valor >= 100) {
            return valor / 1000;
        }
        return valor;
    };

    // Función para calcular todos los datos de un envase
    const calcularDatosEnvase = (env) => {
        const id = env.id;
        const pz = parseInt(cantidades[id] || 0);
        const capacidadSistema = Number(litrosPorEnvasado(id));

        // Buscar la información del planificador para este envase
        const infoPlanificador = producto.datosPlanificador?.find(item => {
            const litrosPlan = extraerLitrosDeArticulo(item.articulo);
            return Math.abs(litrosPlan - capacidadSistema) < 0.001;
        });
        
        // Cálculos dinámicos
        const salidas = infoPlanificador ? parseInt(infoPlanificador.salidas) : 0;
        const existencia = infoPlanificador ? parseInt(infoPlanificador.existencia) : 0;
        const alcanceActual = infoPlanificador ? parseInt(infoPlanificador.alcance) : 0;

        // Lógica de cajas
        const divisorCaja = (capacidadSistema >= 3 && capacidadSistema <= 5) ? 2 : (capacidadSistema <= 1 ? 6 : 1);
        const cajaCerrada = pz > 0 ? (pz / divisorCaja).toFixed(1) : 0;

        const nuevoInv = existencia + pz;
        
        // Fórmula: ((existencia + producción) / salidas) * 24
        const factorC2 = 24;
        const diasEstCalc = salidas > 0 ? ((existencia + pz) / salidas) * factorC2 : 0;
        const diasEstStr = Math.round(diasEstCalc).toString();

        return {
            id,
            pz,
            capacidadSistema,
            salidas,
            existencia,
            alcanceActual,
            cajaCerrada,
            nuevoInv,
            diasEstCalc,
            diasEstStr
        };
    };

    // Renderizar fila de la tabla
    const renderFilaInventario = (env) => {
        const datos = calcularDatosEnvase(env);
        
        return (
            <tr key={datos.id}>
                <td style={{ color: '#00e5ff', fontWeight: 'bold' }}>
                    {litrosATexto(datos.capacidadSistema)}
                </td>
                <td style={{ color: datos.pz > 0 ? '#fff' : '#555' }}>{datos.pz}</td>
                <td style={{ opacity: 0.7 }}>{datos.cajaCerrada}</td>
                <td>{datos.salidas}</td>
                <td>{datos.existencia}</td>
                <td style={{
                    color: datos.alcanceActual < 3 ? '#ff5252' : '#ffca28',
                    fontWeight: 'bold'
                }}>{datos.alcanceActual}</td>
                <td style={{ backgroundColor: 'rgba(0, 229, 255, 0.05)' }}>{datos.nuevoInv}</td>
                <td style={{
                    color: datos.diasEstCalc < 24 ? '#ff5252' : '#00ff88',
                    fontWeight: 'bold'
                }}>{datos.diasEstStr}</td>
            </tr>
        );
    };

    // Renderizar tabla completa
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

    // Renderizar columna de envasado
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

    // Renderizar columna de inventario
    const renderColumnaInventario = () => {
        return (
            <div className="inventario-column">
                <table className="tabla-inventario-tecnica">
                    <thead>
                        <tr>
                            <th>ENVASE</th>
                            <th>PRODUCCIÓN</th>
                            <th>CAJA CERRADA</th>
                            <th>SALIDAS</th>
                            <th>EXISTENCIA</th>
                            <th>ALCANCE (DÍAS)</th>
                            <th>NUEVO INV.</th>
                            <th>DÍAS EST.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {renderTablaInventario()}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="layout-dinamico-produccion">
            {renderColumnaEnvasado()}
            {renderColumnaInventario()}
        </div>
    );
};

export default InfoInventarioProducto;