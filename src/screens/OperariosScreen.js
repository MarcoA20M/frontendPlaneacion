import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/operarios.css";

export default function OperariosScreen() {
    const navigate = useNavigate();
    const [tabActiva, setTabActiva] = useState("vinilica");
    const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
    
    // Estado para operarios de Vinílica
    const [operariosVinilica, setOperariosVinilica] = useState(() => {
        const guardado = localStorage.getItem("operarios_vinilica");
        return guardado ? JSON.parse(guardado) : [
            { id: 1, nombre: "Pedro", puesto: "Operario de Máquinas", activo: true },
            { id: 2, nombre: "Carlos", puesto: "Operario de Máquinas", activo: true },
            { id: 3, nombre: "Yunior", puesto: "Operario de Máquinas", activo: true },
            { id: 4, nombre: "Luis", puesto: "Operario de Máquinas", activo: true }
        ];
    });
    
    // Estado para asignación BASE (sin rotación aplicada)
    const [configGruposBase, setConfigGruposBase] = useState(() => {
        const guardado = localStorage.getItem("config_grupos_base_vinilica");
        return guardado ? JSON.parse(guardado) : {
            grupo0: { 
                operarioId: 1, 
                maquinas: [101, 102], 
                nombre: "Grupo 0 (VI-101, VI-102)" 
            },
            grupo1: { 
                operarioId: 2, 
                maquinas: [103, 104], 
                nombre: "Grupo 1 (VI-103, VI-104)" 
            },
            grupo2: { 
                operarioId: 3, 
                maquinas: [105, 106], 
                nombre: "Grupo 2 (VI-105, VI-106)" 
            },
            grupo3: { 
                operarioId: 4, 
                maquinas: [107, 108], 
                nombre: "Grupo 3 (VI-107, VI-108)" 
            }
        };
    });
    
    // Estado para la rotación actual (cuántas semanas se ha rotado)
    const [semanasRotadas, setSemanasRotadas] = useState(() => {
        const guardado = localStorage.getItem("semanas_rotadas_vinilica");
        return guardado ? parseInt(guardado) : 0;
    });
    
    // Estado para otros operarios
    const [otrosOperarios, setOtrosOperarios] = useState(() => {
        const guardado = localStorage.getItem("otros_operarios");
        return guardado ? JSON.parse(guardado) : [
            { id: 100, nombre: "Aldo", puesto: "Preparador", area: "esmaltes" },
            { id: 101, nombre: "Germán", puesto: "Molienda", area: "esmaltes" },
            { id: 102, nombre: "Javier", puesto: "Ayudante", area: "esmaltes" },
            { id: 103, nombre: "Ricardo", puesto: "Preparador", area: "esmaltes" },
            { id: 104, nombre: "Beto", puesto: "Mezclador", area: "esmaltes" }
        ];
    });
    
    // Función para calcular la configuración actual basada en las semanas rotadas
    const calcularConfigActual = () => {
        const gruposOrden = ["grupo0", "grupo1", "grupo2", "grupo3"];
        const asignacionBase = gruposOrden.map(g => configGruposBase[g].operarioId);
        
        // Aplicar rotación según semanasRotadas
        const rotacionAplicada = [...asignacionBase];
        for (let i = 0; i < semanasRotadas; i++) {
            // Rotar hacia la derecha (el último pasa al primero)
            const ultimo = rotacionAplicada.pop();
            rotacionAplicada.unshift(ultimo);
        }
        
        // Construir la configuración actual
        const configActual = {};
        gruposOrden.forEach((grupo, idx) => {
            configActual[grupo] = {
                ...configGruposBase[grupo],
                operarioId: rotacionAplicada[idx]
            };
        });
        
        return configActual;
    };
    
    // Estado derivado: configuración actual con rotación aplicada
    const [configGrupos, setConfigGrupos] = useState(() => calcularConfigActual());
    
    // Guardar cambios cuando cambien las semanas rotadas o la configuración base
    useEffect(() => {
        const nuevaConfig = calcularConfigActual();
        setConfigGrupos(nuevaConfig);
    }, [semanasRotadas, configGruposBase]);
    
    // Guardar todo en localStorage
    useEffect(() => {
        localStorage.setItem("operarios_vinilica", JSON.stringify(operariosVinilica));
        localStorage.setItem("config_grupos_base_vinilica", JSON.stringify(configGruposBase));
        localStorage.setItem("semanas_rotadas_vinilica", semanasRotadas.toString());
        localStorage.setItem("otros_operarios", JSON.stringify(otrosOperarios));
        
        // Notificar a otros componentes
        window.dispatchEvent(new CustomEvent("vinilicaConfigUpdated", {
            detail: { 
                operarios: operariosVinilica, 
                grupos: configGrupos, 
                semanasRotadas 
            }
        }));
    }, [operariosVinilica, configGruposBase, semanasRotadas, otrosOperarios, configGrupos]);

    // Guardar configuración en un formato más accesible para api.js
useEffect(() => {
  // Guardar la configuración actual en un formato especial para api.js
  const configParaAPI = {
    operarios: operariosVinilica.map(op => ({ id: op.id, nombre: op.nombre })),
    gruposBase: configGruposBase,
    semanasRotadas: semanasRotadas,
    ultimaActualizacion: new Date().toISOString()
  };
  localStorage.setItem("configuracion_rotacion_api", JSON.stringify(configParaAPI));
}, [operariosVinilica, configGruposBase, semanasRotadas]);
    
    const mostrarMensaje = (texto, tipo = "success") => {
        setMensaje({ texto, tipo });
        setTimeout(() => setMensaje({ texto: "", tipo: "" }), 3000);
    };
    
    // ========== CRUD OPERARIOS VINÍLICA ==========
    const agregarOperarioVinilica = (nombre) => {
        if (!nombre.trim()) {
            mostrarMensaje("❌ El nombre no puede estar vacío", "error");
            return;
        }
        if (operariosVinilica.some(op => op.nombre.toLowerCase() === nombre.toLowerCase())) {
            mostrarMensaje(`❌ "${nombre}" ya existe`, "error");
            return;
        }
        const nuevoId = Math.max(...operariosVinilica.map(op => op.id), 0) + 1;
        setOperariosVinilica([...operariosVinilica, { 
            id: nuevoId, 
            nombre: nombre.trim(), 
            puesto: "Operario de Máquinas",
            activo: true 
        }]);
        mostrarMensaje(`✅ "${nombre}" agregado correctamente`);
    };
    
    const editarOperarioVinilica = (id, nuevoNombre) => {
        if (!nuevoNombre.trim()) return;
        if (operariosVinilica.some(op => op.nombre.toLowerCase() === nuevoNombre.toLowerCase() && op.id !== id)) {
            mostrarMensaje(`❌ "${nuevoNombre}" ya existe`, "error");
            return;
        }
        setOperariosVinilica(prev => prev.map(op => 
            op.id === id ? { ...op, nombre: nuevoNombre.trim() } : op
        ));
        mostrarMensaje(`✏️ Nombre actualizado a "${nuevoNombre}"`);
    };
    
    const eliminarOperarioVinilica = (id) => {
        const operario = operariosVinilica.find(op => op.id === id);
        if (window.confirm(`¿Eliminar a "${operario.nombre}" de Vinílicas?`)) {
            setOperariosVinilica(prev => prev.filter(op => op.id !== id));
            // Desasignar de grupos base
            const nuevosGruposBase = { ...configGruposBase };
            Object.keys(nuevosGruposBase).forEach(grupo => {
                if (nuevosGruposBase[grupo].operarioId === id) {
                    nuevosGruposBase[grupo].operarioId = null;
                }
            });
            setConfigGruposBase(nuevosGruposBase);
            mostrarMensaje(`🗑️ "${operario.nombre}" eliminado`);
        }
    };
    
    // ========== CRUD OTROS OPERARIOS ==========
    const agregarOtroOperario = (nombre, puesto, area) => {
        if (!nombre.trim()) {
            mostrarMensaje("❌ El nombre no puede estar vacío", "error");
            return;
        }
        const nuevoId = Math.max(...otrosOperarios.map(op => op.id), 0) + 1;
        setOtrosOperarios([...otrosOperarios, {
            id: nuevoId,
            nombre: nombre.trim(),
            puesto: puesto.trim() || "Sin puesto",
            area: area
        }]);
        mostrarMensaje(`✅ "${nombre}" agregado a ${area}`);
    };
    
    const editarOtroOperario = (id, campo, valor) => {
        setOtrosOperarios(prev => prev.map(op => 
            op.id === id ? { ...op, [campo]: valor } : op
        ));
        mostrarMensaje(`✏️ Actualizado`);
    };
    
    const eliminarOtroOperario = (id) => {
        const operario = otrosOperarios.find(op => op.id === id);
        if (window.confirm(`¿Eliminar a "${operario.nombre}"?`)) {
            setOtrosOperarios(prev => prev.filter(op => op.id !== id));
            mostrarMensaje(`🗑️ "${operario.nombre}" eliminado`);
        }
    };
    
    // ========== ASIGNACIÓN DE GRUPOS BASE ==========
    const asignarOperarioAGrupoBase = (grupoId, operarioId) => {
        setConfigGruposBase(prev => ({
            ...prev,
            [grupoId]: { ...prev[grupoId], operarioId: parseInt(operarioId) || null }
        }));
        const operario = operariosVinilica.find(op => op.id === parseInt(operarioId));
        mostrarMensaje(`📌 ${operario?.nombre || "Nadie"} asignado como base al ${configGruposBase[grupoId].nombre}`);
        
        // Resetear rotación al cambiar asignación base
        setSemanasRotadas(0);
    };
    
    // ========== ROTACIÓN SEMANAL ==========
    const rotarSemanal = () => {
        const nuevasSemanas = semanasRotadas + 1;
        setSemanasRotadas(nuevasSemanas);
        mostrarMensaje(`🔄 Rotación semanal aplicada (Semana ${nuevasSemanas})`);
    };
    
    const resetearRotacion = () => {
        if (window.confirm("¿Resetear la rotación a la configuración inicial?")) {
            setSemanasRotadas(0);
            mostrarMensaje("🔄 Rotación reseteada a la configuración base");
        }
    };
    
    // ========== UTILIDADES ==========
    const getNombreOperario = (id) => {
        if (!id) return "Sin asignar";
        const operario = operariosVinilica.find(op => op.id === id);
        return operario ? operario.nombre : "Desconocido";
    };
    
    const operariosFiltrados = tabActiva === "vinilica" 
        ? operariosVinilica 
        : otrosOperarios.filter(op => op.area === tabActiva);
    
    // Vista previa de rotación (próxima semana)
    const gruposOrden = ["grupo0", "grupo1", "grupo2", "grupo3"];
    const previewRotacion = gruposOrden.map((grupo, idx) => {
        // Calculamos cómo quedaría con una semana más de rotación
        const asignacionBase = gruposOrden.map(g => configGruposBase[g].operarioId);
        const rotacionActual = [...asignacionBase];
        for (let i = 0; i < semanasRotadas; i++) {
            const ultimo = rotacionActual.pop();
            rotacionActual.unshift(ultimo);
        }
        
        const rotacionSiguiente = [...rotacionActual];
        const ultimo = rotacionSiguiente.pop();
        rotacionSiguiente.unshift(ultimo);
        
        return {
            grupo: configGruposBase[grupo].nombre,
            actual: getNombreOperario(rotacionActual[idx]),
            siguiente: getNombreOperario(rotacionSiguiente[idx])
        };
    });
    
    return (
        <div className="op-screen-container">
            <div className="op-glass-panel">
                
                {mensaje.texto && (
                    <div className={`op-toast ${mensaje.tipo}`}>
                        {mensaje.texto}
                    </div>
                )}
                
                {/* SIDEBAR */}
                <aside className="op-sidebar">
                    <div className="op-logo">
                        <span className="op-dot"></span>
                        <h2>RECURSOS HUMANOS</h2>
                    </div>
                    
                    <nav className="op-nav">
                        <div className="nav-label">SECCIONES</div>
                        <button 
                            className={`op-nav-btn ${tabActiva === "vinilica" ? "active" : ""}`}
                            onClick={() => setTabActiva("vinilica")}
                        >
                            <span className="nav-icon">💧</span> Vinílicas (Máquinas)
                        </button>
                        <button 
                            className={`op-nav-btn ${tabActiva === "esmaltes" ? "active" : ""}`}
                            onClick={() => setTabActiva("esmaltes")}
                        >
                            <span className="nav-icon">✨</span> Esmaltes
                        </button>
                    </nav>
                    
                    <div className="sidebar-footer">
                        <button className="op-btn-exit" onClick={() => navigate("/mantenimiento")}>
                            ↩ Regresar a Menú
                        </button>
                    </div>
                </aside>
                
                {/* CONTENIDO PRINCIPAL */}
                <main className="op-main-content">
                    <header className="op-header">
                        <div className="op-title-group">
                            <h1>Panel de Operarios: {tabActiva === "vinilica" ? "VINÍLICAS" : "ESMALTES"}</h1>
                            <p>Gestión dinámica de personal y rotación semanal</p>
                        </div>
                    </header>
                    
                    <div className={`op-workspace ${tabActiva === 'vinilica' ? 'with-sidebar' : ''}`}>
                        
                        {/* TABLA DE PERSONAL */}
                        <div className="op-card table-card">
                            <div className="card-header-flex">
                                <h3 className="op-card-title">
                                    {tabActiva === "vinilica" ? "Operarios de Máquinas (VI-101 a VI-108)" : "Plantilla de Trabajo"}
                                </h3>
                                <span className="count-badge">{operariosFiltrados.length} Operarios</span>
                            </div>
                            
                            <div className="op-table-wrapper">
                                <table className="op-table">
                                    <thead>
                                        <tr>
                                            <th>Nombre (Editable)</th>
                                            <th>Puesto</th>
                                            <th className="txt-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {operariosFiltrados.map(op => (
                                            <tr key={op.id} className="row-hover">
                                                <td>
                                                    <input 
                                                        className="op-input-edit"
                                                        value={op.nombre}
                                                        onChange={(e) => {
                                                            if (tabActiva === "vinilica") {
                                                                editarOperarioVinilica(op.id, e.target.value);
                                                            } else {
                                                                editarOtroOperario(op.id, "nombre", e.target.value);
                                                            }
                                                        }}
                                                        placeholder="Nombre del operario..."
                                                    />
                                                </td>
                                                <td>
                                                    {tabActiva === "vinilica" ? (
                                                        <span className="op-puesto-tag">Operario de Máquinas</span>
                                                    ) : (
                                                        <input 
                                                            className="op-input-edit"
                                                            value={op.puesto}
                                                            onChange={(e) => editarOtroOperario(op.id, "puesto", e.target.value)}
                                                            placeholder="Puesto..."
                                                        />
                                                    )}
                                                </td>
                                                <td className="txt-center">
                                                    <button 
                                                        className="op-action-btn delete" 
                                                        onClick={() => {
                                                            if (tabActiva === "vinilica") {
                                                                eliminarOperarioVinilica(op.id);
                                                            } else {
                                                                eliminarOtroOperario(op.id);
                                                            }
                                                        }}
                                                        title="Eliminar"
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Formulario para agregar nuevo operario */}
                            <div className="op-add-operario">
                                <input 
                                    type="text" 
                                    id="nuevoNombre"
                                    placeholder="Nuevo operario..."
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            const input = document.getElementById('nuevoNombre');
                                            if (input.value) {
                                                if (tabActiva === "vinilica") {
                                                    agregarOperarioVinilica(input.value);
                                                } else {
                                                    agregarOtroOperario(input.value, "Nuevo Puesto", tabActiva);
                                                }
                                                input.value = '';
                                            }
                                        }
                                    }}
                                />
                                {tabActiva !== "vinilica" && (
                                    <input 
                                        type="text" 
                                        id="nuevoPuesto"
                                        placeholder="Puesto..."
                                        style={{ width: '150px' }}
                                    />
                                )}
                                <button onClick={() => {
                                    const nombre = document.getElementById('nuevoNombre');
                                    const puesto = document.getElementById('nuevoPuesto');
                                    if (nombre.value) {
                                        if (tabActiva === "vinilica") {
                                            agregarOperarioVinilica(nombre.value);
                                        } else {
                                            agregarOtroOperario(nombre.value, puesto?.value || "Nuevo Puesto", tabActiva);
                                        }
                                        nombre.value = '';
                                        if (puesto) puesto.value = '';
                                    }
                                }}>
                                    + Agregar
                                </button>
                            </div>
                            
                            {/* === VISTA PREVIA DE ROTACIÓN === */}
                            {tabActiva === "vinilica" && (
                                <div className="preview-rotacion-section">
                                    <div className="preview-rotacion-title">
                                        <span>🔄</span>
                                        <h4>Vista Previa de Rotación Semanal</h4>
                                        <span className="semanas-rotadas-badge">
                                            Semanas rotadas: {semanasRotadas}
                                        </span>
                                    </div>
                                    <table className="preview-rotacion-table">
                                        <thead>
                                            <tr>
                                                <th>Grupo</th>
                                                <th>Operario Actual</th>
                                                <th>→ Próxima Semana</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewRotacion.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td>{item.grupo}</td>
                                                    <td>{item.actual}</td>
                                                    <td className="next-week">→ {item.siguiente}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        
                        {/* CONFIGURACIÓN DE MÁQUINAS VINÍLICAS */}
                        {tabActiva === "vinilica" && (
                            <div className="op-card machinery-card">
                                <div className="card-header-flex">
                                    <h3 className="op-card-title">⚙️ Configuración Base y Rotación</h3>
                                    <div className="rotacion-buttons">
                                        <button className="btn-rotar" onClick={rotarSemanal}>
                                            🔄 Rotar Semana (+1)
                                        </button>
                                        <button className="btn-reset" onClick={resetearRotacion}>
                                            🔁 Resetear Rotación
                                        </button>
                                    </div>
                                </div>
                                <p className="card-desc">
                                    Configuración BASE (sin rotación). Luego se aplican {semanasRotadas} rotaciones.
                                    <br/>
                                    <strong>Estado actual:</strong> {semanasRotadas === 0 ? "Configuración base" : `Rotación aplicada (Semana ${semanasRotadas})`}
                                </p>
                                
                                <div className="op-machinery-list">
                                    {Object.entries(configGruposBase).map(([grupoId, grupo]) => (
                                        <div key={grupoId} className="op-machine-item">
                                            <div className="machine-label-group">
                                                <span className="machine-id">📌</span>
                                                <label>{grupo.nombre}</label>
                                            </div>
                                            <select 
                                                className="op-select-custom"
                                                value={grupo.operarioId || ""}
                                                onChange={(e) => asignarOperarioAGrupoBase(grupoId, e.target.value)}
                                            >
                                                <option value="">Sin asignar (BASE)</option>
                                                {operariosVinilica.map(op => (
                                                    <option key={op.id} value={op.id}>
                                                        {op.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="operario-asignado-actual">
                                                👤 Base: {getNombreOperario(grupo.operarioId)}
                                                <br/>
                                                <span className="rotacion-actual">
                                                    🔄 Actual: {getNombreOperario(configGrupos[grupoId]?.operarioId)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="info-box">
                                    ℹ️ La rotación funciona así: se guarda una configuración BASE y un contador de semanas rotadas.
                                    Al regresar al menú, el sistema recuerda exactamente cuántas rotaciones se han aplicado.
                                    <br/><br/>
                                    <strong>Semana actual: {semanasRotadas}</strong> rotaciones aplicadas desde la configuración base.
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}