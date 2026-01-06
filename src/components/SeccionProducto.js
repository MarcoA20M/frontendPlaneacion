import React from 'react';
import { litrosPorEnvasado, litrosATexto } from "../constants/config";

export default function SeccionProducto({ produccion }) {
  const { codigo, setCodigo, producto, consultar, cantidades, setCantidades, totalLitrosActuales } = produccion;

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
          {/* ... resto de la info del producto ... */}
          
          <div className="tabla">
            {[...producto.envasados].sort((a, b) => litrosPorEnvasado(a.id) - litrosPorEnvasado(b.id)).map(env => (
              <div className="fila" key={env.id}>
                <span className="litros-text">{litrosATexto(litrosPorEnvasado(env.id))}</span>
                <input type="number" value={cantidades[env.id] || 0} onChange={(e) => setCantidades({ ...cantidades, [env.id]: Number(e.target.value) })} />
              </div>
            ))}
          </div>
          <div className="contador-litros">Total: <span>{totalLitrosActuales.toFixed(2)} L</span></div>
        </div>
      )}
    </div>
  );
}