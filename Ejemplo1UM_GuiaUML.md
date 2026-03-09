# 📐 Análisis Orientado a Objetos con UML — Guía de Referencia

> **Tipo de documento:** Guía teórico-práctica de UML  
> **Metodología:** Análisis Orientado a Objetos (AOO)  
> **Herramientas de modelado referenciadas:** Rational Rose, ArgoUML, StarUML, Poseidón for UML  
> **Diagramas cubiertos:** Clases, Casos de Uso, Interacción (Secuencia + Colaboración), Estados, Actividades, Despliegue

---

## Tabla de Contenidos

1. [Introducción a UML](#1-introducción-a-uml)
2. [Modelo de Clases](#2-modelo-de-clases)
3. [Casos de Uso](#3-casos-de-uso-use-case)
4. [Diagrama de Interacción](#4-diagrama-de-interacción)
5. [Ejemplo 1: Sistema de Hotel](#5-ejemplo-1-sistema-de-hotel)
6. [Ejemplo 2: Sistema de Registro de Nacimientos](#6-ejemplo-2-sistema-de-registro-de-nacimientos)
7. [Actividades Prácticas con Herramienta UML](#7-actividades-prácticas-con-herramienta-uml)

---

## 1. Introducción a UML

### ¿Qué es UML?

**UML (Unified Modeling Language — Lenguaje de Modelamiento Unificado)** es un lenguaje gráfico estándar para:

- **Visualizar** la estructura y comportamiento de un sistema de software
- **Especificar** los componentes y sus relaciones
- **Documentar** cada parte del proceso de desarrollo

### ¿Qué puede modelar UML?

| Tipo | Ejemplos |
|------|---------|
| **Cosas conceptuales** | Procesos de negocio, funciones del sistema |
| **Cosas concretas** | Clases en código, esquemas de BD, componentes reutilizables |

### Diagramas principales estudiados en esta guía

1. **Modelo de Clases** — estructura estática del sistema
2. **Casos de Uso** — comportamiento del sistema desde perspectiva del usuario
3. **Diagrama de Interacción** — comunicación entre objetos en tiempo de ejecución

---

## 2. Modelo de Clases

### 2.1 Introducción

Un **Diagrama de Clases** visualiza las relaciones entre las clases del sistema. Tipos de relaciones posibles:

- Asociativas
- De herencia
- De uso
- De contenimiento (composición/agregación)

### 2.2 La Clase en UML

Una clase se representa como un **rectángulo con tres secciones**:

```
┌────────────────────┐
│   NombreClase      │  ← Sección Superior: Nombre
├────────────────────┤
│ - atributo1        │  ← Sección Intermedia: Atributos
│ # atributo2        │
│ + atributo3        │
├────────────────────┤
│ + metodo1()        │  ← Sección Inferior: Métodos
│ - metodo2()        │
└────────────────────┘
```

**Ejemplo práctico — Clase CuentaCorriente:**

```
┌──────────────────────┐
│   CuentaCorriente    │
├──────────────────────┤
│ - balance: float     │
├──────────────────────┤
│ + depositar()        │
│ + girar()            │
│ + balance()          │
└──────────────────────┘
```

---

### 2.3 Visibilidad de Atributos y Métodos

| Símbolo | Palabra clave | Descripción |
|---------|--------------|-------------|
| `+` | `public` | Visible desde cualquier parte del sistema |
| `-` | `private` | Solo accesible desde dentro de la clase |
| `#` | `protected` | Accesible desde la clase y sus subclases (herencia) |

> **Regla de diseño:** Preferir atributos `private` o `protected`. Los métodos públicos forman la interfaz de la clase.

---

### 2.4 Cardinalidad de Relaciones

La cardinalidad indica el grado de dependencia entre clases y se anota en cada extremo de la relación:

| Notación | Significado |
|----------|------------|
| `1..1` | Exactamente uno |
| `1..*` (o `1..n`) | Uno o muchos |
| `0..*` (o `0..n`) | Cero o muchos (opcional) |
| `m` | Número fijo |

---

### 2.5 Tipos de Relaciones entre Clases

#### 1) Herencia (Especialización / Generalización)

**Símbolo:** Flecha con triángulo vacío apuntando a la superclase → `▷`

**Descripción:** Una subclase hereda los métodos y atributos visibles (`public` y `protected`) de la superclase. Además añade sus propios atributos y métodos.

**Ejemplo:**

```
        Vehículo
        - Precio
        - VelMax
        + Caracteristicas()
           ↑
    ┌──────┴──────┐
    │             │
   Auto         Camión
   - Descapotable  - Acoplado
                   - Tara
                   - Carga
```

> **Nota:** Solo `Caracteristicas()` es visible externamente (public). `Descapotable` no es visible por ser `private`.

---

#### 2) Agregación

**Símbolo:** Rombo en el objeto que "posee" la referencia → `◇`

Existen dos variantes:

| Variante | Tipo | Símbolo | Ciclo de Vida |
|----------|------|---------|---------------|
| **Composición** | Por Valor ("parte/todo") | `◆` Rombo relleno | El objeto incluido muere con el que lo contiene |
| **Agregación** | Por Referencia | `◇` Rombo transparente | El objeto incluido es independiente |

**Ejemplo:**

```
Almacen ◆──── Cuenta     (Composición: si Almacen muere, Cuenta también)
Almacen ◇──── Cliente    (Agregación: si Almacen muere, Cliente sobrevive)
```

> La flecha indica la dirección de navegabilidad. Si no hay particularidad, se omite.

---

#### 3) Asociación

**Símbolo:** Línea simple con flecha → `───>`

**Descripción:** Relación no fuerte entre clases que colaboran. El tiempo de vida de un objeto no depende del otro.

**Ejemplo:**

```
Cliente ──1──> 0..* OrdenDeCompra
```
*Un cliente puede tener muchas órdenes de compra; una orden pertenece a un solo cliente.*

---

#### 4) Dependencia / Instanciación (Uso)

**Símbolo:** Flecha punteada → `- - ->`

**Descripción:** Una clase es instanciada dependiendo de otra. El objeto creado **no se almacena** dentro del objeto que lo crea.

**Ejemplo:**

```
Aplicacion - - -> Ventana
```
*(La Ventana es creada por Aplicacion pero no es parte de ella)*

---

### 2.6 Casos Particulares de Clases

#### Clase Abstracta

```
«abstract»
NombreClase
─────────────
 metodoAbst()    ← Nombre en cursiva
```

- No puede ser instanciada directamente
- Tiene métodos sin implementación (abstractos)
- Solo puede usarse mediante subclases que implementen los métodos abstractos

#### Clase Parametrizada (Genérica)

```
           ┌─────┐
           │ T,V │  ← Parámetros genéricos
┌──────────┴─────┴──┐
│   Diccionario     │
├───────────────────┤
│ - tabla: T → V    │
└───────────────────┘
```

- Requiere parámetros para ser instanciada
- Uso típico: estructuras de datos genéricas (diccionarios, listas, pilas)
- En C++ se implementa con `template`

---

## 3. Casos de Uso (Use Case)

### 3.1 Introducción

El **Diagrama de Casos de Uso** representa cómo un Actor (usuario) opera con el sistema: las operaciones disponibles y el orden en que pueden ejecutarse.

### 3.2 Elementos del Diagrama

#### Actor

```
    O
   /|\
   / \
  Actor
```

- Rol que un usuario juega respecto al sistema
- **No representa una persona específica**, sino una función/rol
- El mismo rol puede ser ejercido por diferentes personas

**Ejemplo:** En un sistema de ventas, el rol "Vendedor" puede ser desempeñado por un vendedor o por el jefe de local.

---

#### Caso de Uso

```
╭────────────────╮
│  Nombre CU     │  ← Elipse con nombre
╰────────────────╯
```

- Operación o tarea específica
- Se ejecuta por orden de un actor o por invocación de otro caso de uso

---

### 3.3 Tipos de Relaciones en Casos de Uso

| Relación | Símbolo | Cuándo usar |
|----------|---------|------------|
| **Asociación** | `───>` | Invocación básica actor → caso de uso |
| **Dependencia** | `- - ->` | Una clase/CU instancia a otro |
| **Generalización `<<extends>>`** | `──▷` | Un CU es similar a otro (variante/extensión) |
| **Generalización `<<uses>>`** | `──▷` | Comportamiento compartido entre varios CU (reutilización) |

> **Regla práctica:**
> - Usar `<<extends>>` cuando un CU es una variante especializada de otro
> - Usar `<<uses>>` cuando múltiples CU comparten el mismo sub-comportamiento

---

### 3.4 Ejemplo: Máquina Recicladora

**Descripción del sistema:**
Sistema que controla una máquina de reciclamiento de botellas, tarros y jabas.

**Requisitos funcionales:**
- Registrar número de ítems ingresados
- Imprimir recibo con: descripción, valor por ítem y total
- Cliente activa el sistema con botón de inicio
- Operador consulta: ítems retornados en el día y resumen diario
- Operador puede cambiar información de ítems
- Sistema genera alarma si: ítem se atasca o no hay papel

**Actores identificados:**
- `Cliente` — puede depositar ítems
- `Operador` — puede cambiar información de ítems, imprimir informes

**Jerarquía de ítems:**
- `Item` → subtipos: `Botella`, `Tarro`, `Jaba`

**Relaciones clave en el diagrama:**
- `ImprimirComprobante` se activa tanto por `Cliente` (post-depósito) como por `Operador` (a petición)
- Se usa `<<extends>>` o `<<uses>>` para modelar estas variantes

---

## 4. Diagrama de Interacción

### 4.1 Introducción

El **Diagrama de Interacción** muestra cómo los objetos se comunican entre sí ante un evento específico. Permite identificar claramente las responsabilidades de cada objeto.

Puede derivarse desde:
- El Diagrama Estático de Clases
- El Diagrama de Casos de Uso

### 4.2 Tipos de Diagramas de Interacción

| Tipo | Descripción |
|------|-------------|
| **Diagrama de Secuencia** | Muestra la secuencia temporal de mensajes entre objetos |
| **Diagrama de Colaboración** | Muestra la estructura de objetos que colaboran (sin énfasis en tiempo) |

### 4.3 Elementos

#### Objeto / Actor

```
┌──────────────┐
│ :NombreClase │  ← Rectángulo: instancia del objeto
└──────┬───────┘
       │
       │ ←── Línea de vida (punteada)
       │
```

#### Mensaje entre Objetos

```
ObjetoA ──── metodo() ────> ObjetoB
```
*Llamada al método de otro objeto*

#### Mensaje al Mismo Objeto (auto-mensaje)

```
Objeto ──┐
         │ metodo()
         └──> Objeto
```
*El objeto se llama a sí mismo*

---

### 4.4 Ejemplo: Aplicación con Ventana y Botón

**Modelo estático:**
```
Aplicacion ──── Ventana ──── Boton
```

**Diagrama de Interacción:**
```
Aplicacion    Ventana      Boton
    │             │            │
    │──Draw()────>│            │
    │             │──Draw()───>│
    │             │            │──Paint()──┐
    │             │            │<──────────┘
```

---

## 5. Ejemplo 1: Sistema de Hotel

### 5.1 Descripción del Sistema

El dueño de un hotel requiere un programa para consultar disponibilidad y reservar habitaciones.

**Tipos de habitaciones:** simple, doble, matrimonial  
**Tipos de clientes:** habituales, esporádicos

Una reservación almacena: datos del cliente, pieza reservada, fecha de inicio y número de días de ocupación.

### 5.2 Requisitos Funcionales

#### Recepcionista puede:

| # | Operación |
|---|-----------|
| 1 | Obtener listado de piezas disponibles por tipo |
| 2 | Consultar precio de pieza por tipo |
| 3 | Consultar descuento para clientes habituales |
| 4 | Consultar precio total para un cliente (RUC, tipo pieza, noches) |
| 5 | Mostrar foto de pieza por tipo |
| 6 | Reservar pieza (número pieza, RUC y nombre del cliente) |
| 7 | Eliminar reserva (número de pieza) |

#### Administrador puede:

| # | Operación |
|---|-----------|
| 1 | Cambiar precio de pieza por tipo |
| 2 | Cambiar descuento para clientes habituales |
| 3 | Calcular ganancias de un mes especificado (asumiendo 30 días/mes) |

### 5.3 Estructura de Datos de Clientes

- Los clientes habituales se gestionan con un **diccionario**:
  - **Clave:** número de RUC
  - **Valor:** datos personales del cliente

### 5.4 Criterios de Diseño

- El diseño debe facilitar la extensibilidad:
  - Nuevos tipos de pieza sin reestructurar el sistema
  - Nuevos tipos de clientes sin reestructurar el sistema
  - Agregar nuevas consultas fácilmente

### 5.5 Diagramas

> Los diagramas (Casos de Uso, Clases, Interacción) están incluidos como imágenes `.jpeg` en el documento original.

**Actores identificados:**
- `Recepcionista` — operaciones de consulta y reserva
- `Administrador` — operaciones de gestión de precios y reportes

**Clases principales (inferidas del modelo):**
- `Hotel`
- `Pieza` (abstracta → `PiezaSimple`, `PiezaDoble`, `PiezaMatrimonial`)
- `Cliente` (abstracta → `ClienteHabitual`, `ClienteEsporadico`)
- `Reservacion`
- `Diccionario<RUC, DatosCliente>`

---

## 6. Ejemplo 2: Sistema de Registro de Nacimientos

### 6.1 Casos de Uso del Sistema

**Actores:**
- `Usuario` (ciudadano que registra)
- `Jefe de Registro` (valida y firma)

**Casos de uso principales:**
- `Autentificar Usuario`
- `Registrar Partida`
- `Consultar Partida`
- `Administrar Sistema`

---

### 6.2 Descripción de Casos de Uso

#### CU-0001: Autentificar Usuario

| Campo | Detalle |
|-------|---------|
| **Versión** | 1.0 |
| **Actores** | Usuario / Jefe de Registro |
| **Objetivo** | Iniciar sesión en el sistema |
| **Descripción** | Ingreso al sistema mediante código y contraseña |
| **Precondiciones** | Ninguna |
| **Secuencia Normal** | 1) Sistema solicita usuario y contraseña. 2) Sistema valida datos. 3) Si correcto: habilita usuario, muestra mensaje de éxito. 4) Sistema presenta menú según permisos. |
| **Postcondiciones** | Usuario habilitado con permisos apropiados. |
| **Excepciones** | 1) Usuario puede borrar datos antes de validar. 2) Si datos incorrectos: permite reintentar hasta 3 veces; luego bloquea el sistema por 30 segundos. |
| **Frecuencia esperada** | 3 veces por día |
| **Importancia** | Vital |

---

#### CU-0002: Registrar Partida

| Campo | Detalle |
|-------|---------|
| **Versión** | 1.0 |
| **Actores** | Usuario / Jefe de Registro |
| **Objetivo** | Registrar una partida de nacimiento |
| **Descripción** | Registro completo de una persona en el sistema de partidas. |
| **Precondiciones** | Ninguna |
| **Secuencia Normal** | 1) Sistema solicita código del certificado hospitalario. 2) Sistema valida el código. 3) Si válido: habilita al usuario. 4) Presenta menú con permisos. 5) Usuario ingresa información requerida. 6) Sistema valida la información. 7) Sistema imprime firma del jefe de registros. 8) Sistema almacena datos e imprime partida si se solicita. |
| **Postcondiciones** | Datos de la persona almacenados correctamente en el sistema. |
| **Frecuencia esperada** | 3 veces por día |
| **Importancia** | Vital |

---

### 6.3 Escenario #1: Registrar Persona

**Actores:** Rosa y José (padres de un recién nacido)

**Flujo del escenario:**

1. Rosa o José acceden a una cabina pública de internet cercana
2. Ingresan el **código del certificado hospitalario**
3. Sistema valida el código
4. Si válido: acceden al sistema de registro de partidas
5. Ingresan todos los datos requeridos; el sistema verifica completitud y fecha de registro
6. Ingresan firmas de los padres por medio electrónico (lápiz óptico, firma escaneada en USB/CD)
7. Sistema valida las firmas consultando la base de datos de **RENIEC**
8. Si firmas válidas: sistema imprime la firma del jefe de registro civil
9. El sistema imprime la **Partida de Nacimiento** previa autorización de los padres

---

### 6.4 Diagramas del Sistema de Nacimientos

| Diagrama | Descripción |
|----------|-------------|
| **Secuencia: Administrar Sistema** | Flujo de mensajes para la gestión administrativa del sistema |
| **Colaboración: Administrar Sistema** | Estructura de objetos colaborando en la administración |
| **Secuencia: Registrar Partida** | Flujo completo de registro de una partida de nacimiento |
| **Colaboración: Registrar Sistema** | Objetos involucrados en el registro |
| **Secuencia: Consultar Partida** | Flujo para consulta de una partida existente |
| **Colaboración: Consultar Partida** | Estructura de objetos para consulta |
| **Diagrama de Estado** | Estados de una Partida de Nacimiento durante su ciclo de vida |
| **Diagrama de Actividad** | Actividades del proceso de registro |
| **Diagrama de Clases** | Modelo estático completo del sistema |

---

## 7. Actividades Prácticas con Herramienta UML

> Las siguientes actividades usan **Poseidón for UML Community Edition** (o equivalente: Rational Rose, ArgoUML, StarUML). Las instrucciones son aplicables a cualquier herramienta UML estándar.

### Actividad 1 — Paquetes y Dependencias

**Objetivo:** Crear estructura de paquetes con relaciones de composición, generalización y dependencia.

**Paquetes a crear bajo `Actividad 1`:**
- `Editor`, `Controlador`, `Elementos de Diagrama`, `Elementos de Dominio`
- `Núcleo Gráfico`, `Núcleo Motif`, `MS Windows`, `Motif`, `Sistema de Ventanas`

**Pasos:**
1. Crear nuevo proyecto
2. Crear paquete raíz `Actividad 1`
3. Crear subpaquetes listados arriba
4. Crear diagrama de clases `Actividad 1`
5. Arrastrar paquetes al diagrama
6. Establecer relaciones de **generalización** entre paquetes según figura de referencia
7. Agregar relaciones de **dependencia** entre paquetes

> **Nota:** `Delete` elimina del modelo/proyecto. `Ctrl+Delete` elimina solo del diagrama.  
> Para exportar: usar `Ficheros|Guardar gráficos` (formatos: wmf, gif, jpg) o captura de pantalla.

---

### Actividad 2 — Diagrama de Casos de Uso Básico

**Objetivo:** Dibujar un diagrama de casos de uso simple.

**Pasos:**
1. Crear paquete `Actividad 2` en el mismo proyecto
2. Crear diagrama de casos de uso `Actividad 2`
3. Dibujar el diagrama según la figura de referencia

---

### Actividad 3 — Secuencia + Colaboración

**Objetivo:** Crear diagramas de secuencia y colaboración para un escenario de reintegro bancario.

**Escenario:** `Reintegro con saldo insuficiente`

**Pasos:**
1. Crear paquete `Actividad 3`
2. Reutilizar actor `Cliente` del paquete `Actividad 2` (arrastrando desde navegador)
3. Crear diagrama de casos de uso `Actividad 3`
4. Crear nodo de colaboración denominado `Reintegro`
5. Crear diagrama de secuencia `Reintegro con saldo insuficiente`
6. Crear diagrama de colaboración `Reintegro con saldo insuficiente`

> **Importante:** Poseidón no genera automáticamente diagramas de colaboración desde secuencia ni viceversa; deben crearse manualmente.

---

### Actividad 4 — Diagrama de Clases con Relaciones

**Objetivo:** Modelar un sistema con clases, asociaciones y generalizaciones.

**Pasos:**
1. Crear paquete `Actividad 4`
2. Crear diagrama de clases
3. Introducir diagrama con clases, atributos, métodos y relaciones de herencia/asociación

> **Tip de productividad:** Doble clic en un icono de la barra de herramientas para dibujar varios elementos del mismo tipo consecutivamente.

---

### Actividad 5 — Diagrama de Estados

**Objetivo:** Modelar los estados de la clase `Socio`.

**Pasos:**
1. Crear paquete `Actividad 5`
2. Crear diagrama de clases con la clase `Socio` (atributos según figura de referencia)
3. Desde la clase `Socio` en el navegador, crear un **Diagrama de Estados**
4. Modelar los estados del ciclo de vida de un socio

---

### Actividad 6 — Diagramas de Componentes y Despliegue

**Objetivo:** Modelar la arquitectura física del sistema.

**Diagramas a crear:**
1. `Actividad 6.1` — Diagrama de **componentes** (software, librerías, módulos)
2. `Actividad 6.2` — Diagrama de **despliegue** (nodos hardware y conexiones)

> **Nota Poseidón:** El diagrama de despliegue incluye también notación de componentes; ambos tipos pueden mezclarse en el mismo diagrama.

---

### Actividad 7 — Proyecto ACME: Modelado de Requisitos

**Objetivo:** Crear una especificación de requisitos con casos de uso para el proyecto ACME.

**Estructura de paquetes:**
```
Modelo de requisitos
├── Contabilidad
├── Inventario
├── Publicidad
└── Ventas
    ├── Requisitos administrativo  (con diagrama CU)
    └── Requisitos vendedor       (con diagrama CU)
```

#### Especificación de Casos de Uso — Diagrama "Requisitos Vendedor"

---

##### CU: Venta a Cliente de Tienda

| Campo | Detalle |
|-------|---------|
| **Precondición** | Cliente se identifica con tarjeta y DNI |
| **Pasos** | 1) Vendedor ingresa código de cliente. 2) Sistema verifica si cliente es moroso. 3) `<<include>>` Realizar Venta. |

---

##### CU: Venta a No Cliente

| Campo | Detalle |
|-------|---------|
| **Precondición** | Cliente paga en efectivo o tarjeta de crédito (con identificación) |
| **Pasos** | 1) `<<include>>` Realizar Venta. |

---

##### CU: Realizar Venta *(Caso de Uso base compartido)*

| Paso | Descripción |
|------|-------------|
| 1 | Vendedor ingresa su código de vendedor |
| 2 | Sistema muestra pantalla de datos de venta |
| 3 | Vendedor introduce artículos (lector de código de barras o teclado). Por cada artículo: a) Sistema verifica stock suficiente. b) Sistema calcula plazo estimado de entrega. c) Vendedor confirma plazo con cliente. |
| 4 | Vendedor registra pago (efectivo o crédito según tipo de venta) |
| 5 | Sistema emite recibo de compra |

---

##### CU: Solicitar Autorización

| Paso | Descripción |
|------|-------------|
| 1 | Vendedor obtiene código de autorización por teléfono e ingresa al sistema |
| 2 | Sistema muestra condiciones de recargo o advertencia al cliente |
| 3 | Vendedor ingresa confirmación del cliente |

---

### Actividad 8 — Escenarios de "Realizar Venta"

**Objetivo:** Identificar escenarios del CU `Realizar Venta` y crear diagramas de secuencia.

**Pasos:**
1. Listar posibles escenarios para el CU `Realizar Venta` (ej: pago en efectivo, pago con tarjeta, stock insuficiente, etc.)
2. Crear diagrama de secuencia por escenario (actor ↔ objeto `sistema`)
3. Crear paquete `Modelo de análisis/diseño`
4. Para 2 escenarios seleccionados: analizar objetos/clases que colaboran
5. Crear diagramas de secuencia detallados reemplazando `sistema` por los objetos concretos

---

### Actividades 9–12 — Diagramas de Clases con Código

**Proyecto:** `Actividades 9-12`

#### Actividad 9 — Clases Simples

- Crear diagrama de clases `Actividad 9`
- Introducir el diagrama de clases (figura de referencia en el documento original)
- Explorar la pestaña **Previsualización del código** para ver la correspondencia entre UML y código fuente

#### Actividad 10 — Clases con Herencia

- Crear diagrama `Actividad 10` con jerarquía de clases
- Analizar correspondencia UML ↔ código

#### Actividad 11 — Clases con Composición

- Crear diagrama `Actividad 11`
- Verificar cómo la composición se traduce a código

#### Actividad 12 — Múltiples Diagramas de Clases

**Subdiagramas a crear:**

| Diagrama | Descripción |
|----------|-------------|
| `Actividad 12.1` | Diagrama con relaciones básicas |
| `Actividad 12.2` | Diagrama con relaciones más complejas |
| `Actividad 12.3` | Diagrama completo del sistema |

Para cada uno: analizar la pestaña **Previsualización del código** para verificar la correspondencia entre el modelo UML y la implementación generada.

---

## Resumen de Conceptos Clave

### Tipos de Diagramas UML

| Diagrama | Categoría | Uso principal |
|----------|-----------|---------------|
| **Clases** | Estructural | Modelo estático: clases, atributos, métodos, relaciones |
| **Casos de Uso** | Comportamiento | Funcionalidades del sistema desde perspectiva del usuario |
| **Secuencia** | Interacción | Flujo temporal de mensajes entre objetos |
| **Colaboración** | Interacción | Estructura de objetos colaborando |
| **Estados** | Comportamiento | Ciclo de vida de un objeto |
| **Actividad** | Comportamiento | Flujo de actividades/procesos (similar a flowchart) |
| **Componentes** | Estructural | Módulos de software y dependencias |
| **Despliegue** | Estructural | Distribución física en nodos hardware |

### Relaciones en UML — Resumen Visual

```
Herencia:         A ────▷ B          A hereda de B
Realización:      A - - -▷ B         A implementa interfaz B
Asociación:       A ──────── B        A y B se relacionan
Navegabilidad:    A ─────── > B       A accede a B
Composición:      A ◆──── B          B es parte de A (mismo ciclo de vida)
Agregación:       A ◇──── B          B es parte de A (ciclo de vida independiente)
Dependencia:      A - - - -> B        A usa B temporalmente
```

### Buenas Prácticas de Diseño OO

1. **Encapsulamiento:** atributos siempre `private` o `protected`
2. **Herencia vs. Composición:** preferir composición cuando sea posible
3. **Principio de responsabilidad única:** cada clase con una sola razón para cambiar
4. **Extensibilidad:** diseñar para agregar nuevos tipos sin modificar código existente
5. **Separación de actores:** identificar correctamente los roles, no las personas
6. **`<<uses>>` vs `<<extends>>`:** distinguir reutilización de variante

---

## Herramientas de Modelado UML Referenciadas

| Herramienta | Tipo | Notas |
|-------------|------|-------|
| **Rational Rose** | Comercial | Estándar industrial, generación de código |
| **ArgoUML** | Open Source | Multiplataforma, Java |
| **StarUML** | Open Source | Ligero, múltiples diagramas |
| **Poseidón for UML CE** | Community Edition | Basado en ArgoUML; impresión deshabilitada en versión gratuita |

### Exportar diagramas en Poseidón

- **Opción A:** `Ficheros → Guardar gráficos` (formatos: wmf, gif, jpg) — añade logo de Poseidón como fondo
- **Opción B:** Captura de pantalla → pegar en Paint → recortar área del diagrama → insertar en documento Word
