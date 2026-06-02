// src/screens/FormulasScreen.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { materiaPrimaService } from "../services/materiaPrimaService";
import { productoService } from "../services/productoService";
import { formulasService } from "../services/formulasService";
import "../styles/criticos.css";

export default function FormulasScreen() {
    const navigate = useNavigate();
    const location = useLocation();
    const [loadingContent, setLoadingContent] = useState(true);
    const [productos, setProductos] = useState([]);
    const [productosFiltrados, setProductosFiltrados] = useState([]);
    const [materiasPrimas, setMateriasPrimas] = useState([]);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [formulas, setFormulas] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [filtroTipo, setFiltroTipo] = useState("todos");

    const [tanques, setTanques] = useState([]);
    const [resumenDashboard, setResumenDashboard] = useState({
        totalTanques: 0,
        criticos: 0,
        alerta: 0,
        normales: 0
    });
    const [sidebarDataLoaded, setSidebarDataLoaded] = useState(false);

    const [nuevaMateria, setNuevaMateria] = useState({
        materiaPrimaId: "",
        cantidadPorLitro: ""
    });
    const [mostrarFormNueva, setMostrarFormNueva] = useState(false);

    // Leer el parámetro 'producto' de la URL (puede ser código o ID)
    const getProductoParamFromUrl = () => {
        const params = new URLSearchParams(location.search);
        return params.get('producto');
    };

    const cargarDatos = async () => {
        setLoadingContent(true);
        try {
            const [productosData, materiasData, tanquesData, resumenData] = await Promise.all([
                productoService.listarTodos(),
                materiaPrimaService.listarTodas(),
                materiaPrimaService.listarTodas(),
                materiaPrimaService.getResumenDashboard()
            ]);
            
            console.log("📦 Productos cargados:", productosData);
            console.log("🔧 Materias primas cargadas:", materiasData);
            
            setProductos(productosData);
            setProductosFiltrados(productosData);
            setMateriasPrimas(materiasData);
            setTanques(tanquesData);
            setResumenDashboard(resumenData);
            setSidebarDataLoaded(true);

            // 🔴 Buscar producto por código o ID desde la URL
            const productoParam = getProductoParamFromUrl();
            console.log("🔍 Producto solicitado desde URL:", productoParam);
            
            if (productoParam) {
                // Buscar primero por código
                let productoEncontrado = productosData.find(p => 
                    p.codigo?.toString().toLowerCase() === productoParam.toString().toLowerCase()
                );
                
                // Si no encuentra por código, buscar por ID
                if (!productoEncontrado) {
                    productoEncontrado = productosData.find(p => 
                        p.id?.toString() === productoParam.toString()
                    );
                }
                
                if (productoEncontrado) {
                    console.log("✅ Producto encontrado:", productoEncontrado.codigo, productoEncontrado.descripcion);
                    await seleccionarProducto(productoEncontrado);
                } else {
                    console.log("❌ Producto no encontrado con parámetro:", productoParam);
                }
            }

        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setLoadingContent(false);
        }
    };

    const cargarFormulas = async (productoId) => {
        try {
            console.log("📋 Cargando fórmulas para producto ID:", productoId);
            const data = await formulasService.listarPorProducto(productoId);
            console.log("📋 Fórmulas recibidas:", data);
            
            const formulasConDatos = data.map(formula => {
                // Si la fórmula ya trae materiaPrima, usarla
                if (formula.materiaPrima) {
                    return formula;
                }
                // Si solo trae materiaPrimaId, buscar la materia prima
                if (formula.materiaPrimaId) {
                    const materiaEncontrada = materiasPrimas.find(mp => mp.id === formula.materiaPrimaId);
                    if (materiaEncontrada) {
                        formula.materiaPrima = {
                            id: materiaEncontrada.id,
                            codigo: materiaEncontrada.codigo,
                            nombre: materiaEncontrada.nombre,
                            tipo: materiaEncontrada.tipo
                        };
                    } else {
                        console.log("⚠️ Materia prima no encontrada para ID:", formula.materiaPrimaId);
                    }
                }
                return formula;
            });
            
            console.log("📋 Fórmulas procesadas:", formulasConDatos);
            setFormulas(formulasConDatos);
        } catch (error) {
            console.error("Error cargando fórmulas:", error);
            setFormulas([]);
        }
    };

    const seleccionarProducto = async (producto) => {
        console.log("🎯 Seleccionando producto:", producto);
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
                materiaPrimaId: formula.materiaPrima?.id || formula.materiaPrimaId,
                cantidadPorLitro: parseFloat(nuevaCantidad)
            });
            alert("✅ Cantidad actualizada");
            await cargarFormulas(productoSeleccionado.id || productoSeleccionado.codigo);
        } catch (error) {
            alert("Error al actualizar: " + error.message);
        }
    };

    // 🔴 Navegar a trazabilidad
    const irATrazabilidad = () => {
        navigate("/mantenimiento/criticos?tab=trazabilidad");
    };

    useEffect(() => {
        cargarDatos();
    }, []);

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

    const inventarioTotal = tanques.reduce((sum, t) => sum + (t.nivelActual || 0), 0);
    const capacidadTotal = tanques.reduce((sum, t) => sum + (t.capacidadMaxima || 0), 0);
    const tanquesCriticos = tanques.filter(t => t.critico);
    const materiasDisponibles = materiasPrimas.filter(mp =>
        !formulas.some(f => (f.materiaPrima?.id === mp.id) || (f.materiaPrimaId === mp.id))
    );

    return (
        <div className="criticos-container">
            <div className="criticos-glass-panel">
                <aside className="criticos-sidebar">
                    <div className="sidebar-logo">
                        <span className="logo-icon">⚡</span>
                        <h2>Materia Prima</h2>
                    </div>

                    <nav className="sidebar-nav">
                        <div className="nav-label">PRINCIPAL</div>
                        <button className="sidebar-btn" onClick={() => navigate("/mantenimiento/criticos")}>
                            <span className="btn-icon">📊</span>
                            Dashboard
                        </button>
                        <button className="sidebar-btn" onClick={() => navigate("/mantenimiento/criticos")}>
                            <span className="btn-icon">🛢️</span>
                            Tanques
                        </button>
                        <button className="sidebar-btn" onClick={() => navigate("/mantenimiento/criticos")}>
                            <span className="btn-icon">🚨</span>
                            Alertas
                            {tanquesCriticos.length > 0 && (
                                <span className="badge-alerta">{tanquesCriticos.length}</span>
                            )}
                        </button>
                        {/* 🔴 BOTÓN DE TRAZABILIDAD EN EL SIDEBAR */}
                        <button className="sidebar-btn" onClick={irATrazabilidad}>
                            <span className="btn-icon">🔗</span>
                            Trazabilidad
                        </button>
                    </nav>

                    <div className="nav-divider"></div>

                    <nav className="sidebar-nav">
                        <div className="nav-label">CONFIGURACIÓN</div>
                        <button className="sidebar-btn active" style={{ background: "rgba(192,0,255,0.2)" }}>
                            <span className="btn-icon">📋</span>
                           Consultar codigos
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
                                                className={`producto-simple ${productoSeleccionado?.codigo === producto.codigo ? 'active' : ''}`}
                                                onClick={() => seleccionarProducto(producto)}
                                            >
                                                <div className="producto-simple-codigo">{producto.codigo}</div>
                                                <div className="producto-simple-descripcion">{producto.descripcion || "Sin descripción"}</div>
                                                <div className="producto-simple-tipo">{producto.tipoPinturaId === 1 ? "Esmalte" : "Vinílica"}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

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
                                                    <span className="producto-header-descripcion">{productoSeleccionado.descripcion || "Sin descripción"}</span>
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
                                                                    <td className="codigo-col">
                                                                        <code>{formula.materiaPrima?.codigo || formula.materiaPrimaCodigo || "-"}</code>
                                                                    </td>
                                                                    <td>
                                                                        <strong>{formula.materiaPrima?.nombre || formula.materiaPrimaNombre || "-"}</strong>
                                                                    </td>
                                                                    <td>
                                                                        <span className={`tipo-badge-simple ${(formula.materiaPrima?.tipo || formula.materiaPrimaTipo || "").toLowerCase()}`}>
                                                                            {formula.materiaPrima?.tipo || formula.materiaPrimaTipo || "-"}
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
                                                                        <button className="btn-eliminar-simple" onClick={() => eliminarFormula(formula.id, formula.materiaPrima?.nombre || formula.materiaPrimaNombre)}>
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