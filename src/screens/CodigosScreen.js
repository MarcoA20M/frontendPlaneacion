import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/codigos.css";

export default function CodigosScreen() {
    const navigate = useNavigate();
    
    // Estado para la pestaña activa en la barra lateral
    const [seccionActiva, setSeccionActiva] = useState("vinilicas");
    
    // Estado para el submenú de Vinílicas
    const [subSeccionVinilicas, setSubSeccionVinilicas] = useState("excluidos");
    
    // Estados para Códigos Excluidos (Vinílicas)
    const [codigos, setCodigos] = useState([]);
    const [nuevoCodigo, setNuevoCodigo] = useState("");
    const [editandoId, setEditandoId] = useState(null);
    const [editandoValor, setEditandoValor] = useState("");
    const [filtro, setFiltro] = useState("");
    const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
    
    // Estados para PRODUCTOS (nuevos productos)
    const [productos, setProductos] = useState(() => {
        const guardados = localStorage.getItem("productos_vinilica");
        return guardados ? JSON.parse(guardados) : [];
    });
    
    const [nuevoProducto, setNuevoProducto] = useState({
        codigo: "",
        descripcion: "",
        envasados: [
            { litros: 0.25, cantidad: 0 },
            { litros: 0.5, cantidad: 0 },
            { litros: 0.75, cantidad: 0 },
            { litros: 1, cantidad: 0 },
            { litros: 4, cantidad: 0 },
            { litros: 19, cantidad: 0 }
        ]
    });
    
    const [editandoProducto, setEditandoProducto] = useState(null);
    const [filtroProductos, setFiltroProductos] = useState("");
    
    // Estados para Códigos Especiales (Esmaltes)
    const [codigosEspeciales, setCodigosEspeciales] = useState(() => {
        const guardados = localStorage.getItem("codigos_especiales");
        return guardados ? JSON.parse(guardados) : [
            { id: 1, codigo: "ESP-001", descripcion: "Pedido Especial Cliente A", activo: true },
            { id: 2, codigo: "ESP-002", descripcion: "Muestra Especial", activo: true },
            { id: 3, codigo: "ESP-003", descripcion: "Urgente Producción", activo: true },
        ];
    });
    
    const [nuevoEspecial, setNuevoEspecial] = useState({ codigo: "", descripcion: "" });
    const [editandoEspecial, setEditandoEspecial] = useState(null);
    const [filtroEspeciales, setFiltroEspeciales] = useState("");

    // ========== CÓDIGOS EXCLUIDOS (VINÍLICAS) ==========
    useEffect(() => {
        const cargarCodigos = () => {
            const guardados = localStorage.getItem("codigos_excluidos");
            if (guardados) {
                setCodigos(JSON.parse(guardados));
            } else {
                const codigosDefault = [
                    "890", "912", "908", "100", "852", "852IF", "802IF", "803", "803IF",
                    "812", "812IF", "813", "813IF", "820", "821", "822", "823", "824",
                    "825", "826", "853", "853IF", "854IF", "862", "862IF", "863", "863IF",
                    "870", "870IF", "900", "902", "904", "906", "910", "914", "916", "918",
                    "920", "922", "924"
                ];
                setCodigos(codigosDefault);
                localStorage.setItem("codigos_excluidos", JSON.stringify(codigosDefault));
            }
        };
        cargarCodigos();
    }, []);

    useEffect(() => {
        if (codigos.length > 0) {
            localStorage.setItem("codigos_excluidos", JSON.stringify(codigos));
            window.dispatchEvent(new CustomEvent("codigosExcluidosUpdated", {
                detail: { codigos }
            }));
        }
    }, [codigos]);

    // ========== PRODUCTOS (VINÍLICAS) ==========
    useEffect(() => {
        if (productos.length > 0) {
            localStorage.setItem("productos_vinilica", JSON.stringify(productos));
        }
    }, [productos]);

    // ========== CÓDIGOS ESPECIALES (ESMALTES) ==========
    useEffect(() => {
        if (codigosEspeciales.length > 0) {
            localStorage.setItem("codigos_especiales", JSON.stringify(codigosEspeciales));
            window.dispatchEvent(new CustomEvent("codigosEspecialesUpdated", {
                detail: { codigosEspeciales }
            }));
        }
    }, [codigosEspeciales]);

    const mostrarMensaje = (texto, tipo = "success") => {
        setMensaje({ texto, tipo });
        setTimeout(() => setMensaje({ texto: "", tipo: "" }), 3000);
    };

    // ========== CRUD CÓDIGOS EXCLUIDOS ==========
    const agregarCodigo = () => {
        if (!nuevoCodigo.trim()) {
            mostrarMensaje("Ingresa un código válido", "error");
            return;
        }

        const codigoUpper = nuevoCodigo.trim().toUpperCase();
        
        if (codigos.includes(codigoUpper)) {
            mostrarMensaje(`El código "${codigoUpper}" ya existe`, "error");
            return;
        }

        setCodigos([...codigos, codigoUpper]);
        setNuevoCodigo("");
        mostrarMensaje(`Código "${codigoUpper}" agregado correctamente`);
    };

    const eliminarCodigo = (codigo) => {
        if (window.confirm(`¿Eliminar el código "${codigo}" de la lista de excluidos?`)) {
            setCodigos(codigos.filter(c => c !== codigo));
            mostrarMensaje(`Código "${codigo}" eliminado`);
        }
    };

    const iniciarEdicion = (codigo) => {
        setEditandoId(codigo);
        setEditandoValor(codigo);
    };

    const guardarEdicion = () => {
        if (!editandoValor.trim()) {
            mostrarMensaje("El código no puede estar vacío", "error");
            return;
        }

        const nuevoValor = editandoValor.trim().toUpperCase();
        const indice = codigos.indexOf(editandoId);
        
        if (indice !== -1) {
            if (codigos.includes(nuevoValor) && nuevoValor !== editandoId) {
                mostrarMensaje(`El código "${nuevoValor}" ya existe`, "error");
                return;
            }
            
            const nuevosCodigos = [...codigos];
            nuevosCodigos[indice] = nuevoValor;
            setCodigos(nuevosCodigos);
            mostrarMensaje(`Código actualizado a "${nuevoValor}"`);
        }
        
        setEditandoId(null);
        setEditandoValor("");
    };

    const cancelarEdicion = () => {
        setEditandoId(null);
        setEditandoValor("");
    };

    const codigosFiltrados = codigos.filter(codigo => 
        codigo.toLowerCase().includes(filtro.toLowerCase())
    );

    // ========== CRUD PRODUCTOS ==========
    const agregarProducto = () => {
        if (!nuevoProducto.codigo.trim()) {
            mostrarMensaje("Ingresa un código de producto válido", "error");
            return;
        }
        
        if (!nuevoProducto.descripcion.trim()) {
            mostrarMensaje("Ingresa una descripción del producto", "error");
            return;
        }
        
        const codigoUpper = nuevoProducto.codigo.trim().toUpperCase();
        
        if (productos.some(p => p.codigo === codigoUpper)) {
            mostrarMensaje(`El producto "${codigoUpper}" ya existe`, "error");
            return;
        }
        
        const nuevoId = Math.max(...productos.map(p => p.id), 0) + 1;
        setProductos([...productos, {
            id: nuevoId,
            codigo: codigoUpper,
            descripcion: nuevoProducto.descripcion,
            envasados: nuevoProducto.envasados.filter(e => e.cantidad > 0)
        }]);
        
        setNuevoProducto({
            codigo: "",
            descripcion: "",
            envasados: [
                { litros: 0.25, cantidad: 0 },
                { litros: 0.5, cantidad: 0 },
                { litros: 0.75, cantidad: 0 },
                { litros: 1, cantidad: 0 },
                { litros: 4, cantidad: 0 },
                { litros: 19, cantidad: 0 }
            ]
        });
        
        mostrarMensaje(`Producto "${codigoUpper}" agregado correctamente`);
    };
    
    const eliminarProducto = (id) => {
        const producto = productos.find(p => p.id === id);
        if (window.confirm(`¿Eliminar el producto "${producto.codigo}"?`)) {
            setProductos(productos.filter(p => p.id !== id));
            mostrarMensaje(`Producto "${producto.codigo}" eliminado`);
        }
    };
    
    const iniciarEdicionProducto = (producto) => {
        setEditandoProducto({ ...producto });
    };
    
    const guardarEdicionProducto = () => {
        if (!editandoProducto.codigo.trim()) {
            mostrarMensaje("El código no puede estar vacío", "error");
            return;
        }
        
        const codigoUpper = editandoProducto.codigo.trim().toUpperCase();
        
        if (productos.some(p => p.codigo === codigoUpper && p.id !== editandoProducto.id)) {
            mostrarMensaje(`El producto "${codigoUpper}" ya existe`, "error");
            return;
        }
        
        setProductos(productos.map(p => 
            p.id === editandoProducto.id 
                ? { ...p, codigo: codigoUpper, descripcion: editandoProducto.descripcion, envasados: editandoProducto.envasados }
                : p
        ));
        setEditandoProducto(null);
        mostrarMensaje(`Producto actualizado correctamente`);
    };
    
    const actualizarEnvasadoProducto = (id, litros, cantidad) => {
        setProductos(productos.map(p => {
            if (p.id === id) {
                const nuevosEnvasados = p.envasados.map(e => 
                    e.litros === litros ? { ...e, cantidad: parseInt(cantidad) || 0 } : e
                );
                return { ...p, envasados: nuevosEnvasados };
            }
            return p;
        }));
    };
    
    const productosFiltrados = productos.filter(producto => 
        producto.codigo.toLowerCase().includes(filtroProductos.toLowerCase()) ||
        producto.descripcion.toLowerCase().includes(filtroProductos.toLowerCase())
    );

    // ========== CRUD CÓDIGOS ESPECIALES ==========
    const agregarEspecial = () => {
        if (!nuevoEspecial.codigo.trim()) {
            mostrarMensaje("Ingresa un código especial válido", "error");
            return;
        }

        const codigoUpper = nuevoEspecial.codigo.trim().toUpperCase();
        
        if (codigosEspeciales.some(c => c.codigo === codigoUpper)) {
            mostrarMensaje(`El código especial "${codigoUpper}" ya existe`, "error");
            return;
        }

        const nuevoId = Math.max(...codigosEspeciales.map(c => c.id), 0) + 1;
        setCodigosEspeciales([...codigosEspeciales, {
            id: nuevoId,
            codigo: codigoUpper,
            descripcion: nuevoEspecial.descripcion || "Sin descripción",
            activo: true
        }]);
        setNuevoEspecial({ codigo: "", descripcion: "" });
        mostrarMensaje(`Código especial "${codigoUpper}" agregado correctamente`);
    };

    const eliminarEspecial = (id) => {
        const especial = codigosEspeciales.find(c => c.id === id);
        if (window.confirm(`¿Eliminar el código especial "${especial.codigo}"?`)) {
            setCodigosEspeciales(codigosEspeciales.filter(c => c.id !== id));
            mostrarMensaje(`Código especial "${especial.codigo}" eliminado`);
        }
    };

    const iniciarEdicionEspecial = (especial) => {
        setEditandoEspecial({ ...especial });
    };

    const guardarEdicionEspecial = () => {
        if (!editandoEspecial.codigo.trim()) {
            mostrarMensaje("El código no puede estar vacío", "error");
            return;
        }

        const codigoUpper = editandoEspecial.codigo.trim().toUpperCase();
        
        if (codigosEspeciales.some(c => c.codigo === codigoUpper && c.id !== editandoEspecial.id)) {
            mostrarMensaje(`El código especial "${codigoUpper}" ya existe`, "error");
            return;
        }

        setCodigosEspeciales(codigosEspeciales.map(c => 
            c.id === editandoEspecial.id 
                ? { ...c, codigo: codigoUpper, descripcion: editandoEspecial.descripcion }
                : c
        ));
        setEditandoEspecial(null);
        mostrarMensaje(`Código especial actualizado correctamente`);
    };

    const cancelarEdicionEspecial = () => {
        setEditandoEspecial(null);
    };

    const codigosEspecialesFiltrados = codigosEspeciales.filter(esp => 
        esp.codigo.toLowerCase().includes(filtroEspeciales.toLowerCase()) ||
        esp.descripcion.toLowerCase().includes(filtroEspeciales.toLowerCase())
    );

    const toggleActivoEspecial = (id) => {
        setCodigosEspeciales(codigosEspeciales.map(c => 
            c.id === id ? { ...c, activo: !c.activo } : c
        ));
        const especial = codigosEspeciales.find(c => c.id === id);
        mostrarMensaje(`Código especial "${especial.codigo}" ${especial.activo ? 'desactivado' : 'activado'}`);
    };

    // Función para obtener el título según la subsección
    const getTituloVinilicas = () => {
        switch(subSeccionVinilicas) {
            case "productos": return "📦 Gestión de Productos";
            case "excluidos": return "🚫 Códigos Excluidos";
            default: return "Gestión Vinílicas";
        }
    };

    const getDescripcionVinilicas = () => {
        switch(subSeccionVinilicas) {
            case "productos": return "Agrega, edita o elimina productos con sus respectivos envasados";
            case "excluidos": return "Administra los códigos que NO deben aparecer en producción";
            default: return "";
        }
    };

    // Renderizado condicional según la sección activa
    const renderContenido = () => {
        if (seccionActiva === "vinilicas") {
            if (subSeccionVinilicas === "excluidos") {
                return (
                    <>
                        <div className="cod-card">
                            <div className="search-box">
                                <input
                                    type="text"
                                    placeholder="Buscar código excluido..."
                                    value={filtro}
                                    onChange={(e) => setFiltro(e.target.value)}
                                />
                                {filtro && (
                                    <button onClick={() => setFiltro("")} className="clear-filter">
                                        ✖
                                    </button>
                                )}
                            </div>

                            <div className="add-codigo-bar">
                                <input
                                    type="text"
                                    placeholder="Nuevo código excluido (ej: 999 o 999IF)..."
                                    value={nuevoCodigo}
                                    onChange={(e) => setNuevoCodigo(e.target.value.toUpperCase())}
                                    onKeyPress={(e) => e.key === 'Enter' && agregarCodigo()}
                                />
                                <button onClick={agregarCodigo}>
                                    + Agregar Código
                                </button>
                            </div>
                        </div>

                        <div className="cod-card table-card">
                            <div className="card-header-flex">
                                <h3 className="cod-card-title">📋 CÓDIGOS EXCLUIDOS</h3>
                                <span className="count-badge">{codigosFiltrados.length} códigos</span>
                            </div>

                            <div className="cod-table-wrapper">
                                <table className="cod-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Código</th>
                                            <th>Tipo</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {codigosFiltrados.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="empty-state">
                                                    {filtro ? "No se encontraron códigos" : "No hay códigos excluidos"}
                                                </td>
                                            </tr>
                                        ) : (
                                            codigosFiltrados.map((codigo, index) => (
                                                <tr key={codigo}>
                                                    <td>{index + 1}</td>
                                                    <td>
                                                        {editandoId === codigo ? (
                                                            <input
                                                                type="text"
                                                                className="edit-input"
                                                                value={editandoValor}
                                                                onChange={(e) => setEditandoValor(e.target.value.toUpperCase())}
                                                                onKeyPress={(e) => e.key === 'Enter' && guardarEdicion()}
                                                                autoFocus
                                                            />
                                                        ) : (
                                                            <span className="codigo-value">{codigo}</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {codigo.includes('IF') ? (
                                                            <span className="badge-if">⚠️ Con IF</span>
                                                        ) : (
                                                            <span className="badge-normal">✓ Normal</span>
                                                        )}
                                                    </td>
                                                    <td className="actions-cell">
                                                        {editandoId === codigo ? (
                                                            <>
                                                                <button className="action-btn save" onClick={guardarEdicion}>💾</button>
                                                                <button className="action-btn cancel" onClick={cancelarEdicion}>✖</button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button className="action-btn edit" onClick={() => iniciarEdicion(codigo)}>✏️</button>
                                                                <button className="action-btn delete" onClick={() => eliminarCodigo(codigo)}>🗑️</button>
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="info-box">
                                <strong>ℹ️ Nota:</strong> Los códigos excluidos no aparecerán en la búsqueda de producción.
                                Los códigos con <strong>"IF"</strong> son versiones especiales.
                            </div>
                        </div>
                    </>
                );
            } else if (subSeccionVinilicas === "productos") {
                return (
                    <>
                        <div className="cod-card">
                            <div className="search-box">
                                <input
                                    type="text"
                                    placeholder="Buscar producto por código o descripción..."
                                    value={filtroProductos}
                                    onChange={(e) => setFiltroProductos(e.target.value)}
                                />
                                {filtroProductos && (
                                    <button onClick={() => setFiltroProductos("")} className="clear-filter">
                                        ✖
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Formulario para agregar nuevo producto */}
                        <div className="cod-card">
                            <h3 className="cod-card-title" style={{ marginBottom: '20px' }}>➕ NUEVO PRODUCTO</h3>
                            <div className="add-producto-form">
                                <div className="form-row">
                                    <input
                                        type="text"
                                        placeholder="Código del producto..."
                                        value={nuevoProducto.codigo}
                                        onChange={(e) => setNuevoProducto({ ...nuevoProducto, codigo: e.target.value.toUpperCase() })}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Descripción..."
                                        value={nuevoProducto.descripcion}
                                        onChange={(e) => setNuevoProducto({ ...nuevoProducto, descripcion: e.target.value })}
                                    />
                                </div>
                                <div className="envasados-grid">
                                    <h4>Envasados disponibles:</h4>
                                    <div className="envasados-row">
                                        {nuevoProducto.envasados.map((env, idx) => (
                                            <div key={idx} className="envasado-input">
                                                <label>{env.litros} L</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={env.cantidad}
                                                    onChange={(e) => {
                                                        const nuevosEnvasados = [...nuevoProducto.envasados];
                                                        nuevosEnvasados[idx].cantidad = parseInt(e.target.value) || 0;
                                                        setNuevoProducto({ ...nuevoProducto, envasados: nuevosEnvasados });
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <button onClick={agregarProducto} className="btn-agregar-producto">
                                    + Agregar Producto
                                </button>
                            </div>
                        </div>

                        {/* Tabla de productos */}
                        <div className="cod-card table-card">
                            <div className="card-header-flex">
                                <h3 className="cod-card-title">📦 LISTA DE PRODUCTOS</h3>
                                <span className="count-badge">{productosFiltrados.length} productos</span>
                            </div>

                            <div className="cod-table-wrapper">
                                <table className="cod-table productos-table">
                                    <thead>
                                        <tr>
                                            <th>Código</th>
                                            <th>Descripción</th>
                                            <th>Envasados</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productosFiltrados.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="empty-state">
                                                    {filtroProductos ? "No se encontraron productos" : "No hay productos registrados"}
                                                </td>
                                            </tr>
                                        ) : (
                                            productosFiltrados.map((producto) => (
                                                <tr key={producto.id}>
                                                    <td>
                                                        {editandoProducto?.id === producto.id ? (
                                                            <input
                                                                type="text"
                                                                className="edit-input"
                                                                value={editandoProducto.codigo}
                                                                onChange={(e) => setEditandoProducto({ ...editandoProducto, codigo: e.target.value.toUpperCase() })}
                                                            />
                                                        ) : (
                                                            <span className="codigo-value">{producto.codigo}</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {editandoProducto?.id === producto.id ? (
                                                            <input
                                                                type="text"
                                                                className="edit-input-desc"
                                                                value={editandoProducto.descripcion}
                                                                onChange={(e) => setEditandoProducto({ ...editandoProducto, descripcion: e.target.value })}
                                                            />
                                                        ) : (
                                                            <span>{producto.descripcion}</span>
                                                        )}
                                                    </td>
                                                    <td className="envasados-cell">
                                                        {editandoProducto?.id === producto.id ? (
                                                            <div className="envasados-edit">
                                                                {producto.envasados.map((env, idx) => (
                                                                    <div key={idx} className="envasado-edit-item">
                                                                        <span>{env.litros}L:</span>
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            value={editandoProducto.envasados.find(e => e.litros === env.litros)?.cantidad || 0}
                                                                            onChange={(e) => {
                                                                                const nuevosEnvasados = editandoProducto.envasados.map(ev => 
                                                                                    ev.litros === env.litros ? { ...ev, cantidad: parseInt(e.target.value) || 0 } : ev
                                                                                );
                                                                                setEditandoProducto({ ...editandoProducto, envasados: nuevosEnvasados });
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="envasados-list">
                                                                {producto.envasados.map((env, idx) => (
                                                                    <span key={idx} className="envasado-badge">
                                                                        {env.litros}L: {env.cantidad}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="actions-cell">
                                                        {editandoProducto?.id === producto.id ? (
                                                            <>
                                                                <button className="action-btn save" onClick={guardarEdicionProducto}>💾</button>
                                                                <button className="action-btn cancel" onClick={() => setEditandoProducto(null)}>✖</button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button className="action-btn edit" onClick={() => iniciarEdicionProducto(producto)}>✏️</button>
                                                                <button className="action-btn delete" onClick={() => eliminarProducto(producto.id)}>🗑️</button>
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="info-box">
                                <strong>ℹ️ Nota:</strong> Los productos agregados aquí estarán disponibles en la búsqueda de producción.
                                Los envasados se utilizan para calcular los litros totales.
                            </div>
                        </div>
                    </>
                );
            }
        } else if (seccionActiva === "esmaltes") {
            return (
                <>
                    <div className="cod-card">
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Buscar código especial..."
                                value={filtroEspeciales}
                                onChange={(e) => setFiltroEspeciales(e.target.value)}
                            />
                            {filtroEspeciales && (
                                <button onClick={() => setFiltroEspeciales("")} className="clear-filter">
                                    ✖
                                </button>
                            )}
                        </div>

                        <div className="add-especial-bar">
                            <input
                                type="text"
                                placeholder="Código especial (ej: ESP-001)..."
                                value={nuevoEspecial.codigo}
                                onChange={(e) => setNuevoEspecial({ ...nuevoEspecial, codigo: e.target.value.toUpperCase() })}
                            />
                            <input
                                type="text"
                                placeholder="Descripción..."
                                value={nuevoEspecial.descripcion}
                                onChange={(e) => setNuevoEspecial({ ...nuevoEspecial, descripcion: e.target.value })}
                            />
                            <button onClick={agregarEspecial}>
                                + Agregar Especial
                            </button>
                        </div>
                    </div>

                    <div className="cod-card table-card">
                        <div className="card-header-flex">
                            <h3 className="cod-card-title">⭐ CÓDIGOS ESPECIALES</h3>
                            <span className="count-badge">{codigosEspecialesFiltrados.length} especiales</span>
                        </div>

                        <div className="cod-table-wrapper">
                            <table className="cod-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Código</th>
                                        <th>Descripción</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {codigosEspecialesFiltrados.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="empty-state">
                                                {filtroEspeciales ? "No se encontraron códigos especiales" : "No hay códigos especiales registrados"}
                                            </td>
                                        </tr>
                                    ) : (
                                        codigosEspecialesFiltrados.map((especial, index) => (
                                            <tr key={especial.id}>
                                                <td>{index + 1}</td>
                                                <td>
                                                    {editandoEspecial?.id === especial.id ? (
                                                        <input
                                                            type="text"
                                                            className="edit-input"
                                                            value={editandoEspecial.codigo}
                                                            onChange={(e) => setEditandoEspecial({ ...editandoEspecial, codigo: e.target.value.toUpperCase() })}
                                                        />
                                                    ) : (
                                                        <span className="codigo-value">{especial.codigo}</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {editandoEspecial?.id === especial.id ? (
                                                        <input
                                                            type="text"
                                                            className="edit-input-desc"
                                                            value={editandoEspecial.descripcion}
                                                            onChange={(e) => setEditandoEspecial({ ...editandoEspecial, descripcion: e.target.value })}
                                                        />
                                                    ) : (
                                                        <span>{especial.descripcion}</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <button 
                                                        className={`status-badge ${especial.activo ? 'active' : 'inactive'}`}
                                                        onClick={() => toggleActivoEspecial(especial.id)}
                                                    >
                                                        {especial.activo ? '✓ Activo' : '✗ Inactivo'}
                                                    </button>
                                                </td>
                                                <td className="actions-cell">
                                                    {editandoEspecial?.id === especial.id ? (
                                                        <>
                                                            <button className="action-btn save" onClick={guardarEdicionEspecial}>💾</button>
                                                            <button className="action-btn cancel" onClick={cancelarEdicionEspecial}>✖</button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button className="action-btn edit" onClick={() => iniciarEdicionEspecial(especial)}>✏️</button>
                                                            <button className="action-btn delete" onClick={() => eliminarEspecial(especial.id)}>🗑️</button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="info-box">
                            <strong>ℹ️ Nota:</strong> Los códigos especiales son para pedidos únicos o urgentes en producción de Esmaltes.
                            Puedes activarlos/desactivarlos según sea necesario.
                        </div>
                    </div>
                </>
            );
        }
    };

    return (
        <div className="cod-screen-container">
            <div className="cod-glass-panel">
                {mensaje.texto && (
                    <div className={`cod-toast ${mensaje.tipo}`}>
                        {mensaje.texto}
                    </div>
                )}

                {/* SIDEBAR */}
                <aside className="cod-sidebar">
                    <div className="cod-logo">
                        <span className="cod-dot"></span>
                        <h2>GESTIÓN DE CÓDIGOS</h2>
                    </div>

                    {/* Sección principal: Vinílicas y Esmaltes */}
                    <nav className="cod-nav">
                        <div className="nav-label">SECCIONES</div>
                        <button 
                            className={`cod-nav-btn ${seccionActiva === "vinilicas" ? "active" : ""}`}
                            onClick={() => setSeccionActiva("vinilicas")}
                        >
                            <span className="nav-icon">💧</span> Vinílicas
                        </button>
                        <button 
                            className={`cod-nav-btn ${seccionActiva === "esmaltes" ? "active" : ""}`}
                            onClick={() => setSeccionActiva("esmaltes")}
                        >
                            <span className="nav-icon">✨</span> Esmaltes
                        </button>
                    </nav>

                    {/* Submenú para Vinílicas (solo visible cuando está seleccionado) */}
                    {seccionActiva === "vinilicas" && (
                        <>
                            <div className="nav-divider"></div>
                            <nav className="cod-nav">
                                <div className="nav-label">VINÍLICAS</div>
                                <button 
                                    className={`cod-nav-sub-btn ${subSeccionVinilicas === "productos" ? "active" : ""}`}
                                    onClick={() => setSubSeccionVinilicas("productos")}
                                >
                                    <span className="nav-icon">📦</span> Agregar Productos
                                </button>
                                <button 
                                    className={`cod-nav-sub-btn ${subSeccionVinilicas === "excluidos" ? "active" : ""}`}
                                    onClick={() => setSubSeccionVinilicas("excluidos")}
                                >
                                    <span className="nav-icon">🚫</span> Códigos Excluidos
                                </button>
                            </nav>
                        </>
                    )}

                    <div className="sidebar-footer">
                        <div className="stats-mini">
                            <span className="stats-number">
                                {seccionActiva === "vinilicas" 
                                    ? (subSeccionVinilicas === "productos" ? productos.length : codigos.length)
                                    : codigosEspeciales.filter(e => e.activo).length}
                            </span>
                            <span className="stats-label">
                                {seccionActiva === "vinilicas" 
                                    ? (subSeccionVinilicas === "productos" ? "Productos" : "Códigos excluidos")
                                    : "Especiales activos"}
                            </span>
                        </div>
                        <button className="cod-btn-exit" onClick={() => navigate("/mantenimiento")}>
                            ↩ Regresar a Menú
                        </button>
                    </div>
                </aside>

                {/* CONTENIDO PRINCIPAL */}
                <main className="cod-main-content">
                    <header className="cod-header">
                        <div className="cod-title-group">
                            <h1>
                                {seccionActiva === "vinilicas" 
                                    ? getTituloVinilicas()
                                    : "⭐ Códigos Especiales - Esmaltes"}
                            </h1>
                            <p>
                                {seccionActiva === "vinilicas" 
                                    ? getDescripcionVinilicas()
                                    : "Administra códigos especiales para pedidos urgentes o personalizados de Esmaltes"}
                            </p>
                        </div>
                    </header>

                    <div className="cod-workspace">
                        {renderContenido()}
                    </div>
                </main>
            </div>
        </div>
    );
}