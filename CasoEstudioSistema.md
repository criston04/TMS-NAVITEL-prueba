# 📋 Caso de Estudio: Sistema de Control de Personal (IDEPUNP)

> **Tipo de documento:** Análisis y Diseño de Software  
> **Institución:** Instituto de Enseñanza Pre-Universitaria de la Universidad Nacional de Piura (IDEPUNP)  
> **Metodología:** Orientada a Objetos con UML  
> **Estado del sistema actual:** Manual → Propuesta de automatización

---

## Tabla de Contenidos

1. [Aspectos Generales](#capítulo-i-aspectos-generales)
2. [Especificación de Requerimientos](#capítulo-ii-especificación-de-requerimientos)
3. [Vistas y Diagramas UML](#capítulo-iii-vistas-y-diagramas)
4. [Arquitectura del Software](#capítulo-iv-diseño-de-la-arquitectura-del-software)
5. [Diseño de Interfaces](#capítulo-v-diseño-de-interfaces)
6. [Estructura de Datos](#capítulo-vi-diseño-de-la-estructura-de-datos)
7. [Conclusiones y Recomendaciones](#conclusiones)
8. [Apéndice: Entrevista](#apéndice-entrevista-realizada-al-jefe-administrativo)

---

## Capítulo I: Aspectos Generales

### 1.1 Descripción de la Institución

**IDEPUNP** (Instituto de Enseñanza Pre-Universitaria de la Universidad Nacional de Piura) es una institución educativa que al momento del análisis manejaba todos sus procesos de control de personal de forma **completamente manual**.

### 1.2 Definición del Problema

La institución llevaba un control manual del personal, lo que generaba los siguientes problemas críticos:

- ❌ Trabajadores recibían **descuentos incorrectos** por errores en cálculos manuales
- ❌ En algunos casos se pagaba **más de lo correspondiente**
- ❌ Falta de eficiencia y productividad en el área administrativa

**Necesidad identificada:** Automatizar el proceso de control de personal para mejorar la precisión en cálculos y la productividad institucional.

### 1.3 Objetivos del Proyecto

#### Objetivo General
> Realizar el Análisis del Sistema de Control de Personal del Instituto de Enseñanza.

#### Objetivos Específicos

| # | Objetivo |
|---|----------|
| 1 | Obtener los requerimientos necesarios para el análisis del sistema |
| 2 | Desarrollar Diagramas de Casos de Uso de los procesos institucionales |
| 3 | Desarrollar Diagramas de Clases para cada módulo |
| 4 | Desarrollar Diagramas de Secuencia de los procesos |
| 5 | Desarrollar Diagramas de Colaboración de los procesos |
| 6 | Desarrollar Diagramas de Estados de los procesos |
| 7 | Desarrollar Diagramas de Actividades de los procesos |

---

## Capítulo II: Especificación de Requerimientos

### 2.1 Descripción de los Procesos del Control de Personal

El sistema cubre **cuatro áreas operativas principales**:

#### A. Área de Registro de Personal
- Registro completo al momento de contratación o renovación
- **Ficha de Registro de Personal:** datos personales, laborales, académicos
- **Ficha de Capacitación y Especialización:** grados, títulos, cursos, seminarios
- Asignación de: cargo, modalidad de ingreso, categoría y remuneración

#### B. Área de Asistencia
- Control detallado diario de asistencia
- Resumen mensual de faltas y tardanzas
- Las faltas injustificadas se aplican como **deméritos**
- Las faltas y tardanzas son descontadas del haber mensual

#### C. Área de Remuneraciones
- **Personal Administrativo y Limpieza:** sueldo fijo mensual
- **Docentes:** pago por hora (ordinarias + extras)
- **Descuento de Ley:** Si sueldo > 710 soles → 18% descuento a SUNAT
- Planillas procesadas cada 3-4 semanas
- Tipos de planilla: Personal Nombrado (sueldos) y Servicios No Personales (salarios)
- Cada planilla incluye: ciclo académico, rango de días, mes, año, tipo, fecha de emisión, detalle por trabajador y resumen total

#### D. Área de Sanciones
- Registro de amonestaciones por incumplimiento de normas
- Tipos de sanción según estándares institucionales

---

### 2.2 Objetivos del Software

El sistema a desarrollar debe:

- ✅ Controlar servicios y subsidios (movilidad, refrigerio)
- ✅ Controlar asistencia con registro de faltas y tardanzas injustificadas
- ✅ Registrar personal nuevo o con renovación de contrato (con posibilidad de modificar datos)
- ✅ Registrar sanciones al personal
- ✅ Registrar capacitaciones con costo institucional
- ✅ Registrar grados, títulos y cursos previos al ingreso

### 2.3 Funciones del Área de Personal

- Controlar tiempo laborado mediante tarjetas de asistencia
- Realizar evaluaciones periódicas del personal
- Elaborar reportes de planilla de sueldos y salarios
- Mantenerse informado de disposiciones laborales
- Preparar planillas para la Oficina Central de Registro Presupuestario

### 2.4 Lista de Problemas y Necesidades Identificadas

| # | Problema |
|---|----------|
| 1 | Control de asistencia no automatizado (registro manual) |
| 2 | Sin sistema automatizado para control de asistencia diaria de alumnos |
| 3 | Sin sistema para controlar capacitaciones otorgadas al trabajador |
| 4 | Sin sistema para controlar sanciones y deméritos |
| 5 | Sin clasificación ni jerarquización de sanciones según reglamento |

---

## Capítulo III: Vistas y Diagramas

> **Nota:** Los diagramas UML originales están en formato `.wmf` (imágenes vectoriales). A continuación se documenta en texto la especificación completa de cada diagrama.

### 3.1 Módulo de Registro de Personal

#### 3.1.1 Casos de Uso — Módulo Registro

**Actores involucrados:**
- `Usuario de Registro de Personal`
- `Trabajador`

---

##### CU-01: Registrar Trabajador

| Campo | Detalle |
|-------|---------|
| **Versión** | 1.0 |
| **Actores** | Usuario de Registro de Personal, Trabajador |
| **Fuentes** | Entrevista al Jefe Administrativo y al usuario de Registro de Personal, Ficha de evaluación |
| **Descripción** | Proceso de registro cuando un trabajador ingresa por primera vez o renueva contrato. El trabajador completa la Ficha de Registro de Personal con datos personales, laborales, especialización y experiencia. Se le asigna cargo, modalidad, categoría y remuneración. |
| **Precondiciones** | 1) Haber sido evaluado previamente. 2) Haber llenado la Ficha de Registro de Personal. |
| **Secuencia Normal** | 1) Registrar datos personales. 2) Registrar especialización. 3) Registrar experiencia laboral. 4) Registrar datos laborales. |
| **Postcondiciones** | Datos del trabajador almacenados en el sistema. |
| **Excepciones** | Si no se detona un hito, generarlo manualmente. |

---

##### CU-02: Registrar Datos Personales

| Campo | Detalle |
|-------|---------|
| **Versión** | 1.0 |
| **Actores** | Usuario de Registro de Personal, Trabajador |
| **Descripción** | Registro de datos personales del trabajador desde la Ficha de Registro. |
| **Precondiciones** | 1) Evaluado previamente. 2) Ficha de Registro completada. |
| **Secuencia Normal** | 1) Sistema genera código automático. 2) Usuario ingresa datos (nombre, apellidos, dirección, teléfono, etc.). 3) Guardar datos. |
| **Postcondiciones** | Datos personales registrados en BD. |
| **Excepciones** | Ninguna |

---

##### CU-03: Registrar Especialización

| Campo | Detalle |
|-------|---------|
| **Versión** | 1.0 |
| **Descripción** | Registro de grados académicos, títulos profesionales, cursos de especialización y seminarios del trabajador. |
| **Precondiciones** | 1) Ficha de Registro completada. 2) Datos generales ya registrados en BD. |
| **Secuencia Normal** | 1) Registrar grados. 2) Registrar títulos. 3) Registrar cursos. 4) Registrar seminarios/congresos. 5) Guardar. |
| **Postcondiciones** | Especializaciones registradas en BD. |

---

##### CU-04: Registrar Experiencia Laboral

| Campo | Detalle |
|-------|---------|
| **Versión** | 1.0 |
| **Descripción** | Registro de experiencias laborales previas: empresa donde laboró, área, fechas de ingreso y cese, cargo ocupado. |
| **Secuencia Normal** | Por cada experiencia: Si entidad no registrada → registrarla. Ingresar área, fechas. Guardar. |
| **Postcondiciones** | Experiencias laborales registradas en BD. |
| **Excepciones** | 1) Registrar experiencia de docencia. 2) Registrar experiencia profesional. |

---

##### CU-05: Registrar Entidad donde Laboró

| Campo | Detalle |
|-------|---------|
| **Versión** | 1.0 |
| **Descripción** | Registro de datos generales de entidades previas donde trabajó el empleado. |
| **Secuencia Normal** | 1) Ingresar: nombre, dirección, teléfono, email. 2) Guardar. |
| **Postcondiciones** | Datos de la entidad registrados en BD. |

---

##### CU-06: Registrar Datos Laborales

| Campo | Detalle |
|-------|---------|
| **Versión** | 1.0 |
| **Descripción** | Registro de modalidad, cargo, categoría y remuneración del trabajador en la institución. |
| **Secuencia Normal** | 1) Asignar modalidad. 2) Asignar categoría. 3) Asignar cargo. 4) Asignar remuneración. |

---

##### CU-07: Asignar Remuneración

| Campo | Detalle |
|-------|---------|
| **Versión** | 1.0 |
| **Descripción** | Asignación de remuneración según tipo de trabajador. |
| **Secuencia Normal** | Si docente → asignar monto por hora. Si no → asignar sueldo mensual. |
| **Postcondiciones** | Remuneración almacenada según contrato. |
| **Excepciones** | 1) Asignar Sueldo fijo. 2) Asignar Monto por hora. |

---

### 3.2 Módulo de Asistencia

#### 3.2.1 Casos de Uso — Módulo Asistencia

**Actores:** `Usuario de Control de Asistencia`, `Trabajador`

---

##### CU-08: Controlar Asistencia

| Campo | Detalle |
|-------|---------|
| **Descripción** | Registro de asistencia diaria y cálculo de tardanzas. |
| **Precondiciones** | El trabajador debe haber marcado tarjeta o llenado ficha de asistencia. |
| **Secuencia Normal** | 1) Seleccionar trabajador. 2) Registrar asistencia. 3) Guardar datos. 4) Verificar tardanza. |
| **Postcondiciones** | 1) Asistencia registrada en BD. 2) Indicador de tardanza registrado. |

---

##### CU-09: Seleccionar Trabajador

| Campo | Detalle |
|-------|---------|
| **Descripción** | Búsqueda del trabajador mediante combo box. El sistema busca por primeras letras. |
| **Secuencia Normal** | 1) Usuario ingresa primeras letras. 2) Sistema busca en BD. 3) Muestra resultados en combo box. |
| **Postcondiciones** | Nombre y código del trabajador visibles (maneja homonimia). |

---

##### CU-10: Registrar Asistencia

| Campo | Detalle |
|-------|---------|
| **Descripción** | Registro de hora de ingreso, salida, descripción y (para docentes) curso y tema dictado. |
| **Secuencia Normal** | 1) Sistema toma fecha actual por defecto (modificable). 2) Ingresar hora ingreso. 3) Ingresar hora salida. 4) [Opcional] Descripción. 5) Si docente: ingresar curso(s) y tema(s). |
| **Postcondiciones** | Asistencia del trabajador registrada. |
| **Excepciones** | 1) Registrar asistencia de docente. 2) Registrar asistencia de administrativo/limpieza. |

---

##### CU-11: Verificar Tardanza

| Campo | Detalle |
|-------|---------|
| **Descripción** | Indicador en BD de si el trabajador llegó tarde. |
| **Secuencia Normal** | 1) Sistema compara hora de ingreso real vs. hora establecida (+ lapso prudencial). Si excede → 2) Colocar indicador de tardanza. |
| **Postcondiciones** | Indicador de tardanza registrado. |

---

### 3.3 Módulo de Sanciones

**Actores:** `Usuario de Registro de Sanción`, `Trabajador`

---

##### CU-12: Registrar Sanción

| Campo | Detalle |
|-------|---------|
| **Descripción** | Registro de sanciones por incumplimiento de normas institucionales. |
| **Precondiciones** | Trabajador debe haber cometido una falta. |
| **Secuencia Normal** | 1) Seleccionar trabajador. 2) Registrar datos de sanción. 3) Registrar descripción de falta. 4) Guardar. |
| **Postcondiciones** | Sanción registrada con descripción de falta. |

---

##### CU-13: Registrar Datos de Sanción

| Campo | Detalle |
|-------|---------|
| **Descripción** | Datos generales de la sanción. |
| **Precondiciones** | Trabajador seleccionado previamente. |
| **Secuencia Normal** | 1) Seleccionar tipo de sanción. 2) Ingresar fecha. 3) Seleccionar funcionario sancionador. |

---

##### CU-14: Registrar Descripción de Falta

| Campo | Detalle |
|-------|---------|
| **Descripción** | Descripción narrativa de la falta cometida. |
| **Secuencia Normal** | 1) Ingresar descripción de la falta. 2) Ingresar fecha de la falta. |

---

### 3.4 Módulo de Planillas

**Actores:** `Usuario de Reporte de Planillas`

---

##### CU-15: Realizar Reporte de Planillas

| Campo | Detalle |
|-------|---------|
| **Descripción** | Generación de planilla para una fecha dada. Incluye datos generales, datos por trabajador, cálculo de remuneraciones, descuentos y resumen final. |
| **Precondiciones** | 1) Reporte de planillas solicitado. 2) Remuneraciones registradas en BD. |
| **Secuencia Normal** | 1) Registrar datos generales. 2) Extraer datos del trabajador. 3) Realizar resumen. 4) Guardar planilla. |
| **Postcondiciones** | Reporte de planilla generado y registrado. |
| **Excepciones** | 1) Reporte docentes. 2) Reporte administrativos. 3) Reporte personal de limpieza. |

---

##### CU-16: Registrar Datos Generales de Planilla

| Campo | Detalle |
|-------|---------|
| **Secuencia Normal** | 1) Sistema genera número correlativo. 2) Sistema toma año actual por defecto. 3) Ingresar mes. 4) Ingresar intervalo de días. 5) Seleccionar tipo de planilla. |

---

##### CU-17: Extraer Datos del Trabajador

| Campo | Detalle |
|-------|---------|
| **Descripción** | Por cada trabajador: seleccionar, calcular remuneración e imprimir datos (nombre, profesión, sueldo, descuentos, haber neto). |

---

##### CU-18: Calcular Remuneración

| Campo | Detalle |
|-------|---------|
| **Descripción** | Cálculo del haber neto con descuentos aplicados. |
| **Secuencia Normal** | Si docente → obtener horas trabajadas + monto por hora. Si no → obtener remuneración por contrato. Luego: obtener horas extras → aplicar descuentos → calcular haber neto. |
| **Excepciones** | 1) Calcular sueldo fijo. 2) Calcular salario por hora (docentes). |

---

##### CU-19: Realizar Resumen de Planilla

| Campo | Detalle |
|-------|---------|
| **Descripción** | Totalización de pagos y descuentos por tipo de trabajador (SNP y nombrados). |
| **Secuencia Normal** | 1) Sumar haberes netos SNP. 2) Calcular descuentos SNP. 3) Sumar haberes netos nombrados. 4) Calcular descuentos nombrados. 5) Mostrar datos. |

---

### 3.5 Módulo de Capacitación

**Actores:** `Usuario de Registro de Capacitación`, `Trabajador`

---

##### CU-20: Registrar Capacitación

| Campo | Detalle |
|-------|---------|
| **Descripción** | Registro de capacitaciones otorgadas por la institución al trabajador, incluyendo monto invertido. |
| **Secuencia Normal** | Por cada trabajador capacitado: 1) Seleccionar trabajador. 2) Registrar datos de capacitación. |

---

##### CU-21: Registrar Datos de Capacitación

| Campo | Detalle |
|-------|---------|
| **Descripción** | Datos de la capacitación: nombre, institución capacitadora, fechas, monto, descripción, desempeño del trabajador. |
| **Campos a registrar** | Nombre, institución, fecha inicio, fecha fin, monto invertido, descripción, evaluación del desempeño. |

---

### 3.6 Endpoints de la API (Módulo de Órdenes)

> Sección identificada en el documento como especificación de integración.

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/list_orders` | GET | Listado completo de órdenes con todos los campos de interfaz |
| `/order` | POST | Crear orden con: N° Guía, Placa, IMEI, Conductor, Ruta, Fecha de Inicio |
| `/order/{id}/start` | POST | Activar orden (UUID, N° Guía) |
| `/order/{id}/pause` | POST | Pausar orden activa |
| `/order/{id}/end` | POST | Finalizar orden (puede ser automático) |
| `/order/{id}/delete` | DELETE | Eliminar orden |

---

## Capítulo IV: Diseño de la Arquitectura del Software

El documento incluye un diagrama de arquitectura de software (imagen `.wmf`). La arquitectura contempla los módulos identificados en el análisis:

```
┌─────────────────────────────────────────────────────┐
│              SISTEMA DE CONTROL DE PERSONAL          │
├──────────┬──────────┬──────────┬──────────┬─────────┤
│ Registro │Asistencia│Sanciones │Planillas │Capacit. │
│Personal  │          │          │          │         │
└──────────┴──────────┴──────────┴──────────┴─────────┘
                          ↓
              ┌─────────────────────┐
              │    BASE DE DATOS    │
              └─────────────────────┘
```

---

## Capítulo V: Diseño de Interfaces

### 5.1 Ventanas del Sistema

| Ventana | Tipo | Función |
|---------|------|---------|
| **Sistema de Personal** | MDI (principal) | Ventana madre con menú de la aplicación |
| **Nuevo Registro de Personal** | Modal | Registro de trabajadores nuevos o renovación |
| **Experiencia Laboral** | Modal | Registro de experiencias previas del trabajador |
| **Grados Profesionales** | Modal | Registro de grados académicos |
| **Títulos Profesionales** | Modal | Registro de títulos profesionales |
| **Cursos de Especialización** | Modal | Registro de cursos (propios o por empresa) |
| **Capacitaciones** | Modal | Registro de capacitaciones institucionales |
| **Control de Asistencia** | Modal | Registro diario de asistencia |
| **Justificación de Inasistencia** | Modal | Justificación de faltas |
| **Sanción** | Modal | Registro de sanciones múltiples |
| **Mérito** | Modal | Registro de méritos del trabajador |
| **Ver Planilla** | Modal | Selección de rango de fechas para reporte |
| **Planilla** | Modal | Generación y almacenamiento de planillas |
| **Iniciar Sesión** | Modal | Autenticación de usuario |
| **Nuevo Usuario** | Modal | Alta de usuarios del sistema |
| **Eliminar Usuario** | Modal | Baja de usuarios |
| **Modificar Usuario** | Modal | Cambio de contraseña |
| **Modificar Registro de Personal** | MDI-Child | Edición de datos del empleado |
| **Eliminar Personal** | Modal | Baja de trabajadores en BD |
| **Buscar Personal** | Modal | Búsqueda de trabajadores en BD |
| **Viáticos** | Modal | Registro de viáticos asignados |

### 5.2 Estructura del Menú Principal

```
Menú Archivo
  ├── Iniciar Sesión
  ├── Nuevo Registro de Personal
  ├── Nuevo Usuario
  └── Salir

Menú Mantenimiento
  ├── Personal
  ├── Modificar Personal
  ├── Eliminar Personal
  └── Buscar Personal

Menú Procesos
  ├── Agregar Capacitación
  ├── Modificar Usuario
  ├── Eliminar Usuario
  ├── Modificar Cargo
  ├── Control de Personal
  │   ├── Control de Asistencia
  │   └── Justificar Inasistencia
  ├── Sanciones
  ├── Méritos
  ├── Asignar Viáticos
  └── Genera Planilla

Menú Reportes
  ├── Planilla Docentes
  ├── Planilla Administrativos
  └── Planilla Personal de Limpieza

Menú Herramientas
  ├── Utilitarios
  ├── Calculadora
  └── Agenda

Menú Ventana
  ├── Mosaico Horizontal
  ├── Mosaico Vertical
  └── Cascada

Menú Ayuda
  ├── Contenido
  ├── Índice
  └── Búsqueda
```

---

## Capítulo VI: Diseño de la Estructura de Datos

### 6.1 Entidades y Atributos

#### Entidad: TRABAJADOR
> Empleado que labora en la empresa.

| Campo | Definición | Cardinalidad | Tipo |
|-------|-----------|-------------|------|
| `IdTrabajador` | Código PK único del trabajador | (1,1) | Char(10) |
| `Nombres` | Nombres del trabajador | (1,1) | Char(20) |
| `Apellidos` | Apellidos del trabajador | (1,1) | Char(20) |
| `Fecha_Nac` | Fecha de nacimiento | (1,1) | Fecha |
| `Dirección` | Dirección de residencia | (1,1) | Char(40) |
| `Teléfono` | Teléfono de contacto | (1,1) | Char(10) |
| `Doc_Identidad` | Número de documento de identidad | (1,1) | Char(10) |
| `Email` | Correo electrónico | (0,1) | Char(20) |
| `Estado_Civil` | Estado civil (soltero, casado, etc.) | (1,1) | Char(10) |
| `Fecha_Ingreso` | Fecha de ingreso a la institución | (1,1) | Datetime |
| `Grado_Instruccion` | Nivel educativo (primaria, secundaria, superior) | (1,1) | Varchar(30) |
| `Sexo` | Género del trabajador | (1,1) | Char(2) |
| `Remuneración` | Monto a pagar por sus servicios | (0,1) | Numérico |

---

#### Entidad: GRADO_TITULO
> Grado o título profesional del trabajador (Bachiller, Licenciado, Ingeniero, etc.).

| Campo | Definición | Cardinalidad |
|-------|-----------|-------------|
| `Nro_Resolucion` | Número de resolución del grado | (1,1) |
| `Nombre_grado_Titulo` | Nombre del grado o título | (1,1) |
| `Fecha_Otorg` | Fecha de obtención | (1,1) |
| `Tipo` | Diferencia entre grado y título | (1,1) |

---

#### Entidad: CURSO_CAPACITACION
> Curso de capacitación del empleado (otorgado por empresa o personal).

| Campo | Definición | Cardinalidad |
|-------|-----------|-------------|
| `Nombre_Curso` | Nombre del proyecto de capacitación | (1,1) |
| `Costo_Curso` | Monto gastado por la empresa | (0,1) |
| `Fecha_Inicio` | Fecha inicio de la capacitación | (0,1) |
| `Fecha_Final` | Fecha fin de la capacitación | (0,1) |
| `Descripcion_Cap` | Descripción breve de la capacitación | (0,1) |
| `Estado` | Indica si fue otorgada por empresa o gestionada por el empleado | (1,1) |

---

#### Entidad: ASISTENCIA
> Registro diario de asistencia por trabajador.

| Campo | Definición | Cardinalidad |
|-------|-----------|-------------|
| `Fecha` | Fecha del registro | (1,1) |
| `Hora_Ingreso` | Hora de ingreso del trabajador | (0,1) |
| `Hora_Salida` | Hora de salida del trabajador | (0,1) |
| `Flag_Asistencia` | 1 = asistió / 0 = no asistió | (1,1) |

---

#### Entidad: EXPERIENCIA_LABORAL
> Experiencia del trabajador en empresas anteriores.

| Campo | Definición | Cardinalidad |
|-------|-----------|-------------|
| `Area_Trabajo` | Área desempeñada en la empresa anterior | (1,1) |
| `Fecha_Ing` | Fecha de ingreso a la empresa anterior | (0,1) |
| `Fecha_Cese` | Fecha de cese en la empresa anterior | (0,1) |
| `Tiempo_Laborado` | Tiempo total de servicios prestados | — |

---

#### Entidad: EMPRESA
> Empresa anterior donde laboró el trabajador.

| Campo | Definición | Cardinalidad |
|-------|-----------|-------------|
| `Empresa` | Nombre de la empresa | (1,1) |
| `Dirección` | Dirección de la empresa | (0,1) |
| `Departamento` | Departamento donde está la empresa | (1,1) |
| `Telefono` | Teléfono de la empresa | (0,1) |
| `Fax` | Número de fax | (0,1) |

---

#### Entidad: PLANILLA
> Planilla mensual de trabajadores (datos generales).

| Campo | Definición | Cardinalidad |
|-------|-----------|-------------|
| `Nro_Planilla` | Número identificador de la planilla | (1,1) |
| `Fecha_Emisión` | Fecha de procesamiento | (1,1) |
| `Fecha_Inicio` | Fecha inicial del período | — |
| `Fecha_Fin` | Fecha final del período | — |
| `Tipo_Planilla` | Empleados o Obreros | (1,1) |
| `Total_Pagar` | Total a pagar incluyendo todos los trabajadores | (1,1) |
| `Total_Ing_Trab` | Total sin considerar descuentos | (1,1) |
| `Total_Descuentos` | Total de descuentos aplicados | (0,1) |
| `Total_Viaticos` | Total de viáticos asignados | (0,1) |

---

#### Entidad: DETALLE_PLANILLA
> Detalle del sueldo mensual por trabajador.

| Campo | Definición | Cardinalidad |
|-------|-----------|-------------|
| `Dscto_SNP` | Descuento por servicios no personales | (1,1) |
| `Doctos_Inasistencias` | Descuento por inasistencias | (1,1) |
| `Remuneración_Actual` | Monto antes de descuentos | (1,1) |
| `Haber_Neto` | Monto final con descuentos aplicados | (1,1) |
| `Viaticos` | Monto de viáticos asignados | (0,1) |
| `N_Horas` | Cantidad de horas trabajadas | (1,1) |

---

#### Entidad: MERITOS

| Campo | Definición | Cardinalidad |
|-------|-----------|-------------|
| `Nro_Doc` | Código PK del mérito | (1,1) |
| `Motivo_Mer` | Motivo del mérito otorgado | (1,1) |
| `Fecha_Mer` | Fecha del mérito | (1,1) |

---

#### Entidad: SANCION

| Campo | Definición | Cardinalidad |
|-------|-----------|-------------|
| `Nro_Documento` | Código PK de la sanción | (1,1) |
| `Responsable_Sancion` | Datos del funcionario que aplicó la sanción | (1,1) |
| `Fecha_Sancion` | Fecha de la sanción | (1,1) |
| `Descripcion` | Descripción de la sanción aplicada | (1,1) |

---

#### Entidad: INSTITUCION
> Institución donde se dictó una capacitación o se obtuvo un grado.

| Campo | Definición | Cardinalidad |
|-------|-----------|-------------|
| `IdInstitucion` | Código PK de la institución | (1,1) |
| `Nom_Institucion` | Nombre de la institución | (1,1) |
| `Direccion` | Dirección de la institución | (1,1) |

---

#### Entidad: CARGO

| Campo | Definición | Cardinalidad |
|-------|-----------|-------------|
| `IdCargo` | Código PK del cargo | (1,1) |
| `Nom_Cargo` | Nombre del cargo | (1,1) |
| `Descripción_Cargo` | Descripción del cargo | (1,1) |
| `Remuneración_Base` | Remuneración base del cargo | (1,1) |

---

#### Entidad: ÁREA

| Campo | Definición | Cardinalidad |
|-------|-----------|-------------|
| `Id_Area` | Código PK del área | (1,1) |
| `Nom_Area` | Nombre del área dentro de la empresa | (1,1) |
| `Descripción` | Descripción del área | (1,1) |

---

## Conclusiones

1. El análisis permitió diseñar la arquitectura del software y los prototipos de interfaz para la implementación del sistema.
2. Las interfaces revelaron los subsistemas necesarios para el funcionamiento adecuado del sistema.
3. Los prototipos de interfaz sirven como herramienta de verificación de la funcionalidad del sistema.
4. El sistema manual presentaba deficiencias críticas:
   - Control de asistencia manual → errores en descuentos de planillas
   - Sin control sistematizado de capacitaciones → riesgo de errores en análisis de gastos
   - Sin control automatizado de sanciones ni jerarquización de las mismas
5. **Conclusión final:** Es necesaria la automatización del control de personal para mayor rapidez en búsquedas, precisión en cálculos y mejora de productividad institucional.

---

## Recomendaciones

1. **Sistematizar el control de asistencia** — el sistema actual de planillas existente no incluye control automático de faltas; se ingresa manualmente tras conteo manual.
2. **Sistematizar el registro de capacitaciones** — facilita análisis de gastos a directivos.
3. **Automatizar el registro de sanciones y méritos** — facilita análisis del historial del trabajador.
4. **Desarrollar el sistema integral de control de personal** — engloba todos los puntos anteriores.

---

## Apéndice: Entrevista Realizada al Jefe Administrativo

### Datos del Entrevistado
- **Cargo:** Jefe Administrativo — IDEPUNP

### Resumen de Hallazgos Clave

| Tema | Información relevante |
|------|----------------------|
| **Control de asistencia** | Tarjetas físicas en caseta de ingreso para nombrados y contratados |
| **Modalidades de personal** | Nombrados (7 personas, tiempo completo) y Servicios No Personales (~12 personas) |
| **Estructura organizacional** | Consejo Directivo > Director General > Directores Académico y Administrativo |
| **Categorías docentes** | Casi todos principales; 2 asociados |
| **Capacitaciones** | Financiadas por el IDEPUNP; temas: computación, contabilidad, formulación de proyectos |
| **Méritos** | Reconocimientos informales en actas del Consejo Directivo; no son económicos |
| **Ascensos** | No existen; la estructura está definida |
| **Horas extras** | Sí se trabajan (hasta las 9-10pm, fines de semana) y están justificadas |
| **Registro de ingreso** | Hojas de control + ficha de datos personales/currículum al ingresar |
| **Sanciones aplicadas** | Conversación → Memorando → Disponibilidad; hasta 3 faltas = reemplazo |
| **Faltas justificadas** | Se acepta notificación previa; coordinador académico busca reemplazo |
| **Ciclo de pago** | Cada 3-4 semanas según disponibilidad presupuestaria |
| **Tipos de planilla** | 2 para docentes (nombrados y SNP), 2 para administrativos, 1 para limpieza |
| **Descuentos** | Solo impuesto de renta si honorarios > 700 soles (no AFP ni asignación familiar) |
| **Beneficios extras** | Plus de movilidad para personal de filiales (ej. Sullana) |
| **Adelantos** | No se otorgan adelantos ni préstamos |
| **Elección directiva** | Designada por el Rector de la UNP |
| **Evaluación docente** | Realizada por alumnos; es factor determinante para renovación de contrato |

---

## Bibliografía

- Hawryszkiewycz, I.T. — *Introducción al Análisis y Diseño de Sistemas con Ejemplos Prácticos*. Ediciones Anaya Multimedia, Madrid, 1990.
- Pressman, Roger S. — *Ingeniería de Software: Un Enfoque Práctico*. McGraw-Hill, 5ª ed., 1999.
- Bayona Machado, Ronweld — *Modelamiento de un Sistema de Base de Datos Relacional para el Sistema Integrado de Gestión Académica*. UNP, Perú, 2000.
- Revista COMPUTERWORLD PERU — Publicación Quincenal, Dic. 2001.
- Revista de Informática "ENCHUFATE" — Diario El Tiempo, 2000–2002.
