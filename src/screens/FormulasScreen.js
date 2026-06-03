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

    // Litraje personalizado
    const [litrosProduccion, setLitrosProduccion] = useState(800);

    // Estado para edición inline
    const [editandoId, setEditandoId] = useState(null);
    const [editandoValor, setEditandoValor] = useState("");

    const [nuevaMateria, setNuevaMateria] = useState({
        materiaPrimaId: "",
        cantidad: "",
        litrosBase: 800
    });
    const [mostrarFormNueva, setMostrarFormNueva] = useState(false);

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

            setProductos(productosData);
            setProductosFiltrados(productosData);
            setMateriasPrimas(materiasData);
            setTanques(tanquesData);
            setResumenDashboard(resumenData);
            setSidebarDataLoaded(true);

            const productoParam = getProductoParamFromUrl();
            if (productoParam) {
                let productoEncontrado = productosData.find(p =>
                    p.codigo?.toString().toLowerCase() === productoParam.toString().toLowerCase()
                );
                if (!productoEncontrado) {
                    productoEncontrado = productosData.find(p =>
                        p.id?.toString() === productoParam.toString()
                    );
                }
                if (productoEncontrado) {
                    await seleccionarProducto(productoEncontrado);
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
            const data = await formulasService.listarPorProducto(productoId);
            
            const formulasConDatos = data.map(formula => {
                if (formula.materiaPrima) {
                    return formula;
                }
                if (formula.materiaPrimaId) {
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
        setNuevaMateria({ materiaPrimaId: "", cantidad: "", litrosBase: 800 });
        setLitrosProduccion(800);
        setEditandoId(null);
        await cargarFormulas(productoId);
    };

    const agregarMateriaPrima = async () => {
        if (!nuevaMateria.materiaPrimaId || !nuevaMateria.cantidad) {
            alert("Selecciona una materia prima y escribe la cantidad");
            return;
        }

        const cantidad = parseFloat(nuevaMateria.cantidad);
        const litrosBase = parseFloat(nuevaMateria.litrosBase);

        if (isNaN(cantidad) || cantidad <= 0) {
            alert("Ingresa una cantidad válida");
            return;
        }

        if (isNaN(litrosBase) || litrosBase <= 0) {
            alert("Ingresa una cantidad de litros base válida");
            return;
        }

        const cantidadPorLitro = cantidad / litrosBase;

        try {
            await formulasService.crear({
                productoId: productoSeleccionado.id || productoSeleccionado.codigo,
                materiaPrimaId: parseInt(nuevaMateria.materiaPrimaId),
                cantidadPorLitro: cantidadPorLitro
            });

            alert(`✅ Materia prima agregada\n${cantidad} L para ${litrosBase} L de producto`);
            setNuevaMateria({ materiaPrimaId: "", cantidad: "", litrosBase: 800 });
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

    // 🔴 Función para editar la cantidad para el litraje actual
    const iniciarEdicion = (formula) => {
        const consumoActual = formula.cantidadPorLitro * litrosProduccion;
        setEditandoId(formula.id);
        setEditandoValor(consumoActual.toFixed(2));
    };

    // 🔴 Guardar la edición y recalcular la cantidad por litro
    const guardarEdicion = async (formula) => {
        const nuevaCantidadTotal = parseFloat(editandoValor);
        if (isNaN(nuevaCantidadTotal) || nuevaCantidadTotal < 0) {
            alert("Cantidad inválida");
            setEditandoId(null);
            return;
        }

        // Recalcular cantidad por litro basado en el litraje actual
        const nuevaCantidadPorLitro = nuevaCantidadTotal / litrosProduccion;

        try {
            await formulasService.actualizar(formula.id, {
                productoId: productoSeleccionado.id || productoSeleccionado.codigo,
                materiaPrimaId: formula.materiaPrima?.id || formula.materiaPrimaId,
                cantidadPorLitro: nuevaCantidadPorLitro
            });
            setEditandoId(null);
            await cargarFormulas(productoSeleccionado.id || productoSeleccionado.codigo);
        } catch (error) {
            alert("Error al actualizar: " + error.message);
        }
    };

    const irATrazabilidad = () => {
        navigate("/mantenimiento/criticos?tab=trazabilidad");
    };

    const irAGestionarMP = () => {
        navigate("/mantenimiento/materias-primas");
    };

    // Calcular consumo según litraje
    const calcularConsumoPorLitraje = (cantidadPorLitro, litrosDestino) => {
        return cantidadPorLitro * litrosDestino;
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

    const consumoTotal = formulas.reduce((sum, f) => sum + calcularConsumoPorLitraje(f.cantidadPorLitro, litrosProduccion), 0);

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
                        <button className="sidebar-btn" onClick={irAGestionarMP} style={{ marginTop: "4px" }}>
                            <span className="btn-icon">📦</span>
                            Gestionar Materias Primas
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
                                    <p>Define qué materias primas consume cada producto</p>
                                </div>
                                <div className="header-buttons">
                                    <button className="btn-trazabilidad-header" onClick={irATrazabilidad}>
                                        🔗 Ver Trazabilidad
                                    </button>
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
                                                <div className="header-actions">
                                                    <button className="btn-agregar-simple" onClick={() => setMostrarFormNueva(!mostrarFormNueva)}>
                                                        {mostrarFormNueva ? "✖ Cancelar" : "+ Agregar Materia Prima"}
                                                    </button>
                                                    {/* Input directo de litraje */}
                                                    <div className="litros-input-container">
                                                        <span className="litros-icon">📏</span>
                                                        <input
                                                            type="number"
                                                            className="litros-input-directo"
                                                            value={litrosProduccion}
                                                            onChange={(e) => setLitrosProduccion(parseFloat(e.target.value) || 0)}
                                                            step="1"
                                                            min="1"
                                                        />
                                                        <span className="litros-label">L</span>
                                                    </div>
                                                </div>
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
                                                            step="0.01"
                                                            className="agregar-input"
                                                            placeholder="Cantidad (Ej: 230)"
                                                            value={nuevaMateria.cantidad}
                                                            onChange={(e) => setNuevaMateria({ ...nuevaMateria, cantidad: e.target.value })}
                                                        />
                                                        <input
                                                            type="number"
                                                            step="1"
                                                            className="agregar-input litros-base-input"
                                                            placeholder="Litros base (Ej: 800)"
                                                            value={nuevaMateria.litrosBase}
                                                            onChange={(e) => setNuevaMateria({ ...nuevaMateria, litrosBase: e.target.value })}
                                                        />
                                                        <button className="agregar-btn" onClick={agregarMateriaPrima}>➕ Agregar</button>
                                                    </div>
                                                    <div className="agregar-ayuda">
                                                        <small>💡 Ejemplo: Si consumes 230L de materia prima para producir 800L de producto → Cantidad: 230, Litros base: 800</small>
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
                                                                <th>Para {litrosProduccion} L</th>
                                                                <th></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {formulas.map(formula => {
                                                                const consumoCalculado = calcularConsumoPorLitraje(formula.cantidadPorLitro, litrosProduccion);
                                                                return (
                                                                    <tr key={formula.id}>
                                                                        <td className="codigo-col">
                                                                            <code>{formula.materiaPrima?.codigo || "-"}</code>
                                                                        </td>
                                                                        <td>
                                                                            <strong>{formula.materiaPrima?.nombre || "-"}</strong>
                                                                        </td>
                                                                        <td>
                                                                            <span className={`tipo-badge-simple ${(formula.materiaPrima?.tipo || "").toLowerCase()}`}>
                                                                                {formula.materiaPrima?.tipo || "-"}
                                                                            </span>
                                                                        </td>
                                                                        <td className="cantidad-col">
                                                                            {editandoId === formula.id ? (
                                                                                <div className="edit-container">
                                                                                    <input
                                                                                        type="number"
                                                                                        step="0.01"
                                                                                        className="edit-input"
                                                                                        value={editandoValor}
                                                                                        onChange={(e) => setEditandoValor(e.target.value)}
                                                                                        autoFocus
                                                                                        onKeyPress={(e) => {
                                                                                            if (e.key === 'Enter') guardarEdicion(formula);
                                                                                            if (e.key === 'Escape') setEditandoId(null);
                                                                                        }}
                                                                                    />
                                                                                    <button className="edit-save" onClick={() => guardarEdicion(formula)}>✓</button>
                                                                                    <button className="edit-cancel" onClick={() => setEditandoId(null)}>✖</button>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="consumo-display" onClick={() => iniciarEdicion(formula)}>
                                                                                    <strong className="consumo-calculado">
                                                                                        {consumoCalculado.toFixed(2)} {formula.materiaPrima?.unidad || 'L'}
                                                                                    </strong>
                                                                                    <span className="edit-icon">✏️</span>
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td className="acciones-col">
                                                                            <button className="btn-eliminar-simple" onClick={() => eliminarFormula(formula.id, formula.materiaPrima?.nombre)}>
                                                                                🗑️
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                        {/* <tfoot>
                                                            <tr className="total-row">
                                                                <td colSpan="3"><strong>TOTAL</strong></td>
                                                                <td><strong style={{ color: '#2ecc71', fontSize: '14px' }}>{consumoTotal.toFixed(2)} L</strong></td>
                                                            </tr>
                                                        </tfoot> */}
                                                    </table>
                                                )}
                                            </div>

                                            <div className="resumen-simple">
                                                <div className="resumen-item">
                                                    <span>📊 Materias primas:</span>
                                                    <strong>{formulas.length}</strong>
                                                </div>
                                                <div className="resumen-item highlight">
                                                    <span>🎯 Consumo total para {litrosProduccion} L:</span>
                                                    <strong style={{ color: '#2ecc71' }}>{consumoTotal.toFixed(2)} L</strong>
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