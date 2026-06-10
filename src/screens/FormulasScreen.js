// src/screens/FormulasScreen.js - VERSIÓN COMPLETA CON IMAGEN DE FAMILIA
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { materiaPrimaService } from "../services/materiaPrimaService";
import { productoService } from "../services/productoService";
import { formulasService } from "../services/formulasService";
import { familiaService } from "../services/familiaService";
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
    const [mostrarSoloImportantesEnTabla, setMostrarSoloImportantesEnTabla] = useState(false);
    const [tanques, setTanques] = useState([]);
    const [resumenDashboard, setResumenDashboard] = useState({
        totalTanques: 0,
        criticos: 0,
        alerta: 0,
        normales: 0
    });
    const [sidebarDataLoaded, setSidebarDataLoaded] = useState(false);
    const [litrosProduccion, setLitrosProduccion] = useState(800);
    const [editandoId, setEditandoId] = useState(null);
    const [editandoValor, setEditandoValor] = useState("");
    const [nuevaMateria, setNuevaMateria] = useState({
        materiaPrimaId: "",
        cantidad: "",
        litrosBase: 800
    });
    const [mostrarFormNueva, setMostrarFormNueva] = useState(false);
    const [busquedaMP, setBusquedaMP] = useState("");
    const [mostrarDropdownMP, setMostrarDropdownMP] = useState(false);
    const [materiasFiltradas, setMateriasFiltradas] = useState([]);
    const dropdownRef = useRef(null);

    // 🔴 ESTADOS PARA LA IMAGEN DE FAMILIA
    const [imagenFamilia, setImagenFamilia] = useState(null);
    const [familiaInfo, setFamiliaInfo] = useState(null);
    const [cargandoImagen, setCargandoImagen] = useState(false);

    const MATERIAS_IMPORTANTES = [
        "CCA10", "CCA20", "CCM30", "CCM60", "RVA50", "RVO10",
        "RIE30", "RAC30", "RRN10", "SXI10", "SGA10", "TTI06",
        "CCP15", "RRN20", "AMP10", "AEA10", "ACO20", "ABL10", "TMB10"
    ];

    const formulasFiltradas = mostrarSoloImportantesEnTabla
        ? formulas.filter(f => MATERIAS_IMPORTANTES.includes(f.materiaPrima?.codigo))
        : formulas;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setMostrarDropdownMP(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

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

        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setLoadingContent(false);
        }
    };

    // 🔴 FUNCIÓN PARA CARGAR LA IMAGEN DE LA FAMILIA
    const cargarImagenFamilia = async (familiaId) => {
        if (!familiaId) {
            setImagenFamilia(null);
            setFamiliaInfo(null);
            return;
        }

        setCargandoImagen(true);
        try {
            // Cargar información de la familia
            const familiaResponse = await fetch(`http://localhost:8080/api/familias/${familiaId}`);
            if (familiaResponse.ok) {
                const familia = await familiaResponse.json();
                setFamiliaInfo(familia);
            }

            // Obtener URL de la imagen
            const imgUrl = familiaService.getImagenUrl(familiaId);
            setImagenFamilia(imgUrl);
        } catch (error) {
            console.error("Error cargando imagen de familia:", error);
            setImagenFamilia(null);
            setFamiliaInfo(null);
        } finally {
            setCargandoImagen(false);
        }
    };

    // 🔴 EFECTO para manejar el parámetro de URL después de que productos esté cargado
    useEffect(() => {
        if (productos.length > 0 && !productoSeleccionado) {
            const productoParam = getProductoParamFromUrl();
            if (productoParam) {
                console.log("Buscando producto con parámetro:", productoParam);
                let productoEncontrado = productos.find(p =>
                    p.codigo?.toString().toLowerCase() === productoParam.toString().toLowerCase()
                );
                if (!productoEncontrado) {
                    productoEncontrado = productos.find(p =>
                        p.id?.toString() === productoParam.toString()
                    );
                }
                if (productoEncontrado) {
                    console.log("Producto encontrado:", productoEncontrado);
                    seleccionarProducto(productoEncontrado);
                } else {
                    console.log("Producto no encontrado para el parámetro:", productoParam);
                }
            }
        }
    }, [productos]);

    // 🔴 EFECTO para escuchar cambios en la URL mientras el componente está montado
    useEffect(() => {
        if (productos.length > 0) {
            const productoParam = getProductoParamFromUrl();
            if (productoParam) {
                const productoEncontrado = productos.find(p =>
                    p.codigo?.toString().toLowerCase() === productoParam.toString().toLowerCase() ||
                    p.id?.toString() === productoParam.toString()
                );
                if (productoEncontrado && productoSeleccionado?.codigo !== productoEncontrado.codigo) {
                    seleccionarProducto(productoEncontrado);
                }
            }
        }
    }, [location.search, productos]);

    useEffect(() => {
        if (!mostrarFormNueva) {
            setMateriasFiltradas([]);
            return;
        }

        const materiasNoUsadas = materiasPrimas.filter(mp =>
            !formulas.some(f => (f.materiaPrima?.id === mp.id) || (f.materiaPrimaId === mp.id))
        );

        if (busquedaMP.trim() === "") {
            setMateriasFiltradas([]);
            return;
        }

        const filtradas = materiasNoUsadas.filter(mp =>
            mp.codigo?.toLowerCase().includes(busquedaMP.toLowerCase()) ||
            mp.nombre?.toLowerCase().includes(busquedaMP.toLowerCase())
        );

        setMateriasFiltradas(filtradas.slice(0, 10));
    }, [busquedaMP, materiasPrimas, formulas, mostrarFormNueva]);

    const cargarFormulas = async (productoId) => {
        try {
            const data = await formulasService.listarPorProducto(productoId);
            const formulasConDatos = data.map(formula => {
                if (formula.materiaPrima) return formula;
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
        console.log("Seleccionando producto:", producto);
        const productoId = producto.id || producto.codigo;
        setProductoSeleccionado(producto);
        setMostrarFormNueva(false);
        setNuevaMateria({ materiaPrimaId: "", cantidad: "", litrosBase: 800 });
        setLitrosProduccion(800);
        setEditandoId(null);
        setBusquedaMP("");
        setMostrarDropdownMP(false);
        setMateriasFiltradas([]);

        // 🔴 Cargar imagen de la familia del producto
        if (producto.familiaId) {
            await cargarImagenFamilia(producto.familiaId);
        } else {
            setImagenFamilia(null);
            setFamiliaInfo(null);
        }

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
            setBusquedaMP("");
            setMateriasFiltradas([]);
            setMostrarDropdownMP(false);
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

    const iniciarEdicion = (formula) => {
        const consumoActual = formula.cantidadPorLitro * litrosProduccion;
        setEditandoId(formula.id);
        setEditandoValor(consumoActual.toFixed(2));
    };

    const guardarEdicion = async (formula) => {
        const nuevaCantidadTotal = parseFloat(editandoValor);
        if (isNaN(nuevaCantidadTotal) || nuevaCantidadTotal < 0) {
            alert("Cantidad inválida");
            setEditandoId(null);
            return;
        }

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
    const consumoTotal = formulasFiltradas.reduce((sum, f) => sum + calcularConsumoPorLitraje(f.cantidadPorLitro, litrosProduccion), 0);
    const totalImportantesEnFormula = formulas.filter(f => MATERIAS_IMPORTANTES.includes(f.materiaPrima?.codigo)).length;

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
                                            <div className="formula-header">
                                                <div className="formula-header-info">
                                                    {/* Imagen de la familia */}
                                                    <div className="formula-imagen-wrap">
                                                        {cargandoImagen ? (
                                                            <div className="formula-imagen-loading">
                                                                <div className="formula-spinner"></div>
                                                            </div>
                                                        ) : imagenFamilia ? (
                                                            <div className="formula-imagen-circle">
                                                                <img
                                                                    src={imagenFamilia}
                                                                    alt={familiaInfo?.nombre || "Familia"}
                                                                    className="formula-imagen-img"
                                                                    onError={(e) => {
                                                                        e.target.style.display = 'none';
                                                                        e.target.parentElement.innerHTML = '<div class="formula-imagen-fallback">🎨</div>';
                                                                    }}
                                                                />
                                                                {familiaInfo && (
                                                                    <div className="formula-imagen-badge">
                                                                        {familiaInfo.nombre?.substring(0, 2).toUpperCase() || "Fam"}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="formula-imagen-placeholder">
                                                                <div className="formula-placeholder-content">
                                                                    <span className="formula-placeholder-icon">📦</span>
                                                                    <span className="formula-placeholder-text">Sin familia</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Información del producto */}
                                                    <div className="formula-info-text">
                                                        <div className="formula-code-row">
                                                            <span className="formula-code-badge">Código</span>
                                                            <span className="formula-code-value">{productoSeleccionado.codigo}</span>
                                                        </div>
                                                        <h2 className="formula-name">
                                                            {productoSeleccionado.descripcion || "Sin descripción"}
                                                        </h2>
                                                        {familiaInfo && (
                                                            <div className="formula-family-tag">
                                                                <span className="formula-family-icon">🏷️</span>
                                                                <span>{familiaInfo.nombre}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="formula-actions">
                                                    <button className="btn-agregar-simple" onClick={() => {
                                                        setMostrarFormNueva(!mostrarFormNueva);
                                                        setMostrarDropdownMP(false);
                                                        setBusquedaMP("");
                                                        setMateriasFiltradas([]);
                                                    }}>
                                                        {mostrarFormNueva ? "✖ Cancelar" : "+ Agregar Materia Prima"}
                                                    </button>

                                                    <div className="insights-toggle-materias">
                                                        <button
                                                            className={`insight-toggle-btn-materias ${mostrarSoloImportantesEnTabla ? 'active' : ''}`}
                                                            onClick={() => setMostrarSoloImportantesEnTabla(true)}
                                                            title="Mostrar solo las materias primas importantes de la fórmula"
                                                        >
                                                            📌 {totalImportantesEnFormula}
                                                        </button>
                                                        <button
                                                            className={`insight-toggle-btn-materias ${!mostrarSoloImportantesEnTabla ? 'active' : ''}`}
                                                            onClick={() => setMostrarSoloImportantesEnTabla(false)}
                                                            title="Mostrar todas las materias primas de la fórmula"
                                                        >
                                                            📦 {formulas.length}
                                                        </button>
                                                    </div>

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
                                                        <div className="buscador-mp-container" ref={dropdownRef}>
                                                            <input
                                                                type="text"
                                                                className="buscador-mp-input"
                                                                placeholder="🔍 Buscar materia prima por código o nombre..."
                                                                value={busquedaMP}
                                                                onChange={(e) => {
                                                                    setBusquedaMP(e.target.value);
                                                                    setMostrarDropdownMP(true);
                                                                }}
                                                                onFocus={() => setMostrarDropdownMP(true)}
                                                            />
                                                            {mostrarDropdownMP && materiasFiltradas.length > 0 && (
                                                                <div className="buscador-mp-dropdown">
                                                                    {materiasFiltradas.map(mp => (
                                                                        <div
                                                                            key={mp.id}
                                                                            className="buscador-mp-item"
                                                                            onClick={() => {
                                                                                setNuevaMateria({ ...nuevaMateria, materiaPrimaId: mp.id.toString() });
                                                                                setBusquedaMP(`${mp.codigo} - ${mp.nombre}`);
                                                                                setMostrarDropdownMP(false);
                                                                            }}
                                                                        >
                                                                            <span className="mp-item-codigo">{mp.codigo}</span>
                                                                            <span className="mp-item-nombre">{mp.nombre}</span>
                                                                            <span className="mp-item-tipo">{mp.tipo}</span>
                                                                            {MATERIAS_IMPORTANTES.includes(mp.codigo) && (
                                                                                <span className="mp-item-importante">📌</span>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {mostrarDropdownMP && busquedaMP && materiasFiltradas.length === 0 && (
                                                                <div className="buscador-mp-sin-resultados">
                                                                    <span>🔍 No se encontraron materias primas disponibles</span>
                                                                </div>
                                                            )}
                                                        </div>
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
                                                    {nuevaMateria.cantidad && nuevaMateria.litrosBase && (
                                                        <div className="preview-calculo">
                                                            <span className="preview-label">Equivalente a:</span>
                                                            <strong>
                                                                {(parseFloat(nuevaMateria.cantidad) / parseFloat(nuevaMateria.litrosBase)).toFixed(4)} L/L
                                                            </strong>
                                                            <span className="preview-note">(por cada litro de producto)</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="formulas-tabla-simple">
                                                {formulasFiltradas.length === 0 && !mostrarFormNueva ? (
                                                    <div className="empty-formulas-simple">
                                                        <span>📋</span>
                                                        <p>
                                                            {mostrarSoloImportantesEnTabla
                                                                ? "No hay materias primas importantes asignadas a este producto"
                                                                : "No hay materias primas asignadas a este producto"}
                                                        </p>
                                                        <button className="btn-outline-simple" onClick={() => setMostrarFormNueva(true)}>
                                                            + Agregar materia prima
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
                                                            {formulasFiltradas.map(formula => {
                                                                const consumoCalculado = calcularConsumoPorLitraje(formula.cantidadPorLitro, litrosProduccion);
                                                                const esImportante = MATERIAS_IMPORTANTES.includes(formula.materiaPrima?.codigo);
                                                                return (
                                                                    <tr key={formula.id} className={esImportante ? "fila-importante" : ""}>
                                                                        <td className="codigo-col">
                                                                            <code>{formula.materiaPrima?.codigo || "-"}</code>
                                                                            {esImportante && <span className="estrella-importante">📌</span>}
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
                                                    </table>
                                                )}
                                            </div>

                                            <div className="resumen-simple">
                                                <div className="resumen-item">
                                                    <span>📊 Materias primas:</span>
                                                    <strong>{formulasFiltradas.length} {mostrarSoloImportantesEnTabla && formulas.length !== formulasFiltradas.length && `(de ${formulas.length} totales)`}</strong>
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