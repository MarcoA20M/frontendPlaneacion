import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/operarios.css";

export default function OperariosScreen() {
    const navigate = useNavigate();
    const [tabActiva, setTabActiva] = useState("vinilica");
    // 🔴 NUEVO: Estado para la subsección dentro de Vinílicas
    const [subSeccionVinilica, setSubSeccionVinilica] = useState("maquinas");
    const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });

    // Estado para operarios de Vinílica
    const [operariosVinilica, setOperariosVinilica] = useState(() => {
        const guardado = localStorage.getItem("operarios_vinilica");
        return guardado ? JSON.parse(guardado) : [
            { id: 1, nombre: "Pedro", puesto: "Preparador", activo: true },
            { id: 2, nombre: "Carlos", puesto: "Preparador", activo: true },
            { id: 3, nombre: "Yunior", puesto: "Preparador", activo: true },
            { id: 4, nombre: "Luis", puesto: "Preparador", activo: true }
        ];
    });

    // Estado para asignación BASE
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

    // Estado para la rotación actual
    const [semanasRotadas, setSemanasRotadas] = useState(() => {
        const guardado = localStorage.getItem("semanas_rotadas_vinilica");
        return guardado ? parseInt(guardado) : 0;
    });

    // Estado para otros operarios (Esmaltes)
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

    // Estado para operarios especiales (Impermeabilizantes)
    const [operariosEspeciales, setOperariosEspeciales] = useState(() => {
        const guardado = localStorage.getItem("operarios_especiales");
        return guardado ? JSON.parse(guardado) : [
            { id: 1, nombre: "Lazaro", puesto: "Impermeabilizantes", activo: true }
        ];
    });

    // Flag para evitar bucles infinitos de actualización
    const [actualizandoDesdeSelector, setActualizandoDesdeSelector] = useState(false);
    const [actualizandoDesdeDrag, setActualizandoDesdeDrag] = useState(false);

    // Función para calcular la configuración actual basada en el orden de los operarios
    const calcularConfigActual = () => {
        const gruposOrden = ["grupo0", "grupo1", "grupo2", "grupo3"];

        const asignacionBase = gruposOrden.map((grupo, idx) => {
            if (idx < operariosVinilica.length) {
                return operariosVinilica[idx].id;
            }
            return configGruposBase[grupo]?.operarioId || null;
        });

        const rotacionAplicada = [...asignacionBase];
        for (let i = 0; i < semanasRotadas; i++) {
            const ultimo = rotacionAplicada.pop();
            rotacionAplicada.unshift(ultimo);
        }

        const configActual = {};
        gruposOrden.forEach((grupo, idx) => {
            configActual[grupo] = {
                ...configGruposBase[grupo],
                operarioId: rotacionAplicada[idx]
            };
        });

        return configActual;
    };

    const [configGrupos, setConfigGrupos] = useState(() => calcularConfigActual());

    // Actualizar cuando cambie el orden de operarios o la rotación
    useEffect(() => {
        const nuevaConfig = calcularConfigActual();
        setConfigGrupos(nuevaConfig);
    }, [semanasRotadas, configGruposBase, operariosVinilica]);

    // Guardar en localStorage
    useEffect(() => {
        localStorage.setItem("operarios_vinilica", JSON.stringify(operariosVinilica));
        localStorage.setItem("config_grupos_base_vinilica", JSON.stringify(configGruposBase));
        localStorage.setItem("semanas_rotadas_vinilica", semanasRotadas.toString());
        localStorage.setItem("otros_operarios", JSON.stringify(otrosOperarios));
        localStorage.setItem("operarios_especiales", JSON.stringify(operariosEspeciales));

        window.dispatchEvent(new CustomEvent("vinilicaConfigUpdated", {
            detail: {
                operarios: operariosVinilica,
                grupos: configGrupos,
                semanasRotadas
            }
        }));
        
        // Disparar evento para operarios especiales
        window.dispatchEvent(new CustomEvent("operariosEspecialesUpdated", {
            detail: {
                operarios: operariosEspeciales
            }
        }));
    }, [operariosVinilica, configGruposBase, semanasRotadas, otrosOperarios, operariosEspeciales, configGrupos]);

    // Guardar para API
    useEffect(() => {
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

    // ========== FUNCIÓN PARA REORDENAR LA TABLA SEGÚN LOS SELECTORES ==========
    const reordenarTablaDesdeSelectores = (nuevosGruposBase) => {
        if (actualizandoDesdeDrag) return;

        setActualizandoDesdeSelector(true);

        const gruposOrden = ["grupo0", "grupo1", "grupo2", "grupo3"];
        const ordenDesdeSelectores = gruposOrden.map(grupo => nuevosGruposBase[grupo]?.operarioId).filter(id => id !== null && id !== undefined);

        const operariosMap = new Map();
        operariosVinilica.forEach(op => operariosMap.set(op.id, op));

        const nuevosOperariosOrdenados = [];
        const idsUsados = new Set();

        ordenDesdeSelectores.forEach(id => {
            if (operariosMap.has(id) && !idsUsados.has(id)) {
                nuevosOperariosOrdenados.push(operariosMap.get(id));
                idsUsados.add(id);
            }
        });

        operariosVinilica.forEach(op => {
            if (!idsUsados.has(op.id)) {
                nuevosOperariosOrdenados.push(op);
            }
        });

        const idsActuales = operariosVinilica.map(op => op.id).join(',');
        const idsNuevos = nuevosOperariosOrdenados.map(op => op.id).join(',');

        if (idsActuales !== idsNuevos) {
            setOperariosVinilica(nuevosOperariosOrdenados);
            setSemanasRotadas(0);
        }

        setTimeout(() => {
            setActualizandoDesdeSelector(false);
        }, 50);
    };

    // ========== DRAG AND DROP ==========
    const [dragIndex, setDragIndex] = useState(null);

    const handleDragStart = (e, index) => {
        setDragIndex(index);
        e.dataTransfer.effectAllowed = "move";
        e.target.style.opacity = "0.5";
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = "";
        setDragIndex(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();

        if (dragIndex === null || dragIndex === dropIndex) {
            return;
        }

        setActualizandoDesdeDrag(true);

        const nuevosOperarios = [...operariosVinilica];
        const temp = nuevosOperarios[dragIndex];
        nuevosOperarios[dragIndex] = nuevosOperarios[dropIndex];
        nuevosOperarios[dropIndex] = temp;

        setOperariosVinilica(nuevosOperarios);

        const nuevosGruposBase = { ...configGruposBase };
        const gruposOrden = ["grupo0", "grupo1", "grupo2", "grupo3"];

        gruposOrden.forEach((grupo, idx) => {
            if (idx < nuevosOperarios.length) {
                nuevosGruposBase[grupo] = {
                    ...nuevosGruposBase[grupo],
                    operarioId: nuevosOperarios[idx].id
                };
            }
        });

        setConfigGruposBase(nuevosGruposBase);
        setSemanasRotadas(0);

        mostrarMensaje(`🔄 ${nuevosOperarios[dragIndex].nombre} ↔ ${nuevosOperarios[dropIndex].nombre}`, "success");

        setTimeout(() => {
            setActualizandoDesdeDrag(false);
        }, 50);
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
            puesto: "Preparador",
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
            const nuevosOperarios = operariosVinilica.filter(op => op.id !== id);
            setOperariosVinilica(nuevosOperarios);

            const nuevosGruposBase = { ...configGruposBase };
            const gruposOrden = ["grupo0", "grupo1", "grupo2", "grupo3"];

            gruposOrden.forEach((grupo, idx) => {
                if (idx < nuevosOperarios.length) {
                    nuevosGruposBase[grupo] = {
                        ...nuevosGruposBase[grupo],
                        operarioId: nuevosOperarios[idx].id
                    };
                } else if (nuevosGruposBase[grupo]?.operarioId === id) {
                    nuevosGruposBase[grupo] = {
                        ...nuevosGruposBase[grupo],
                        operarioId: null
                    };
                }
            });

            setConfigGruposBase(nuevosGruposBase);
            setSemanasRotadas(0);
            mostrarMensaje(`🗑️ "${operario.nombre}" eliminado`);
        }
    };

    // ========== CRUD OTROS OPERARIOS (ESMALTES) ==========
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

    // ========== CRUD OPERARIOS ESPECIALES (IMPERMEABILIZANTES) ==========
    const agregarOperarioEspecial = (nombre) => {
        if (!nombre.trim()) {
            mostrarMensaje("❌ El nombre no puede estar vacío", "error");
            return;
        }
        if (operariosEspeciales.some(op => op.nombre.toLowerCase() === nombre.toLowerCase())) {
            mostrarMensaje(`❌ "${nombre}" ya existe en especiales`, "error");
            return;
        }
        const nuevoId = Math.max(...operariosEspeciales.map(op => op.id), 0) + 1;
        setOperariosEspeciales([...operariosEspeciales, {
            id: nuevoId,
            nombre: nombre.trim(),
            puesto: "Impermeabilizantes",
            activo: true
        }]);
        mostrarMensaje(`✅ "${nombre}" agregado a Operarios Especiales`);
    };

    const editarOperarioEspecial = (id, nuevoNombre) => {
        if (!nuevoNombre.trim()) return;
        if (operariosEspeciales.some(op => op.nombre.toLowerCase() === nuevoNombre.toLowerCase() && op.id !== id)) {
            mostrarMensaje(`❌ "${nuevoNombre}" ya existe en especiales`, "error");
            return;
        }
        setOperariosEspeciales(prev => prev.map(op =>
            op.id === id ? { ...op, nombre: nuevoNombre.trim() } : op
        ));
        mostrarMensaje(`✏️ Nombre actualizado a "${nuevoNombre}"`);
    };

    const eliminarOperarioEspecial = (id) => {
        const operario = operariosEspeciales.find(op => op.id === id);
        if (window.confirm(`¿Eliminar a "${operario.nombre}" de Operarios Especiales?`)) {
            setOperariosEspeciales(prev => prev.filter(op => op.id !== id));
            mostrarMensaje(`🗑️ "${operario.nombre}" eliminado de Especiales`);
        }
    };

    const toggleActivoEspecial = (id) => {
        setOperariosEspeciales(prev => prev.map(op =>
            op.id === id ? { ...op, activo: !op.activo } : op
        ));
        const operario = operariosEspeciales.find(op => op.id === id);
        mostrarMensaje(`${operario?.activo ? '🔴' : '🟢'} "${operario?.nombre}" ${operario?.activo ? 'desactivado' : 'activado'}`);
    };

    // ========== ASIGNACIÓN DE GRUPOS BASE ==========
    const asignarOperarioAGrupoBase = (grupoId, operarioId) => {
        const operarioIdNum = parseInt(operarioId) || null;

        const nuevosGruposBase = {
            ...configGruposBase,
            [grupoId]: { ...configGruposBase[grupoId], operarioId: operarioIdNum }
        };

        setConfigGruposBase(nuevosGruposBase);

        const operario = operariosVinilica.find(op => op.id === operarioIdNum);
        mostrarMensaje(`📌 ${operario?.nombre || "Nadie"} asignado al ${configGruposBase[grupoId].nombre}`);

        reordenarTablaDesdeSelectores(nuevosGruposBase);
        setSemanasRotadas(0);
    };

    // ========== ROTACIÓN SEMANAL ==========
    const rotarSemanal = () => {
        const nuevasSemanas = semanasRotadas + 1;
        setSemanasRotadas(nuevasSemanas);
        mostrarMensaje(`🔄 Rotación aplicada (Semana ${nuevasSemanas})`);
    };

    const resetearRotacion = () => {
        if (window.confirm("¿Resetear la rotación a la configuración inicial?")) {
            setSemanasRotadas(0);
            mostrarMensaje("🔄 Rotación reseteada");
        }
    };

    // ========== UTILIDADES ==========
    const getNombreOperario = (id) => {
        if (!id) return "Sin asignar";
        const operario = operariosVinilica.find(op => op.id === id);
        return operario ? operario.nombre : "Desconocido";
    };

    const operariosFiltrados = () => {
        if (tabActiva === "vinilica") return operariosVinilica;
        if (tabActiva === "esmaltes") return otrosOperarios.filter(op => op.area === tabActiva);
        return [];
    };

    // Vista previa de rotación
    const gruposOrden = ["grupo0", "grupo1", "grupo2", "grupo3"];
    const previewRotacion = gruposOrden.map((grupo, idx) => {
        const asignacionBase = gruposOrden.map((g, i) => {
            if (i < operariosVinilica.length) {
                return operariosVinilica[i].id;
            }
            return configGruposBase[g]?.operarioId || null;
        });

        const rotacionActual = [...asignacionBase];
        for (let i = 0; i < semanasRotadas; i++) {
            const ultimo = rotacionActual.pop();
            rotacionActual.unshift(ultimo);
        }

        const rotacionSiguiente = [...rotacionActual];
        const ultimo = rotacionSiguiente.pop();
        rotacionSiguiente.unshift(ultimo);

        return {
            grupo: configGruposBase[grupo]?.nombre || grupo,
            actual: getNombreOperario(rotacionActual[idx]),
            siguiente: getNombreOperario(rotacionSiguiente[idx])
        };
    });

    // Obtener el operario especial activo para mostrar
    const operarioEspecialActivo = operariosEspeciales.find(op => op.activo)?.nombre || "Lazaro";

    // Renderizar contenido según la subsección seleccionada
    const renderContenidoVinilica = () => {
        if (subSeccionVinilica === "maquinas") {
            return (
                <>
                    <div className="op-card table-card">
                        <div className="card-header-flex">
                            <h3 className="op-card-title">
                                🖱️ Operarios de Máquinas (VI-101 a VI-108) 
                                <span className="drag-hint">- Arrastra para intercambiar posiciones</span>
                            </h3>
                            <span className="count-badge">{operariosFiltrados().length} Operarios</span>
                        </div>

                        <div className="op-table-wrapper">
                            <table className="op-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '50px' }}>⋮⋮</th>
                                        <th>Nombre (Editable)</th>
                                        <th>Puesto</th>
                                        <th className="txt-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {operariosFiltrados().map((op, idx) => (
                                        <tr
                                            key={op.id}
                                            draggable={true}
                                            onDragStart={(e) => handleDragStart(e, idx)}
                                            onDragEnd={handleDragEnd}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, idx)}
                                            style={{ cursor: "grab" }}
                                        >
                                            <td className="drag-handle" style={{ textAlign: 'center', fontSize: '20px' }}>
                                                ⋮⋮
                                            </td>
                                            <td>
                                                <input
                                                    className="op-input-edit"
                                                    value={op.nombre}
                                                    onChange={(e) => editarOperarioVinilica(op.id, e.target.value)}
                                                    placeholder="Nombre del operario..."
                                                />
                                            </td>
                                            <td>
                                                <span className="op-puesto-tag">Preparador</span>
                                            </td>
                                            <td className="txt-center">
                                                <button
                                                    className="op-action-btn delete"
                                                    onClick={() => eliminarOperarioVinilica(op.id)}
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

                        <div className="op-add-operario">
                            <input
                                type="text"
                                id="nuevoNombre"
                                placeholder="Nuevo operario..."
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        const input = document.getElementById('nuevoNombre');
                                        if (input.value) {
                                            agregarOperarioVinilica(input.value);
                                            input.value = '';
                                        }
                                    }
                                }}
                            />
                            <button onClick={() => {
                                const nombre = document.getElementById('nuevoNombre');
                                if (nombre.value) {
                                    agregarOperarioVinilica(nombre.value);
                                    nombre.value = '';
                                }
                            }}>
                                + Agregar
                            </button>
                        </div>

                        {/* VISTA PREVIA DE ROTACIÓN */}
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
                    </div>

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
                            <strong>🔄 Sincronización automática:</strong> Los cambios aquí actualizan automáticamente el orden de la tabla.
                        </p>

                        <div className="op-machinery-list">
                            {Object.entries(configGruposBase).map(([grupoId, grupo]) => {
                                const grupoIndex = parseInt(grupoId.replace("grupo", ""));
                                const operarioPorOrden = operariosVinilica[grupoIndex];

                                return (
                                    <div key={grupoId} className="op-machine-item">
                                        <div className="machine-label-group">
                                            <span className="machine-id">📌</span>
                                            <label>{grupo.nombre}</label>
                                            {operarioPorOrden && (
                                                <span className="orden-indicador">
                                                    (Posición #{grupoIndex + 1} en tabla)
                                                </span>
                                            )}
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
                                            {operarioPorOrden && grupo.operarioId === operarioPorOrden.id && (
                                                <span className="match-indicador"> ✓ Coincide con orden</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="info-box">
                            <strong>🔄 Sincronización Automática Bidireccional:</strong>
                            <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
                                <li><strong>Arrastrar en tabla →</strong> Actualiza automáticamente los selectores</li>
                                <li><strong>Cambiar selector →</strong> Reordena automáticamente la tabla</li>
                            </ul>
                        </div>
                    </div>
                </>
            );
        } else {
            return (
                <div className="op-card especiales-card">
                    <div className="card-header-flex">
                        <h3 className="op-card-title">🧴 Operarios Especiales (Impermeabilizantes)</h3>
                        <span className="count-badge">
                            {operariosEspeciales.filter(op => op.activo).length} Activos
                        </span>
                    </div>

                    <p className="card-desc">
                        <strong>📌 Estos operarios se asignan automáticamente a las cargas especiales</strong> (códigos excluidos, impermeabilizantes) 
                        en los PDFs y reportes de producción. Actualmente activo: <strong className="operario-activo">{operarioEspecialActivo}</strong>
                    </p>

                    <div className="op-table-wrapper">
                        <table className="op-table">
                            <thead>
                                <tr>
                                    <th>Nombre (Editable)</th>
                                    <th>Puesto</th>
                                    <th>Estado</th>
                                    <th className="txt-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {operariosEspeciales.map((op) => (
                                    <tr key={op.id}>
                                        <td>
                                            <input
                                                className="op-input-edit"
                                                value={op.nombre}
                                                onChange={(e) => editarOperarioEspecial(op.id, e.target.value)}
                                                placeholder="Nombre del operario especial..."
                                            />
                                        </td>
                                        <td>
                                            <span className="op-puesto-tag especial">{op.puesto}</span>
                                        </td>
                                        <td>
                                            <button
                                                className={`status-badge ${op.activo ? 'active' : 'inactive'}`}
                                                onClick={() => toggleActivoEspecial(op.id)}
                                            >
                                                {op.activo ? '✓ Activo' : '✗ Inactivo'}
                                            </button>
                                        </td>
                                        <td className="txt-center">
                                            <button
                                                className="op-action-btn delete"
                                                onClick={() => eliminarOperarioEspecial(op.id)}
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

                    <div className="op-add-operario">
                        <input
                            type="text"
                            id="nuevoEspecial"
                            placeholder="Nuevo operario especial..."
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    const input = document.getElementById('nuevoEspecial');
                                    if (input.value) {
                                        agregarOperarioEspecial(input.value);
                                        input.value = '';
                                    }
                                }
                            }}
                        />
                        <button onClick={() => {
                            const input = document.getElementById('nuevoEspecial');
                            if (input.value) {
                                agregarOperarioEspecial(input.value);
                                input.value = '';
                            }
                        }}>
                            + Agregar Especial
                        </button>
                    </div>

                    <div className="info-box">
                        <strong>🧴 Operarios Especiales:</strong> Estos operarios se asignan automáticamente a las cargas de 
                        impermeabilizantes (códigos excluidos) en el PDF y reportes de producción.
                        <br /><br />
                        <strong>💡 Nota:</strong> Solo puede haber <strong>UN operario activo</strong> a la vez. Si activas uno, los demás se desactivarán automáticamente.
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="op-screen-container">
            <div className="op-glass-panel">

                {mensaje.texto && (
                    <div className={`op-toast ${mensaje.tipo}`}>
                        {mensaje.texto}
                    </div>
                )}

                <aside className="op-sidebar">
                    <div className="op-logo">
                        <span className="op-dot"></span>
                        <h2>Personal Operativo Pintumex</h2>
                    </div>

                    <nav className="op-nav">
                        <div className="nav-label">SECCIONES</div>
                        <button
                            className={`op-nav-btn ${tabActiva === "vinilica" ? "active" : ""}`}
                            onClick={() => {
                                setTabActiva("vinilica");
                                setSubSeccionVinilica("maquinas"); // Resetear a máquinas al cambiar
                            }}
                        >
                            <span className="nav-icon">💧</span> Vinílicas
                        </button>
                        <button
                            className={`op-nav-btn ${tabActiva === "esmaltes" ? "active" : ""}`}
                            onClick={() => setTabActiva("esmaltes")}
                        >
                            <span className="nav-icon">✨</span> Esmaltes
                        </button>
                    </nav>

                    {/* 🔴 SUBMENÚ DE VINÍLICAS - Solo aparece cuando Vinílicas está activa */}
                    {tabActiva === "vinilica" && (
                        <>
                            <div className="nav-divider"></div>
                            <nav className="op-nav">
                                <div className="nav-label">VINÍLICAS</div>
                                <button
                                    className={`op-nav-sub-btn ${subSeccionVinilica === "maquinas" ? "active" : ""}`}
                                    onClick={() => setSubSeccionVinilica("maquinas")}
                                >
                                    <span className="nav-icon">⚙️</span> Operarios de Máquinas
                                </button>
                                <button
                                    className={`op-nav-sub-btn ${subSeccionVinilica === "especiales" ? "active" : ""}`}
                                    onClick={() => setSubSeccionVinilica("especiales")}
                                >
                                    <span className="nav-icon">🧴</span> Operarios Especiales
                                </button>
                            </nav>
                        </>
                    )}

                    <div className="sidebar-footer">
                        <button className="op-btn-exit" onClick={() => navigate("/mantenimiento")}>
                            ↩ Regresar a Menú
                        </button>
                    </div>
                </aside>

                <main className="op-main-content">
                    <header className="op-header">
                        <div className="op-title-group">
                            <h1>
                                {tabActiva === "vinilica" 
                                    ? (subSeccionVinilica === "maquinas" 
                                        ? "💧 Operarios de Máquinas - Vinílicas" 
                                        : "🧴 Operarios Especiales - Impermeabilizantes")
                                    : "✨ Operarios - Esmaltes"}
                            </h1>
                            <p>
                                {tabActiva === "vinilica" 
                                    ? (subSeccionVinilica === "maquinas"
                                        ? "Gestión de operarios para máquinas VI-101 a VI-108 y rotación semanal"
                                        : "Gestión de operarios para cargas especiales (impermeabilizantes, códigos excluidos)")
                                    : "Gestión de personal para área de esmaltes"}
                            </p>
                        </div>
                    </header>

                    <div className={`op-workspace ${tabActiva === 'vinilica' ? 'with-sidebar' : ''}`}>
                        {tabActiva === "vinilica" ? (
                            renderContenidoVinilica()
                        ) : (
                            <div className="op-card table-card">
                                <div className="card-header-flex">
                                    <h3 className="op-card-title">Plantilla de Trabajo - Esmaltes</h3>
                                    <span className="count-badge">{operariosFiltrados().length} Operarios</span>
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
                                            {operariosFiltrados().map((op) => (
                                                <tr key={op.id}>
                                                    <td>
                                                        <input
                                                            className="op-input-edit"
                                                            value={op.nombre}
                                                            onChange={(e) => editarOtroOperario(op.id, "nombre", e.target.value)}
                                                            placeholder="Nombre del operario..."
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            className="op-input-edit"
                                                            value={op.puesto}
                                                            onChange={(e) => editarOtroOperario(op.id, "puesto", e.target.value)}
                                                            placeholder="Puesto..."
                                                        />
                                                    </td>
                                                    <td className="txt-center">
                                                        <button
                                                            className="op-action-btn delete"
                                                            onClick={() => eliminarOtroOperario(op.id)}
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

                                <div className="op-add-operario">
                                    <input
                                        type="text"
                                        id="nuevoNombreEsmalte"
                                        placeholder="Nuevo operario..."
                                    />
                                    <input
                                        type="text"
                                        id="nuevoPuesto"
                                        placeholder="Puesto..."
                                        style={{ width: '150px' }}
                                    />
                                    <button onClick={() => {
                                        const nombre = document.getElementById('nuevoNombreEsmalte');
                                        const puesto = document.getElementById('nuevoPuesto');
                                        if (nombre.value) {
                                            agregarOtroOperario(nombre.value, puesto?.value || "Nuevo Puesto", "esmaltes");
                                            nombre.value = '';
                                            if (puesto) puesto.value = '';
                                        }
                                    }}>
                                        + Agregar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}