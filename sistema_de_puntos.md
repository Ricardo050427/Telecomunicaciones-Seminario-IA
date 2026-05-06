# Dictamen Técnico: Sistema de Priorización de Inversión (SPI)

**Proyecto:** Expansión de Conectividad WISP - Sonora 2026  
**Objetivo:** Maximizar el impacto social y la rentabilidad (ROI) mediante el análisis automatizado de 1,823 localidades.

---

## 1. Introducción
El SPI es un modelo algorítmico diseñado para identificar las localidades con mayor viabilidad técnica y comercial en el estado de Sonora. El sistema asigna un puntaje de **0 a 100**, donde los valores más altos representan las "Zonas de Inversión Inmediata".

## 2. Pilares de Evaluación (Matriz de Puntos)

La calificación final se compone de tres ejes estratégicos y un factor de ajuste técnico crítico.

### A. Potencial de Mercado (50 Puntos)
Este eje mide el volumen de clientes potenciales. Se utiliza una **función de saturación asintótica** para evitar que localidades extremadamente grandes distorsionen el modelo, enfocándose en el "punto de equilibrio" financiero.

| Métrica | Puntaje Máximo | Lógica de Cálculo |
| :--- | :---: | :--- |
| **Volumen de Hogares** | 50 | $50 \times \frac{V}{V + 150}$ |

*   *$V$ = Viviendas sin internet.*
*   **Interpretación:** Una localidad con 150 casas obtiene automáticamente 25 puntos (el 50% del peso de mercado). Esto asegura que pequeñas comunidades con alta necesidad sean visibles, pero prioriza el volumen masivo para el ROI.

### B. Urgencia y Competencia (30 Puntos)
Evalúa el vacío de oferta actual. El sistema premia la exclusividad del servicio.

| Estatus de Cobertura | Puntos | Justificación |
| :--- | :---: | :--- |
| **Sin Conectividad** | 30 | Océano azul: Mercado virgen con 0% competencia. |
| **No Garantizada** | 15 | Oportunidad: Servicio existente deficiente o inestable. |
| **Garantizada** | 0 | Mercado Saturado: Baja prioridad de entrada. |

### C. Factibilidad de Infraestructura (20 Puntos)
Mide el costo operativo y la facilidad de despliegue físico.

| Factor | Puntos | Criterio |
| :--- | :---: | :--- |
| **Proximidad a Torre** | 10 | Basado en distancia (0-40km). A menor distancia, menor latencia y costo de antenas. |
| **Suministro Eléctrico** | 10 | Presencia de red CFE. Evita el costo de sistemas solares/baterías. |

---

## 3. Factor de Ajuste: Línea de Vista (LOS)
La topografía de Sonora es el mayor riesgo para un WISP. El sistema aplica un **Multiplicador de Factibilidad** sobre el puntaje total obtenido:

1.  **Línea de Vista Libre (1.0x):** Sin cambios. La localidad es viable hoy.
2.  **Incertidumbre (0.8x):** Requiere validación de campo (pérdida del 20% de prioridad preventiva).
3.  **Bloqueada por Cerro (0.3x):** **Penalización Crítica.** El costo de inversión aumenta >300% debido a la necesidad de torres repetidoras intermedias.

---

## 4. Diagnóstico Final
Cada localidad recibe una etiqueta de diagnóstico basada en su puntaje y análisis topográfico:

*   **Viable Técnicamente:** Puntaje alto + LOS libre. Inversión de bajo riesgo.
*   **Validar Topografía:** Puntaje alto pero con incertidumbre en elevación.
*   **Requiere Repetidor:** Localidad con mercado atractivo pero bloqueada geográficamente (Alto CAPEX).
*   **Fuera de Rango:** Distancia mayor a 40km de la infraestructura más cercana.

---

> **Nota para el Presentador:**  
> Este modelo no solo busca dónde hay más gente, sino dónde es **más barato y rápido conectar a la mayor cantidad de personas**. Es una herramienta de optimización de capital (CAPEX) diseñada para asegurar que cada peso invertido genere el mayor retorno social y económico posible.
