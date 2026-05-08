import pandas as pd
import numpy as np
import math
import unicodedata
import re
import requests
import time
import os


# ---------------------------------------------------------
# 1. FUNCIONES MATEMÁTICAS Y LIMPIEZA
# ---------------------------------------------------------
def calcular_distancia(lat1, lon1, lat2, lon2):
    try:
        lat1, lon1, lat2, lon2 = map(float, [lat1, lon1, lat2, lon2])
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        a = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
        return 2 * 6371 * math.asin(math.sqrt(a))
    except:
        return float('inf')


def limpiar_texto(texto):
    if pd.isna(texto): return ""
    texto = str(texto)
    texto = re.sub(r'^\d+\s+', '', texto)
    texto = re.sub(r'\s*\(\d+\)$', '', texto)
    texto = texto.upper().strip()
    texto = ''.join(c for c in unicodedata.normalize('NFD', texto) if unicodedata.category(c) != 'Mn')
    return texto


# ---------------------------------------------------------
# 2. LÍNEA DE VISTA (API TOPOGRÁFICA)
# ---------------------------------------------------------
def obtener_elevacion(lat, lon):
    url = f"https://api.open-meteo.com/v1/elevation?latitude={lat}&longitude={lon}"
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            return response.json()['elevation'][0]
        return None
    except:
        return None


def verificar_linea_vista(lat_loc, lon_loc, lat_torre, lon_torre, altura_torre):
    if pd.isna(altura_torre) or altura_torre <= 0:
        altura_torre = 30.0

    elev_loc = obtener_elevacion(lat_loc, lon_loc)
    elev_torre = obtener_elevacion(lat_torre, lon_torre)

    if elev_loc is None or elev_torre is None: return "Desconocido (Error API)"

    h_loc_total = elev_loc + 5.0  # Antena en casa (5m)
    h_torre_total = elev_torre + altura_torre

    bloqueado = False
    for i in range(1, 6):
        fraccion = i / 6.0
        lat_p = lat_loc + (lat_torre - lat_loc) * fraccion
        lon_p = lon_loc + (lon_torre - lon_loc) * fraccion
        elev_p = obtener_elevacion(lat_p, lon_p)
        h_imaginaria = h_loc_total + (h_torre_total - h_loc_total) * fraccion

        if elev_p is not None and elev_p >= h_imaginaria:
            bloqueado = True
            break
        time.sleep(0.05)  # Pequeña espera para no saturar API

    return "BLOQUEADA (Cerro)" if bloqueado else "Libre"


# ---------------------------------------------------------
# 3. CARGA DE DATOS (Búsqueda en raíz y /Archivos)
# ---------------------------------------------------------
def cargar_excel(nombre_archivo):
    rutas = [nombre_archivo, os.path.join('Archivos', nombre_archivo),
             nombre_archivo.replace('.xlsx', ' (1).xlsx'),
             os.path.join('Archivos', nombre_archivo.replace('.xlsx', ' (1).xlsx'))]
    for r in rutas:
        if os.path.exists(r):
            print(f"Cargando {r}...")
            return pd.read_excel(r)
    raise FileNotFoundError(f"No se encontró el archivo {nombre_archivo} en ninguna ubicación conocida.")


print("Iniciando procesamiento de datos...")
df_internet = cargar_excel('INTERNET_LOCALIDADES.xlsx')
df_vuln = cargar_excel('localidades_vulnerables_sonora FINAL.xlsx')
df_torres = cargar_excel('infraestructura_torres_limpia.xlsx')

# Normalización para cruce de datos
df_internet['MUN_LIMPIO'] = df_internet['NOM_MUN'].apply(limpiar_texto)
df_internet['LOC_LIMPIA'] = df_internet['NOM_LOC'].apply(limpiar_texto)
df_vuln['MUN_LIMPIO'] = df_vuln['Municipio'].apply(limpiar_texto)
df_vuln['LOC_LIMPIA'] = df_vuln['Localidad'].apply(limpiar_texto)

# Fusión de tablas
columnas_traer = ['MUN_LIMPIO', 'LOC_LIMPIA', 'COB_BC', 'G_4G', 'CFE']
df_maestro = pd.merge(df_vuln, df_internet[columnas_traer], on=['MUN_LIMPIO', 'LOC_LIMPIA'], how='inner')
df_maestro = df_maestro.drop_duplicates(subset=['MUN_LIMPIO', 'LOC_LIMPIA'])

# Limpiar Altura de torres
df_torres['Altura_m'] = pd.to_numeric(df_torres['Altura_m'].astype(str).str.replace('-', ''), errors='coerce').fillna(0)

# ---------------------------------------------------------
# 4. FILTROS (Todas las localidades con necesidad)
# ---------------------------------------------------------
df_maestro['Viviendas_Sin_Internet'] = pd.to_numeric(
    df_maestro['Viviendas_Sin_Internet'].astype(str).str.replace(',', ''), errors='coerce').fillna(0)
df_maestro['Viviendas_Habitadas'] = pd.to_numeric(
    df_maestro['Viviendas_Habitadas'].astype(str).str.replace(',', ''), errors='coerce').fillna(0)

# El usuario quiere al menos las ~1823 que tienen viviendas sin internet
df_filtrado = df_maestro[df_maestro['Viviendas_Sin_Internet'] > 0].copy()

# ---------------------------------------------------------
# 5. ANÁLISIS ESPACIAL Y TOPOGRÁFICO
# ---------------------------------------------------------
print(f"Analizando {len(df_filtrado)} localidades. Este proceso puede tardar...")
distancias, torres, status_los, alturas_t, backhaul_t = [], [], [], [], []

for i, (_, poblado) in enumerate(df_filtrado.iterrows(), 1):
    if i % 10 == 0: print(f"Procesando: {i}/{len(df_filtrado)}...")

    dist_min = float('inf')
    t_ganadora = None

    for _, torre in df_torres.iterrows():
        dist = calcular_distancia(poblado['Latitud'], poblado['Longitud'], torre['Latitud'], torre['Longitud'])
        if dist < dist_min:
            dist_min = dist
            t_ganadora = torre

    distancias.append(round(dist_min, 2))

    if t_ganadora is not None:
        torres.append(f"{t_ganadora.get('Nombre', 'S/N')} (ID: {t_ganadora.get('ID_Sitio', 'N/A')})")
        alturas_t.append(t_ganadora['Altura_m'])
        backhaul_t.append(str(t_ganadora.get('Medio_Conexion', '')))

        # Verificamos LOS si está a una distancia razonable (<40km)
        if dist_min <= 40:
            linea = verificar_linea_vista(poblado['Latitud'], poblado['Longitud'],
                                          t_ganadora['Latitud'], t_ganadora['Longitud'],
                                          t_ganadora['Altura_m'])
            status_los.append(linea)
        else:
            status_los.append("No aplica (Muy lejos)")
    else:
        torres.append("Ninguna");
        alturas_t.append(0);
        backhaul_t.append("");
        status_los.append("N/A")

df_filtrado['Distancia_Torre_Km'] = distancias
df_filtrado['Torre_Cercana'] = torres
df_filtrado['Linea_Vista'] = status_los
df_filtrado['Altura_Torre'] = alturas_t
df_filtrado['Backhaul_Torre'] = backhaul_t

# ---------------------------------------------------------
# 6. SCORING DE INVERSIÓN (ROI WISP y Factibilidad)
# ---------------------------------------------------------
print("Calculando Prioridades de Inversión WISP...")
puntajes, factibilidad = [], []

for _, row in df_filtrado.iterrows():
    puntos = 0
    viv = row['Viviendas_Sin_Internet']
    total_viv = row['Viviendas_Habitadas']
    if total_viv < viv:
        total_viv = viv  # Sanity check

    # A. POTENCIAL DE MERCADO Y DENSIDAD (Max 50)
    # 1. Volumen (25 pts): Garantiza que haya casas suficientes (asintótica).
    puntos_volumen = 25 * (viv / (viv + 150))

    # 2. Concentración (25 pts): Premia lugares donde casi nadie tiene internet.
    # Penaliza fuertemente a Hermosillo/grandes ciudades donde "viv" es grande pero es minúsculo respecto a "total_viv".
    concentracion = (viv / total_viv) if total_viv > 0 else 0
    puntos_concentracion = 25 * concentracion

    puntos += puntos_volumen + puntos_concentracion

    # B. COMPETENCIA / NECESIDAD (Max 30)
    cob = str(row['G_4G']).strip().lower()
    if 'sin conectividad' in cob:
        puntos += 30
    elif 'no garantizada' in cob:
        puntos += 15  # Oportunidad alta pero con competencia básica
    else:
        puntos += 0  # Zonas ya cubiertas (Garantizada)

    # C. INFRAESTRUCTURA Y DISTANCIA (Max 20)
    dist = row['Distancia_Torre_Km']
    puntos_tecnicos = max(0, 10 * (1 - dist / 40))  # 10 pts si está pegado, 0 pts a los 40km

    # Electricidad CFE (Fundamental para ROI)
    cfe = str(row['CFE']).strip().lower()
    if any(x in cfe for x in ['s', 'si', 'sí']):
        puntos_tecnicos += 10  # 10 pts si tiene luz

    puntos += puntos_tecnicos

    # D. PENALIZACIONES CRÍTICAS (Topografía y Sobredimensionamiento)
    los = row['Linea_Vista']
    resumen = "Viable Técnicamente"

    # 1. Penalización Urbana (Los WISPs no entran a competir en ciudades gigantes con FTTH/Cable)
    if total_viv > 20000:
        puntos *= 0.1  # Metrópolis (Capitales)
        resumen = "Mercado Sobredimensionado (Ciudad)"
    elif total_viv > 5000:
        puntos *= 0.5  # Ciudades Medianas (Requiere Fibra, no WISP)
        resumen = "Alta Competencia Urbana"

    # 2. Topografía
    if los == 'BLOQUEADA (Cerro)':
        puntos *= 0.3  # Penalización severa (70%)
        if "Viable" in resumen:
            resumen = "Requiere Repetidor (Costoso)"
        else:
            resumen += " + Requiere Repetidor"
    elif los == 'Desconocido (Error API)':
        puntos *= 0.8  # Penalización por incertidumbre
        if "Viable" in resumen:
            resumen = "Validar Topografía"
        else:
            resumen += " + Validar Topografía"
    elif dist > 40:
        resumen = "Fuera de Rango PtP"

    puntajes.append(round(puntos, 2))
    factibilidad.append(resumen)

df_filtrado['Puntaje_Final'] = puntajes
df_filtrado['Analisis_Factibilidad'] = factibilidad

# ---------------------------------------------------------
# 7. EXPORTACIÓN (Nombres entendibles para todos)
# ---------------------------------------------------------
mapeo_columnas = {
    'Municipio': 'Municipio',
    'Localidad': 'Localidad',
    'Viviendas_Habitadas': 'Casas Totales en la Localidad',
    'Viviendas_Sin_Internet': 'Casas sin Internet (Mercado)',
    'CFE': 'Tiene Electricidad (CFE)',
    'G_4G': 'Estatus de Cobertura Celular',
    'Torre_Cercana': 'Torre más Cercana',
    'Distancia_Torre_Km': 'Distancia a Torre (km)',
    'Linea_Vista': 'Línea de Vista',
    'Puntaje_Final': 'Prioridad de Inversión WISP (0-100)',
    'Analisis_Factibilidad': 'Diagnóstico Técnico y Comercial'
}

df_final = df_filtrado.sort_values(by='Puntaje_Final', ascending=False)[list(mapeo_columnas.keys())]
df_final.rename(columns=mapeo_columnas, inplace=True)

output_name = 'Dictamen_Maestro_Fase4_Final.xlsx'
df_final.to_excel(output_name, index=False)

print(f"\n¡Proceso completado con éxito!")
print(f"Se han analizado {len(df_final)} localidades.")
print(f"El archivo '{output_name}' está listo.")
