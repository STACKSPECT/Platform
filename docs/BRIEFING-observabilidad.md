# Briefing de diseño — Interfaz de observabilidad de ejecuciones

Sistema monitorizado: brazo robótico que **apila paquetes en palés** vigilando el
centro de gravedad, reconoce los paquetes por visión y replica apilaciones ordenadas.

Rama: `feature/observabilidad` · BBDD: Supabase · Front: Next.js + `@supabase/supabase-js`

> Alcance de este documento: **solo el briefing**. Sirve para diseñar la interfaz.
> El backend se ataca después, en paralelo al diseño.

---

## Context

`CHALLENGE.html` puntúa sobre dos ejes, y uno de los cinco criterios del eje B es
literalmente **"Iteración y mejora medida: indicadores propios, medidos, y datos que
respalden cuánto habéis mejorado la solución durante el desarrollo"**. Hoy esa evidencia
vive en 43 carpetas `runs/<timestamp>/episodes.jsonl` (665 episodios) gitignoradas: existe, pero no es
enseñable en una demo ni comparable entre commits.

A la vez el sistema pivota de **inducción** (bultos sueltos → caja) a **paletizado**.
Esa tarea produce números que un `jsonl` plano no sabe representar: una traza de centro
de gravedad que se desplaza capa a capa, un polígono de soporte, error por paquete
contra el hueco planificado.

La observabilidad se construye **antes** que el pipeline de paletizado, a propósito: si
la instrumentación existe desde el primer episodio, la curva de mejora se mide sola. La
tarea es un campo (`induction` | `palletizing`), así que la línea base medida el
19/09/2026 no se tira.

**Resultado esperado:** un comando lanza N episodios, la UI los muestra en directo
mientras corren, y quedan almacenados comparables por commit, nivel y tarea.

---

## 1. El sistema que se monitoriza

Lo que la interfaz tiene que hacer visible, en el orden en que ocurre:

| Fase | Qué produce el sistema | Qué hay que poder ver |
|---|---|---|
| **Percibir** | imagen RGB-D → paquetes detectados (pose, dimensiones, clase) | el frame con las cajas dibujadas, la confianza, cuántos vio vs cuántos había |
| **Decidir** | asignación paquete → hueco en el palé (capa, posición, yaw) | el plan de apilado, y si el paquete acabó en el hueco previsto o en otro |
| **Ejecutar** | trayectoria del brazo → paquete depositado | el error real contra el hueco, en mm y en grados |
| **Asentar** | física: ¿se mueve el montón? | desplazamiento tras soltar, CoG resultante, margen de estabilidad |

Dos restricciones heredadas que la interfaz **debe** respetar:

- La percepción solo ve imágenes renderizadas, nunca el estado del simulador. El flag
  `--oracle` (percepción sustituida por poses reales) es la única excepción y **tiene
  que aparecer marcado y filtrable en la UI**. Un run con oracle no es comparable con
  uno sin él; mezclarlos en un mismo gráfico es mentirle al jurado.
- La velocidad del brazo (`motion_speed`) cambia el resultado. Es parte de la identidad
  de una ejecución, no un detalle: se muestra junto al commit y al nivel.

---

## 2. Audiencia y trabajos a resolver

Dos vistas sobre el mismo dato. No son dos productos: comparten modelo y componentes.

### Live — mission control

**Quién:** el jurado, en una demo de 3 minutos, probablemente de pie y mirando de lejos.
**Pregunta que responde:** *"¿esto funciona de verdad, ahora mismo?"*

- El palé montándose, capa a capa: vista cenital + alzado.
- **La cruz del centro de gravedad desplazándose dentro del polígono de soporte.** Es el
  concepto central de la tarea y lo único que debe entenderse sin explicación oral. Si el
  diseño solo acierta una cosa, que sea esta.
- Tira de KPIs grandes, legibles a 3 metros.
- Feed de eventos con timestamp, que da la sensación de sistema vivo.

### Runs — ingeniería

**Quién:** nosotros, durante el hackathon, con prisa y pocos datos en la cabeza.
**Preguntas que responde:** *"¿por qué falló la semilla 37?"* · *"¿el commit de anoche
mejoró o empeoró?"*

- Lista de ejecuciones con filtros: tarea, nivel, commit, oracle sí/no, velocidad.
- **Comparador de dos commits** sobre el mismo nivel y rango de semillas. Sin esto no hay
  "mejora medida", hay anécdotas.
- Desglose de causas de fallo.
- Detalle de episodio con scrubber temporal, error por paquete y traza de CoG.

---

## 3. Arquitectura de información

```
/                    Live          episodio en curso (o el último terminado)
/runs                Runs          lista + filtros + comparador
/runs/[id]           Run           episodios de esa ejecución, agregados
/runs/[id]/[seed]    Episodio      línea de tiempo, paquetes, traza de CoG
```

Cuatro pantallas. Nada más. Cualquier cosa que no conteste una de las preguntas de §2
sobra.

---

## 4. Pantallas

### 4.1 Live

```
┌──────────────────────────────────────────────────────────────────┐
│ ● EN VIVO   paletizado · nivel 2 · seed 37 · 8c5cbf4 · x4        │
├───────────────────────────────┬──────────────────────────────────┤
│                               │  COLOCADOS    7 / 10             │
│      VISTA CENITAL            │  CICLO        4.2 s              │
│      palé + huecos            │  ESTABILIDAD  +31 mm             │
│      + cruz de CoG            │  UTILIZACIÓN  68 %               │
│                               ├──────────────────────────────────┤
│                               │  EVENTOS                         │
├───────────────────────────────┤  12.4s  ✓ depositado  caja_03    │
│      ALZADO                   │  11.8s  ↓ cogido      caja_03    │
│      capas apiladas           │  11.1s  ◎ planificado capa 2     │
│      + altura de CoG          │  10.9s  ◉ visto       4 paquetes │
└───────────────────────────────┴──────────────────────────────────┘
```

Componentes:

- **`PalletTopView`** — palé a escala real, huecos planificados en trazo fino, paquetes
  colocados rellenos, el último resaltado. Encima, la **cruz de CoG** y el **polígono de
  soporte**. El color de la cruz es la semántica de estabilidad (§6). Un paquete que
  sobresale del palé se dibuja mordiendo el borde, no recortado.
- **`PalletSideView`** — alzado por capas, altura del CoG marcada con una línea. Hace
  visible que apilar alto es lo que mata la estabilidad.
- **`KpiStrip`** — 4 KPIs. Número grande monoespaciado + unidad + etiqueta. Nada de
  sparklines aquí: es la vista de lejos.
- **`EventFeed`** — últimos ~12 eventos, el más reciente arriba, con icono por tipo
  (`visto` `planificado` `cogido` `depositado` `asentado` `fallo`) y timestamp relativo
  al inicio del episodio.
- **`RunHeader`** — la identidad completa de lo que se está viendo: tarea, nivel, seed,
  commit, velocidad, badge de `oracle` si aplica.

Estados que hay que diseñar, no solo el feliz:
- **Sin ejecución activa** → muestra el último episodio terminado, con el punto en gris
  y la etiqueta "último". Nunca una pantalla vacía durante la demo.
- **Episodio fallido** → el KPI que corresponde se pone en rojo y el feed remata con el
  evento de fallo y su causa en texto legible ("el montón se derrumbó"), no el enum.
- **Conexión perdida** → banner discreto; los datos congelados siguen visibles. Lo peor
  que puede hacer esta pantalla es quedarse en blanco delante del jurado.

### 4.2 Runs

```
┌──────────────────────────────────────────────────────────────────┐
│ Ejecuciones      [tarea ▾] [nivel ▾] [commit ▾] [□ oracle]       │
├──────────────────────────────────────────────────────────────────┤
│ ●  8c5cbf4  paletizado  n2  x4   25 ep   64 %  ▁▃▅▆█   hace 2 h  │
│    6f0f534  paletizado  n2  x4   25 ep   41 %  ▁▂▃▂▄   hace 5 h  │
│ ⚑  4a53167  inducción   n7  x1   25 ep   16 %  ▁▁▂▁▁   ayer      │
└──────────────────────────────────────────────────────────────────┘
        ⚑ = oracle          ● = seleccionado para comparar
```

- **`RunTable`** — una fila por ejecución. Sparkline de éxito por episodio: enseña si el
  resultado es estable o es suerte de un rango de semillas, que es una distinción que ya
  nos ha mordido antes.
- **`RunCompare`** — seleccionas dos filas y se abre una comparativa: delta de tasa de
  éxito, delta de tiempo de ciclo, y el desglose de causas de fallo lado a lado. El
  diseño debe dejar claro cuándo la comparación **no es válida** (distinto nivel,
  distinto rango de semillas, uno con oracle): un aviso, no un gráfico bonito y falso.
- **`FailureBreakdown`** — barras apiladas por causa. Colores fijos por causa en toda la
  app, para que se reconozcan de un vistazo entre pantallas.

### 4.3 Episodio

```
┌──────────────────────────────────────────────────────────────────┐
│ seed 37 · nivel 2 · 8c5cbf4        FALLO · el montón se derrumbó │
├──────────────────────────────────────────────────────────────────┤
│ ├──●───●─────●──────●────✕───────────────────────┤   scrubber    │
├────────────────────────────┬─────────────────────────────────────┤
│  PALÉ en el instante t     │  TRAZA DE CoG                       │
│                            │  desplazamiento vs nº de paquete    │
├────────────────────────────┴─────────────────────────────────────┤
│  # tipo        masa   capa  error xy   yaw    soporte  estado    │
│  1 caja_media  1.2kg   1     4.1 mm   0.9°     100 %    ✓        │
│  2 caja_alta   2.8kg   1     7.8 mm   2.1°      94 %    ✓        │
│  3 caja_media  1.2kg   2    19.4 mm   7.7°      61 %    ✕        │
└──────────────────────────────────────────────────────────────────┘
```

- **`Timeline`** — scrubber sobre los eventos del episodio. Al moverlo, la vista del palé
  y la traza de CoG se sitúan en ese instante. Da el efecto "replay" sin vídeo.
- **`CogTrace`** — el desplazamiento del CoG y el margen de estabilidad, paquete a
  paquete, con la banda de tolerancia de fondo. En un episodio que acaba en derrumbe,
  aquí se ve venir el fallo varias colocaciones antes. Ese es el gráfico que gana puntos.
- **`PlacementTable`** — una fila por paquete. Ordenable por error. Es la tabla desde la
  que se decide qué arreglar mañana.

---

## 5. Diccionario de métricas

Universales (toda tarea):

| Métrica | Unidad | Definición |
|---|---|---|
| `n_objects` / `n_placed` | ud | paquetes presentes / colocados correctamente |
| `success` | bool | criterio del nivel cumplido al terminar el episodio |
| `duration_s` | s | tiempo simulado del episodio |
| `cycle_time_s` | s | `duration_s / n_placed` — el número que entiende una planta |
| `failure` | enum | vocabulario cerrado, `null` si éxito |
| `oracle` | bool | percepción sustituida por poses reales |

De paletizado:

| Métrica | Unidad | Definición |
|---|---|---|
| `cog_offset_xy` | mm | distancia del CoG de la carga al centro del palé |
| `stability_margin` | mm | distancia del CoG al borde más cercano del polígono de soporte. **Negativo = vuelca** |
| `support_ratio` | 0-1 | fracción de la base del paquete apoyada sobre algo sólido |
| `overhang` | mm | cuánto sobresale del palé el paquete que más sobresale |
| `fill_ratio` | 0-1 | volumen ocupado / volumen del envolvente de la carga |
| `layer_flatness` | mm | desviación de altura dentro de una capa |
| `pattern_match` | 0-1 | parecido con la apilación ordenada pedida (solo si se pidió una) |
| `settle_drift` | mm | cuánto se movió el montón entre soltar y estabilizarse |

Causas de fallo, con su texto legible para la UI:

| enum | texto en pantalla |
|---|---|
| `no_detection` | no vio ningún paquete |
| `ik_unreachable` | no alcanza la posición |
| `collision` | chocó |
| `grasp_slip` | se le escapó de la pinza |
| `wrong_placement` | lo dejó fuera de tolerancia |
| `timeout` | se quedó sin tiempo |
| `stack_collapse` | el montón se derrumbó |
| `overhang_violation` | lo dejó fuera del palé |

Las dos últimas son nuevas de paletizado. La UI **nunca** muestra el enum crudo.

---

## 6. Lenguaje visual

Sala de control industrial. Fondo oscuro, sin adornos.

- **Números en monoespaciada**, para que al actualizarse no bailen las columnas.
- **Unidad siempre visible.** `4.1 mm`, nunca `4.1`. Media interfaz de este proyecto son
  magnitudes físicas y confundir mm con cm es el error que se cuela en una demo.
- **Semántica de color estricta**, tres estados y solo tres:
  - verde — dentro de tolerancia
  - ámbar — en el margen (< 20 % de holgura restante)
  - rojo — fuera / fallo
  - Nada de degradados bonitos: el jurado tiene que saber si va bien sin leer números.
- **Una identidad de color por causa de fallo**, constante en toda la app.
- **El palé se dibuja a escala real**, con sus medidas. Un esquemático genérico no
  transmite que esto modela un proceso físico creíble, que es un criterio con puntos
  extra explícitos en el enunciado.
- **Badge de `oracle`** visualmente ruidoso allá donde aparezca. Debe molestar a la vista:
  esos números no son los de verdad.
- **Responsive hasta ~400 px.** La demo puede acabar enseñándose en un móvil. En estrecho,
  Live apila KPIs sobre vista cenital y el feed pasa a colapsable.

---

## 7. Qué dato tiene disponible el diseño

Para que el diseño no invente campos que luego no existan, esto es lo que la BBDD
tendrá. Cinco tablas: lo común a toda tarea en columnas tipadas, lo específico en `jsonb`.

```
runs           id, started_at, ended_at, task, level, git_sha, oracle,
               motion_speed, label, config, n_episodes

episodes       id, run_id, seed, task, level, status, started_at, ended_at,
               duration_s, n_objects, n_placed, score, failure, metrics

placements     id, episode_id, seq, package_id, package_type, mass_kg, dims_m,
               layer, planned_pose, actual_pose, error_xy_m, error_yaw_rad,
               support_ratio, overhang_m, placed

pallet_states  id, episode_id, after_seq, mass_kg, cog_x, cog_y, cog_z,
               stability_margin_m, fill_ratio
               -- una fila por paquete depositado: esto ES la traza de CoG

events         id, episode_id, ts, seq, kind, package_id, payload
               -- kind: perceive | plan | pick | place | settle | fail
```

Notas que afectan al diseño:

- **Realtime** llega por `events` y `pallet_states`. La vista Live se alimenta de esas
  dos suscripciones; todo lo demás es consulta normal.
- La UI **no agrega nada en el cliente**: los totales vienen de vistas SQL.
- El `jsonl` en disco sigue siendo la fuente de verdad y Supabase una réplica. Si la red
  cae, el benchmark no falla — pero la UI sí puede quedarse sin datos nuevos, y por eso
  el estado "conexión perdida" de §4.1 es obligatorio, no decorativo.
- Hay **43 ejecuciones históricas** (665 episodios) de la tarea de inducción listas para cargar. La vista
  Runs nace con datos reales dentro, no vacía. El diseño debe aguantar ver dos tareas
  distintas en la misma tabla.

---

## 8. Fuera de alcance

- **El pipeline de paletizado en sí** (percepción de paquetes, planificador de capas con
  CoG, ejecución). Es el trabajo siguiente; este modelo de datos ya lo espera.
- **Auth de usuarios.** Lectura pública con RLS; escritura solo desde el lado Python.
- **Despliegue.** Cuando `web/` funcione en local.

---

## Siguiente paso

Entregado el briefing, se arranca el **backend** (esquema en Supabase + sink de telemetría
en Python + carga del histórico) en paralelo al diseño de la interfaz.
