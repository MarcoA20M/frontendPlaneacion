import React, { useState, useEffect } from "react";
import { litrosPorEnvasado, litrosATexto } from "../constants/config";
import { formulasService } from "../services/formulasService";
import "../styles/InfoInventarioProducto.css";

// Componente Input con evaluación inteligente
const InputExpresion = ({ value, onChange, className, placeholder, disabled, ...props }) => {
  const [inputValue, setInputValue] = useState(value?.toString() || '');
  const [isFocused, setIsFocused] = useState(false);
  
  // Función para evaluar expresiones matemáticas
  const evaluarExpresion = (valor) => {
    if (!valor || typeof valor !== 'string') return null;
    
    const expresion = valor.replace(/\s/g, '');
    
    // Detectar si tiene operadores (+, -, *, /)
    if (/[+\-*/]/.test(expresion)) {
      try {
        const expresionLimpia = expresion.replace(/[^0-9+\-*/().]/g, '');
        let expresionFinal = expresionLimpia;
        if (expresionFinal.startsWith('+')) {
          expresionFinal = expresionFinal.substring(1);
        }
        
        if (expresionFinal && !/^[+\-*/]/.test(expresionFinal)) {
          const resultado = Function('"use strict"; return (' + expresionFinal + ')')();
          if (!isNaN(resultado) && isFinite(resultado)) {
            if (Number.isInteger(resultado)) {
              return resultado;
            }
            return Math.round(resultado * 100) / 100;
          }
        }
      } catch (e) {
        console.log("Error evaluando expresión:", e);
      }
      return null; // Si tiene operadores pero no se pudo evaluar, esperar
    }
    return null;
  };
  
  // Verificar si el valor contiene operadores (+, -, *, /)
  const tieneOperadores = (valor) => {
    return /[+\-*/]/.test(valor);
  };
  
  const handleBlur = () => {
    setIsFocused(false);
    
    // Si tiene operadores, evaluar la expresión completa
    if (tieneOperadores(inputValue)) {
      const evaluado = evaluarExpresion(inputValue);
      if (evaluado !== null) {
        const nuevoValor = evaluado.toString();
        setInputValue(nuevoValor);
        if (onChange) onChange(nuevoValor);
        return;
      }
    }
    
    // Si no tiene operadores, validar como número normal
    const numValor = parseFloat(inputValue);
    if (!isNaN(numValor) && numValor >= 0) {
      const nuevoValor = numValor.toString();
      setInputValue(nuevoValor);
      if (onChange) onChange(nuevoValor);
    } else if (inputValue === '') {
      const nuevoValor = '0';
      setInputValue(nuevoValor);
      if (onChange) onChange('0');
    } else {
      // Restaurar valor anterior
      const valorAnterior = value?.toString() || '0';
      setInputValue(valorAnterior);
      if (onChange) onChange(valorAnterior);
    }
  };
  
  const handleFocus = () => {
    setIsFocused(true);
  };
  
  const handleChange = (e) => {
    const nuevoValor = e.target.value;
    setInputValue(nuevoValor);
    
    // SI NO tiene operadores (+, -, *, /), actualizar en tiempo real
    if (!tieneOperadores(nuevoValor)) {
      const numValor = parseFloat(nuevoValor);
      if (!isNaN(numValor) && numValor >= 0) {
        if (onChange) onChange(numValor.toString());
      } else if (nuevoValor === '') {
        if (onChange) onChange('0');
      }
    }
    // SI tiene operadores, NO actualizar hasta el blur
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };
  
  // Sincronizar cuando la prop cambia externamente
  useEffect(() => {
    if (!isFocused && value !== undefined && value !== null) {
      setInputValue(value.toString());
    }
  }, [value, isFocused]);
  
  return (
    <input
      type="text"
      className={className}
      value={inputValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyPress={handleKeyPress}
      placeholder={placeholder || "Ej: 42 o +42+42"}
      disabled={disabled}
      {...props}
    />
  );
};

const InfoInventarioProducto = ({ producto, cantidades, setCantidades, totalLitrosActuales }) => {
    
    const extraerLitrosDeArticulo = (art) => {
        if (!art) return 0;
        const parteNumerica = String(art).split('-')[0];
        let valor = parseFloat(parteNumerica) || 0;
        if (valor >= 100) return valor / 1000;
        return valor;
    };

    const handleCantidadChange = (envId, nuevoValor) => {
        const valorNumerico = Math.max(0, parseFloat(nuevoValor) || 0);
        
        setCantidades(prev => ({
            ...prev,
            [envId]: valorNumerico
        }));
    };

    const calcularDatosEnvase = (env) => {
        const id = env.id;
        const pz = parseInt(cantidades[id] || 0);
        const capacidadSistema = Number(litrosPorEnvasado(id));

        const infoPlanificador = producto.datosPlanificador?.find(item => {
            const litrosPlan = extraerLitrosDeArticulo(item.articulo);
            return Math.abs(litrosPlan - capacidadSistema) < 0.001;
        });
        
        const salidas = infoPlanificador ? parseInt(infoPlanificador.salidas) : 0;
        const existencia = infoPlanificador ? parseInt(infoPlanificador.existencia) : 0;
        const alcanceActual = infoPlanificador ? parseInt(infoPlanificador.alcance) : 0;

        const divisorCaja = (capacidadSistema >= 3 && capacidadSistema <= 5) ? 2 : (capacidadSistema <= 1 ? 6 : 1);
        const cajaCerrada = pz > 0 ? (pz / divisorCaja).toFixed(1) : 0;

        const nuevoInv = existencia + pz;
        const factorC2 = 24;
        const diasEstCalc = salidas > 0 ? ((existencia + pz) / salidas) * factorC2 : 0;
        const diasEstStr = Math.round(diasEstCalc).toString();

        return {
            id, 
            pz, 
            capacidadSistema, 
            salidas, 
            existencia,
            alcanceActual, 
            cajaCerrada, 
            nuevoInv, 
            diasEstCalc, 
            diasEstStr
        };
    };

    const renderFilaInventario = (env) => {
        const d = calcularDatosEnvase(env);
        
        const alcanceClass = d.alcanceActual < 3 ? "status-danger" : "status-warning";
        const diasEstClass = d.diasEstCalc < 24 ? "status-danger" : "status-success";

        return (
            <tr key={d.id}>
                <td className="col-envase">{litrosATexto(d.capacidadSistema)}</td>
                <td className={d.pz > 0 ? "col-produccion-active" : "col-produccion-inactive"}>
                    {d.pz}
                </td>
                <td className="col-caja-cerrada">{d.cajaCerrada}</td>
                <td>{d.salidas}</td>
                <td className="col-highlight">{d.existencia}</td>
                <td>
                    <div className="badge-container">
                        <span className={`badge-status ${alcanceClass}`}>{d.alcanceActual}</span>
                    </div>
                </td>
                <td className="col-highlight">{d.nuevoInv}</td>
                <td>
                    <div className="badge-container">
                        <span className={`badge-status ${diasEstClass}`}>{d.diasEstStr}</span>
                    </div>
                </td>
            </tr>
        );
    };

    const renderTablaInventario = () => {
        if (!producto?.envasados?.length) {
            return (
                <tr>
                    <td colSpan="8" style={{ color: '#666', padding: '15px', textAlign: 'center' }}>
                        Busque un producto para ver el análisis de stock...
                    </td>
                </tr>
            );
        }

        return [...producto.envasados]
            .sort((a, b) => litrosPorEnvasado(a.id) - litrosPorEnvasado(b.id))
            .map(env => renderFilaInventario(env));
    };

    const renderColumnaEnvasado = () => {
        if (!producto?.envasados?.length) return null;

        return (
            <div className="envasado-column">
                <div className="tabla">
                    {[...producto.envasados]
                        .sort((a, b) => litrosPorEnvasado(a.id) - litrosPorEnvasado(b.id))
                        .map(env => (
                            <div className="fila" key={env.id}>
                                <span className="litros-text">{litrosATexto(litrosPorEnvasado(env.id))}</span>
                                <InputExpresion
                                    value={cantidades[env.id] || 0}
                                    onChange={(nuevoValor) => handleCantidadChange(env.id, nuevoValor)}
                                    className="input-cantidad-expresion"
                                    placeholder="Ej: 42 o +42+42"
                                />
                            </div>
                        ))}
                </div>
            </div>
        );
    };

    return (
        <div className="layout-dinamico-produccion">
            <div className="envases-section">
                {renderColumnaEnvasado()}
                <div className="contador-litros-wrapper">
                    <div className="contador-litros">
                        Total: <span>{totalLitrosActuales.toFixed(2)} L</span>
                    </div>
                </div>
            </div>

            <div className="inventario-column">
                <table className="tabla-inventario-tecnica">
                    <thead>
                        <tr>
                            <th>ENVASE</th>
                            <th>PZ P</th>
                            <th>CJA CERRADA</th>
                            <th>SALIDAS</th>
                            <th>EXISTENCIA</th>
                            <th>ALCANCE</th>
                            <th>NUEVO INV.</th>
                            <th>DÍAS EST.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {renderTablaInventario()}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InfoInventarioProducto;