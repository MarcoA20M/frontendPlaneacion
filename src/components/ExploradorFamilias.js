import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { productoService } from "../services/productoService";

export const VistaFamilias = ({ cargandoFamilias, familias }) => {
  const navigate = useNavigate();
  return (
    <div className="families-glass-panel">
      <div className="scanner-line"></div>
      {cargandoFamilias ? <p>Cargando líneas...</p> : (
        <div className="families-grid-layout">
          {familias.map(f => (
            <div key={f.id} className="family-card-premium" onClick={() => navigate(`/familia/${f.id}`)}>
              <div className="card-content">
                <div className="family-icon">{f.nombre.charAt(0)}</div>
                <div className="family-info">
                  <span className="family-name">{f.nombre}</span>
                  <span className="family-meta">Línea de producción</span>
                </div>
                <div className="family-badge">{f.totalCargas || 0}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const VistaProductosFamilia = ({ setCodigo, consultar }) => {
  const { idFamilia } = useParams();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    productoService.getProductosPorFamilia(idFamilia).then(data => {
      setProductos(data);
      setLoading(false);
    });
  }, [idFamilia]);

  const seleccionar = (id) => {
    setCodigo(id);
    navigate("/");
    setTimeout(() => consultar(), 150);
  };

  return (
    <div className="families-glass-panel">
      <button className="btn-regresar" onClick={() => navigate("/familias")} style={{color: 'white', marginBottom: '10px', background: 'none', border: '1px solid white', borderRadius: '5px', cursor: 'pointer'}}>
        ⬅ Volver a Familias
      </button>
      {loading ? <p>Cargando productos...</p> : (
        <div className="families-grid-layout">
          {productos.map(p => (
            <div key={p.id} className="family-card-premium" onClick={() => seleccionar(p.id)}>
              <div className="card-content">
                <div className="family-icon" style={{fontSize: '10px'}}>{p.id}</div>
                <div className="family-info">
                  <span className="family-name">{p.descripcion}</span>
                  <span className="family-meta">Poder Cubriente: {p.poderCubriente}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};