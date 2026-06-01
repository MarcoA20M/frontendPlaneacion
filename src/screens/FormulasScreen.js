// src/screens/FormulasScreen.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { materiaPrimaService } from "../services/materiaPrimaService";
import { productoService } from "../services/productoService";
import { formulasService } from "../services/formulasService";
import "../styles/criticos.css";

export default function FormulasScreen() {
    const navigate = useNavigate();
    const [loadingContent, setLoadingContent] = useState(true); // 🔴 Solo para el contenido
    const [productos, setProductos] = useState([]);
    const [productosFiltrados, setProductosFiltrados] = useState([]);
    const [materiasPrimas, setMateriasPrimas] = useState([]);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [formulas, setFormulas] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [filtroTipo, setFiltroTipo] = useState("todos");
    
    // Estado para tanques (para el sidebar)
    const [tanques, setTanques] = useState([]);
    const [resumenDashboard, setResumenDashboard] = useState({
        totalTanques: 0,
        criticos: 0,
        alerta: 0,
        normales: 0
    });
    const [sidebarDataLoaded, setSidebarDataLoaded] = useState(false); // 🔴 Para el sidebar

    const [nuevaMateria, setNuevaMateria] = useState({
        materiaPrimaId: "",
        cantidadPorLitro: ""
    });
    const [mostrarFormNueva, setMostrarFormNueva] = useState(false);

    const cargarDatos = async () => {
        setLoadingContent(true);
        try {
            const [productosData, materiasData, tanquesData, resumenData] = await Promise.all([
                productoService.listarTodos(),
                materiaPrimaService.listarTodas(),
                materiaPrimaService.listarTodas(),
                materiaPrimaService.getResumenDashboard()
            ]);
            setProductos(productosData);
            setProductosFiltrados(productosData);
            setMateriasPrimas(materiasData);
            setTanques(tanquesData);
            setResumenDashboard(resumenData);
            setSidebarDataLoaded(true);
        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setLoadingContent(false);
        }
    };

    // Calcular inventario total para el sidebar
    const inventarioTotal = tanques.reduce((sum, t) => sum + (t.nivelActual || 0), 0);
    const capacidadTotal = tanques.reduce((sum, t) => sum + (t.capacidadMaxima || 0), 0);
    const tanquesCriticos = tanques.filter(t => t.critico);

    useEffect(() => {
        let filtrados = [...productos];
        if (busqueda) {
            filtrados = filtrados.filter(p => 
                p.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
                p.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
            );
        }
        if (filtroTipo !== "todos") {
            filtrados = filtrados.filter(p => {
                if (filtroTipo === "vinilica") return p.tipoPinturaId === 2;
                if (filtroTipo === "esmalte") return p.tipoPinturaId === 1;
                return true;
            });
        }
        setProductosFiltrados(filtrados);
    }, [busqueda, filtroTipo, productos]);

    const cargarFormulas = async (productoId) => {
        try {
            const data = await formulasService.listarPorProducto(productoId);
            const formulasConDatos = data.map(formula => {
                if (!formula.materiaPrima && formula.materiaPrimaId) {
                    const materiaEncontrada = materiasPrimas.find(mp => mp.id === formula.materiaPrimaId);
                    if (materiaEncontrada) {
                        formula.materiaPrima = {
                            id: materiaEncontrada.id,
                            codigo: materiaEncontrada.codigo,
                            nombre: materiaEncontrada.nombre,
                            tipo: materiaEncontrada.tipo
                        };
                    }
                }
                return formula;
            });
            setFormulas(formulasConDatos);
        } catch (error) {
            console.error("Error cargando fórmulas:", error);
            setFormulas([]);
        }
    };

    const seleccionarProducto = async (producto) => {
        const productoId = producto.id || producto.codigo;
        setProductoSeleccionado(producto);
        setMostrarFormNueva(false);
        setNuevaMateria({ materiaPrimaId: "", cantidadPorLitro: "" });
        await cargarFormulas(productoId);
    };

    const agregarMateriaPrima = async () => {
        if (!nuevaMateria.materiaPrimaId || !nuevaMateria.cantidadPorLitro) {
            alert("Selecciona una materia prima y escribe la cantidad por litro");
            return;
        }

        try {
            await formulasService.crear({
                productoId: productoSeleccionado.id || productoSeleccionado.codigo,
                materiaPrimaId: parseInt(nuevaMateria.materiaPrimaId),
                cantidadPorLitro: parseFloat(nuevaMateria.cantidadPorLitro)
            });
            
            alert("✅ Materia prima agregada");
            setNuevaMateria({ materiaPrimaId: "", cantidadPorLitro: "" });
            setMostrarFormNueva(false);
            await cargarFormulas(productoSeleccionado.id || productoSeleccionado.codigo);
        } catch (error) {
            alert("Error: " + error.message);
        }
    };

    const eliminarFormula = async (id, materiaPrimaNombre) => {
        if (window.confirm(`¿Eliminar "${materiaPrimaNombre}" de la fórmula?`)) {
            try {
                await formulasService.eliminar(id);
                alert("✅ Eliminado");
                await cargarFormulas(productoSeleccionado.id || productoSeleccionado.codigo);
            } catch (error) {
                alert("Error al eliminar");
            }
        }
    };

    const editarCantidad = async (id, nuevaCantidad) => {
        if (!nuevaCantidad || nuevaCantidad <= 0) {
            alert("Cantidad inválida");
            return;
        }
        
        const formula = formulas.find(f => f.id === id);
        if (!formula) return;
        
        try {
            await formulasService.actualizar(id, {
                productoId: productoSeleccionado.id || productoSeleccionado.codigo,
                materiaPrimaId: formula.materiaPrima.id,
                cantidadPorLitro: parseFloat(nuevaCantidad)
            });
            alert("✅ Cantidad actualizada");
            await cargarFormulas(productoSeleccionado.id || productoSeleccionado.codigo);
        } catch (error) {
            alert("Error al actualizar: " + error.message);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const materiasDisponibles = materiasPrimas.filter(mp => 
        !formulas.some(f => f.materiaPrima?.id === mp.id)
    );

    return (
        <div className="criticos-container">
            <div className="criticos-glass-panel">
                {/* SIDEBAR - Siempre visible, sin loading */}
                <aside className="criticos-sidebar">
                    <div className="sidebar-logo">
                        <span className="logo-icon">⚡</span>
                        <h2>Materia Prima</h2>
                    </div>

                    <nav className="sidebar-nav">
                        <div className="nav-label">PRINCIPAL</div>
                        <button
                            className="sidebar-btn"
                            onClick={() => navigate("/mantenimiento/criticos")}
                        >
                            <span className="btn-icon">📊</span>
                            Dashboard
                        </button>
                        <button
                            className="sidebar-btn"
                            onClick={() => navigate("/mantenimiento/criticos")}
                        >
                            <span className="btn-icon">🛢️</span>
                            Tanques
                        </button>
                        <button
                            className="sidebar-btn"
                            onClick={() => navigate("/mantenimiento/criticos")}
                        >
                            <span className="btn-icon">🚨</span>
                            Alertas
                            {tanquesCriticos.length > 0 && (
                                <span className="badge-alerta">{tanquesCriticos.length}</span>
                            )}
                        </button>
                    </nav>

                    <div className="nav-divider"></div>

                    <nav className="sidebar-nav">
                        <div className="nav-label">CONFIGURACIÓN</div>
                        <button
                            className="sidebar-btn active"
                            style={{ background: "rgba(192,0,255,0.2)" }}
                        >
                            <span className="btn-icon">📋</span>
                            Fórmulas
                        </button>
                    </nav>

                    <div className="sidebar-footer">
                        <div className="stats-resumen-sidebar">
                            <div className="stat-sidebar">
                                <span className="stat-value">{sidebarDataLoaded ? inventarioTotal.toLocaleString() : "---"}</span>
                                <span className="stat-label">Total L/Kg</span>
                            </div>
                            <div className="stat-sidebar">
                                <span className="stat-value">{sidebarDataLoaded && capacidadTotal > 0 ? ((inventarioTotal / capacidadTotal) * 100).toFixed(0) : "---"}%</span>
                                <span className="stat-label">Capacidad</span>
                            </div>
                        </div>
                        <button className="btn-volver" onClick={() => navigate("/mantenimiento")}>
                            ↩ Volver
                        </button>
                    </div>
                </aside>

                {/* CONTENIDO PRINCIPAL - Solo aquí va el loading */}
                <main className="criticos-main">
                    {loadingContent ? (
                        <div className="loading-content">
                            <div className="spinner-neon"></div>
                            <p>Cargando fórmulas...</p>
                        </div>
                    ) : (
                        <>
                            <header className="criticos-header">
                                <div className="header-titulo">
                                    <h1>📋 Gestión de Fórmulas</h1>
                                    <p>Define qué materias primas consume cada producto (cantidad por litro)</p>
                                </div>
                            </header>

                            <div className="formulas-layout-simple">
                                {/* Panel izquierdo - Productos */}
                                <div className="productos-panel-simple">
                                    <div className="panel-header-simple">
                                        <h3>📦 Productos</h3>
                                        <div className="search-simple">
                                            <input
                                                type="text"
                                                placeholder="🔍 Buscar..."
                                                value={busqueda}
                                                onChange={(e) => setBusqueda(e.target.value)}
                                            />
                                        </div>
                                        <div className="filtros-simple">
                                            <button className={`filtro-simple ${filtroTipo === "todos" ? "active" : ""}`} onClick={() => setFiltroTipo("todos")}>Todos</button>
                                            <button className={`filtro-simple ${filtroTipo === "vinilica" ? "active" : ""}`} onClick={() => setFiltroTipo("vinilica")}>💧 Vinílicas</button>
                                            <button className={`filtro-simple ${filtroTipo === "esmalte" ? "active" : ""}`} onClick={() => setFiltroTipo("esmalte")}>✨ Esmaltes</button>
                                        </div>
                                    </div>
                                    <div className="productos-lista-simple">
                                        {productosFiltrados.map(producto => (
                                            <div
                                                key={producto.codigo}
                                                className={`producto-simple ${productoSeleccionado?.id === producto.codigo ? 'active' : ''}`}
                                                onClick={() => seleccionarProducto(producto)}
                                            >
                                                <div className="producto-simple-codigo">{producto.codigo}</div>
                                                <div className="producto-simple-descripcion">{producto.descripcion}</div>
                                                <div className="producto-simple-tipo">{producto.tipoPinturaId === 1 ? "Esmalte" : "Vinílica"}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Panel derecho - Fórmulas */}
                                <div className="formulas-panel-simple">
                                    {!productoSeleccionado ? (
                                        <div className="empty-simple">
                                            <div className="empty-simple-icon">📦</div>
                                            <h3>Selecciona un producto</h3>
                                            <p>Haz clic en cualquier producto para ver su fórmula</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="producto-header-simple">
                                                <div className="producto-header-info">
                                                    <span className="producto-header-codigo">{productoSeleccionado.codigo}</span>
                                                    <span className="producto-header-descripcion">{productoSeleccionado.descripcion}</span>
                                                </div>
                                                <button className="btn-agregar-simple" onClick={() => setMostrarFormNueva(!mostrarFormNueva)}>
                                                    {mostrarFormNueva ? "✖ Cancelar" : "+ Agregar Materia Prima"}
                                                </button>
                                            </div>

                                            {mostrarFormNueva && (
                                                <div className="agregar-materia-simple">
                                                    <div className="agregar-row">
                                                        <select
                                                            className="agregar-select"
                                                            value={nuevaMateria.materiaPrimaId}
                                                            onChange={(e) => setNuevaMateria({ ...nuevaMateria, materiaPrimaId: e.target.value })}
                                                        >
                                                            <option value="">Seleccionar materia prima...</option>
                                                            {materiasDisponibles.map(mp => (
                                                                <option key={mp.id} value={mp.id}>
                                                                    {mp.codigo} - {mp.nombre} ({mp.tipo})
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <input
                                                            type="number"
                                                            step="0.001"
                                                            className="agregar-input"
                                                            placeholder="Cantidad por litro (Ej: 0.2875)"
                                                            value={nuevaMateria.cantidadPorLitro}
                                                            onChange={(e) => setNuevaMateria({ ...nuevaMateria, cantidadPorLitro: e.target.value })}
                                                        />
                                                        <button className="agregar-btn" onClick={agregarMateriaPrima}>➕ Agregar</button>
                                                    </div>
                                                    <div className="agregar-ayuda">
                                                        <small>💡 Ejemplo: Si consumes 230L de materia prima por cada 800L de producto → 230/800 = 0.2875 L/L</small>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="formulas-tabla-simple">
                                                {formulas.length === 0 && !mostrarFormNueva ? (
                                                    <div className="empty-formulas-simple">
                                                        <span>📋</span>
                                                        <p>No hay materias primas asignadas</p>
                                                        <button className="btn-outline-simple" onClick={() => setMostrarFormNueva(true)}>
                                                            + Agregar primera materia prima
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <table className="tabla-simple">
                                                        <thead>
                                                            <tr>
                                                                <th>Código</th>
                                                                <th>Materia Prima</th>
                                                                <th>Tipo</th>
                                                                <th>Litros / L</th>
                                                                <th></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {formulas.map(formula => (
                                                                <tr key={formula.id}>
                                                                    <td className="codigo-col"><code>{formula.materiaPrima?.codigo || "-"}</code></td>
                                                                    <td><strong>{formula.materiaPrima?.nombre || "-"}</strong></td>
                                                                    <td>
                                                                        <span className={`tipo-badge-simple ${formula.materiaPrima?.tipo?.toLowerCase()}`}>
                                                                            {formula.materiaPrima?.tipo || "-"}
                                                                        </span>
                                                                    </td>
                                                                    <td className="cantidad-col">
                                                                        <input
                                                                            type="number"
                                                                            step="0.001"
                                                                            className="cantidad-input"
                                                                            value={formula.cantidadPorLitro}
                                                                            onChange={(e) => editarCantidad(formula.id, e.target.value)}
                                                                            onBlur={() => cargarFormulas(productoSeleccionado.id || productoSeleccionado.codigo)}
                                                                        />
                                                                        <span className="unidad">L/L</span>
                                                                    </td>
                                                                    <td className="acciones-col">
                                                                        <button className="btn-eliminar-simple" onClick={() => eliminarFormula(formula.id, formula.materiaPrima?.nombre)}>
                                                                            🗑️
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                     </table>
                                                )}
                                            </div>

                                            <div className="resumen-simple">
                                                <div className="resumen-item">
                                                    <span>📊 Total materias primas:</span>
                                                    <strong>{formulas.length}</strong>
                                                </div>
                                                <div className="resumen-item">
                                                    <span>⚖️ Total consumo por 800L:</span>
                                                    <strong>{formulas.reduce((sum, f) => sum + (f.cantidadPorLitro || 0), 0).toFixed(2)} L</strong>
                                                </div>
                                                <div className="resumen-item">
                                                    <span>📦 Por litro:</span>
                                                    <strong>{(formulas.reduce((sum, f) => sum + (f.cantidadPorLitro || 0), 0) / 800).toFixed(4)} L/L</strong>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}