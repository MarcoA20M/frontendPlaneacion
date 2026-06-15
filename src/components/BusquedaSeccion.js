import React, { useState, useEffect } from 'react';
import PanelEspeciales from "./PanelEspeciales";
import { formulasService } from "../services/formulasService";

export default function BusquedaSeccion({ 
  codigo, setCodigo, consultar, producto, cargasEspeciales, 
  mostrarEspeciales, setMostrarEspeciales, onSeleccionarCarga,
  cantidades, totalLitrosActuales
}) {
  const [consumoMaterias, setConsumoMaterias] = useState([]);
  const [cargandoConsumo, setCargandoConsumo] = useState(false);
  const [mostrarConsumo, setMostrarConsumo] = useState(false);

  const codigosPermitidos = [
    'CCA10', 'CCA20', 'CCM30', 'CCM60', 'RVA50', 'RVO10', 
    'RIE30', 'RAC30', 'RRN10', 'SXI10', 'SGA10', 'TT06', 
    'CCP15', 'TMB10', 'RRN20', 'AMP10', 'AEA10', 'ACO20', 'ABL10'
  ];

  const esCodigoPermitido = (codigo) => {
    return codigosPermitidos.includes(codigo);
  };

  const calcularConsumo = async () => {
    if (!producto || !producto.codigo || totalLitrosActuales === 0) {
      setConsumoMaterias([]);
      return;
    }

    setCargandoConsumo(true);
    
    try {
      const formulas = await formulasService.listarPorProducto(producto.codigo);
      
      if (formulas && formulas.length > 0) {
        const consumos = formulas.map(f => {
          let materiaCodigo = "-";
          let materiaNombre = "-";
          let materiaTipo = "-";
          
          if (f.materiaPrima) {
            materiaCodigo = f.materiaPrima.codigo || "-";
            materiaNombre = f.materiaPrima.nombre || "-";
            materiaTipo = f.materiaPrima.tipo || "-";
          } else if (f.materiaPrimaCodigo) {
            materiaCodigo = f.materiaPrimaCodigo;
            materiaNombre = f.materiaPrimaNombre || "-";
            materiaTipo = f.materiaPrimaTipo || "-";
          }
          
          const cantidadPorLitroReal = f.cantidadPorLitro;
          const consumoTotal = cantidadPorLitroReal * totalLitrosActuales;
          
          return {
            codigo: materiaCodigo,
            nombre: materiaNombre,
            tipo: materiaTipo,
            consumoTotal: consumoTotal,
            consumoTotalFormateado: consumoTotal.toFixed(2),
            esPermitido: esCodigoPermitido(materiaCodigo)
          };
        }).filter(c => c.consumoTotal > 0 && c.codigo !== "-");
        
        const consumosFiltrados = consumos.filter(c => c.esPermitido === true);
        setConsumoMaterias(consumosFiltrados);
      } else {
        setConsumoMaterias([]);
      }
    } catch (error) {
      console.error("Error calculando consumo:", error);
      setConsumoMaterias([]);
    } finally {
      setCargandoConsumo(false);
    }
  };

  useEffect(() => {
    if (mostrarConsumo && producto && totalLitrosActuales > 0) {
      calcularConsumo();
    }
  }, [totalLitrosActuales, producto, mostrarConsumo]);

  const handleToggleConsumo = () => {
    if (!mostrarConsumo) {
      calcularConsumo();
    }
    setMostrarConsumo(!mostrarConsumo);
  };

  const handleOcultarConsumo = () => {
    setMostrarConsumo(false);
  };

  return (
    <div className="busqueda-seccion-container" style={{ position: 'relative' }}>
      <div className="busqueda-con-descripcion">
        <div className="busqueda">
          <input 
            placeholder="Código de producto..." 
            value={codigo} 
            onChange={(e) => setCodigo(e.target.value)} 
            onKeyPress={(e) => e.key === 'Enter' && consultar()}
          />
          <button onClick={consultar}>Buscar</button>
          
          {producto && (
            <button 
              className={`btn-calcular-consumo-busqueda ${mostrarConsumo ? 'active' : ''}`}
              onClick={handleToggleConsumo}
              disabled={cargandoConsumo}
              title={mostrarConsumo ? "Ocultar consumo" : "Ver consumo de materia prima"}
            >
              {mostrarConsumo ? "🔒" : "🏭"}
            </button>
          )}
        </div>
        
        {producto && (
          <div className="descripcion-producto">
            <div className="nombre-producto">{producto.descripcion}</div>
            <div className="poder-cubriente">Poder Cubriente: <span>{producto.poderCubriente || "N/A"}</span></div>
            
            <div className="procesos-info">
              <strong>Ruta:</strong>
              <div className="lista-procesos-tags">
                {producto.procesos?.map((p) => (
                  <div key={p.paso} className="proceso-item">
                    <span className="paso-nro">{p.paso}</span>
                    <span className="paso-desc">{p.descripcion}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Panel de consumo FUERA de descripcion-producto */}
      {mostrarConsumo && producto && (
        <div className="consumo-preview-mini">
          <div className="consumo-header-mini">
            <span className="consumo-icon">⚗️</span>
            <strong>Consumo de Materia Prima</strong>
            <span className="consumo-badge-mini">{consumoMaterias.length} materias</span>
            <button className="btn-cerrar-consumo-mini" onClick={handleOcultarConsumo}>✖</button>
          </div>
          
          {cargandoConsumo ? (
            <div className="consumo-loading-mini">
              <div className="spinner-mini"></div>
              <span>Calculando...</span>
            </div>
          ) : consumoMaterias.length > 0 ? (
            <>
              <div className="consumo-lista-mini">
                {consumoMaterias.map((item, idx) => (
                  <div key={idx} className="consumo-item-mini">
                    <code>{item.codigo}</code>
                    <span>{item.nombre}</span>
                    <span className={`tipo-mini ${item.tipo?.toLowerCase()}`}>{item.tipo}</span>
                    <strong>{item.consumoTotalFormateado} L</strong>
                  </div>
                ))}
              </div>
              <div className="consumo-total-mini">
                <span>Total a consumir:</span>
                <strong>{consumoMaterias.reduce((sum, c) => sum + c.consumoTotal, 0).toFixed(2)} L</strong>
              </div>
              <div className="consumo-nota-mini">
                <small>💡 Basado en {totalLitrosActuales.toFixed(2)} L de producción</small>
              </div>
            </>
          ) : (
            <div className="sin-consumo-mini">
              <span>📋</span>
              <p>No hay materias primas en la lista permitida para este producto</p>
            </div>
          )}
        </div>
      )}

      <PanelEspeciales
        cargasEspeciales={cargasEspeciales}
        mostrarEspeciales={mostrarEspeciales} 
        setMostrarEspeciales={setMostrarEspeciales}
        handleDragStart={(e, o) => e.dataTransfer.setData("transferData", JSON.stringify(o))}
        seleccionarCarga={onSeleccionarCarga}
      />
    </div>
  );
}