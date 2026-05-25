import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { familiaService } from "./services/familiaService";
import { productoService } from "./services/productoService";

const PantallaCatalogo = ({ tipoPintura, setCodigo, consultar }) => {
  const navigate = useNavigate();
  const { idFamilia } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    if (!idFamilia) {
      familiaService.getFamiliasPorTipo(tipoPintura).then(data => {
        setItems(data);
        setLoading(false);
      });
    } else {
      productoService.getProductosPorFamilia(idFamilia).then(data => {
        setItems(data);
        setLoading(false);
      });
    }
  }, [idFamilia, tipoPintura]);

  const alSeleccionarProducto = (p) => {
    setCodigo(p.id);
    // Abrir Formulario en Ventana Independiente
    const width = 600, height = 700;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    
    window.open(`/producto-form/${p.id}`, 'FormularioProducto', 
      `width=${width},height=${height},top=${top},left=${left},resizable=yes`);

    // Regresar al tablero
    navigate("/");
    setTimeout(() => consultar(), 150);
  };

  return (
    <div className="catalogo-screen">
      <header className="catalogo-nav">
        <div className="nav-group">
          {idFamilia && <button className="btn-retroceder" onClick={() => navigate("/catalogo")}>← Volver</button>}
          <h1>{idFamilia ? "Selección de Artículos" : `Líneas de ${tipoPintura}`}</h1>
        </div>
        <button className="btn-cerrar-catalogo" onClick={() => navigate("/")}>Cerrar Catálogo ✕</button>
      </header>

      <div className="catalogo-body">
        {loading ? <div className="loader">Cargando...</div> : (
          <div className="catalogo-grid">
            {items.map(item => (
              <div 
                key={item.id} 
                className={idFamilia ? "card-articulo" : "card-familia"}
                onClick={() => idFamilia ? alSeleccionarProducto(item) : navigate(`/catalogo/${item.id}`)}
              >
                {!idFamilia && <div className="circulo-inicial">{item.nombre.charAt(0)}</div>}
                <div className="card-info">
                  <h3>{item.nombre || item.descripcion}</h3>
                  <p>{idFamilia ? `Poder Cubriente: ${item.poderCubriente}` : `${item.totalCargas || 0} Cargas`}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PantallaCatalogo;