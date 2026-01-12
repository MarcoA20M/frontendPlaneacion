const InfoInventarioProducto = ({ producto, cantidades = {} }) => {
    if (!producto) return null;

    const extraerLitrosDeArticulo = (articuloCompleto) => {
        if (!articuloCompleto) return 0;
        const partes = String(articuloCompleto).split('-');
        const prefijoCapacidad = partes[0].replace(/^0+/, ''); 

        switch (prefijoCapacidad) {
            case "19": return 19;
            case "4":  return 4;
            case "1":  return 1;
            case "500": return 5;
            case "250": return 0.25;
            default: return parseFloat(prefijoCapacidad) || 0;
        }
    };

    const filasActivas = Object.entries(cantidades).filter(([_, valor]) => valor > 0);

    return (
        <div className="inventario-column">
            <table className="tabla-inventario-tecnica">
                <thead>
                    <tr>
                        <th>TIPO ENVASE</th>
                        <th>PZ A PRODUCIR</th>
                        <th>CAJA CERRADA</th>
                        <th>SALIDAS</th>
                        <th>EXISTENCIA</th>
                        <th>ALCANCE (DÍAS)</th>
                        <th>NUEVO INV.</th>
                        <th>DÍAS EST.</th>
                    </tr>
                </thead>
                <tbody>
                    {filasActivas.length > 0 ? (
                        filasActivas.map(([id, pz]) => {
                            const capacidadLitros = Number(litrosPorEnvasado(id));
                            const infoFormato = producto.datosPlanificador?.find(item => {
                                const capPlanificador = extraerLitrosDeArticulo(item.articulo);
                                return Math.abs(capPlanificador - capacidadLitros) < 0.3;
                            });

                            const salidas = infoFormato ? parseFloat(infoFormato.salidas) : 0;
                            const existencia = infoFormato ? parseFloat(infoFormato.existencia) : 0;
                            const alcanceOriginal = infoFormato ? infoFormato.alcance : 0;

                            let divisorCaja = 1;
                            if (capacidadLitros >= 3 && capacidadLitros <= 5) divisorCaja = 2;
                            else if (capacidadLitros <= 1) divisorCaja = 6;
                            
                            const cajaCerrada = (pz / divisorCaja).toFixed(1);
                            const nuevoInventario = existencia + Number(pz);
                            const diasEstimadosVal = salidas > 0 ? (nuevoInventario / salidas).toFixed(1) : 0;

                            return (
                                <tr key={id}>
                                    <td style={{ color: '#00e5ff', fontWeight: 'bold' }}>{id.toUpperCase()}</td>
                                    <td>{pz}</td>
                                    <td style={{ opacity: 0.8 }}>{cajaCerrada}</td>
                                    <td>{salidas.toFixed(1)}</td>
                                    <td>{existencia}</td>
                                    <td style={{ 
                                        color: alcanceOriginal < 3 ? '#ff5252' : '#ffca28',
                                        fontWeight: 'bold' 
                                    }}>{alcanceOriginal}</td>
                                    <td style={{ backgroundColor: 'rgba(0, 229, 255, 0.05)' }}>{nuevoInventario}</td>
                                    <td style={{ 
                                        color: diasEstimadosVal < 5 ? '#ff5252' : '#00ff88', 
                                        fontWeight: 'bold'
                                    }}>{salidas > 0 ? diasEstimadosVal : "---"}</td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan="8" style={{ textAlign: 'center', color: '#666', padding: '30px' }}>
                                💡 No hay sugerencia de producción para este producto.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};