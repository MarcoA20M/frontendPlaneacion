import React from 'react';
import PanelEspeciales from "./PanelEspeciales";

export default function BusquedaSeccion({ 
  codigo, setCodigo, consultar, producto, cargasEspeciales, 
  mostrarEspeciales, setMostrarEspeciales, onSeleccionarCarga 
}) {
  return (
    <div className="busqueda-con-descripcion">
      <div className="busqueda">
        <input placeholder="Código de producto..." value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        <button onClick={consultar}>Buscar</button>
      </div>
      
      {producto && (
        <div className="descripcion-producto">
          <div className="nombre-producto">{producto.descripcion}</div>
          <div className="poder-cubriente">Poder Cubriente: <span>{producto.poderCubriente || "N/A"}</span></div>
          <div className="procesos-info">
            <strong>Ruta:</strong>
            <div className="lista-procesos-tags">
              {producto.procesos?.map((p) => (
                <div key={p.paso} className="proceso-item"><span className="paso-nro">{p.paso}</span><span className="paso-desc">{p.descripcion}</span></div>
              ))}
            </div>
          </div>
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