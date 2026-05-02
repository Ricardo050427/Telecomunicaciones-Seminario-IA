import pandas as pd
import numpy as np
import math
import unicodedata
import re
import requests
import time


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
        return response.json()['elevation'][0]
    except:
        return None


def verificar_linea_vista(lat_loc, lon_loc, lat_torre, lon_torre, altura_torre):
    # Si la altura viene vacía o nula, asumimos 30m por defecto
    if pd.isna(altura_torre) or altura_torre <= 0:
        altura_torre = 30.0

    elev_loc = obtener_elevacion(lat_loc, lon_loc)
    elev_torre = obtener_elevacion(lat_torre, lon_torre)

    if elev_loc is None or elev_torre is None: return "Desconocido (Error API)"

    h_loc_total = elev_loc + 5.0  # Antena de casa (5m)
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
        time.sleep(0.1)

    return "BLOQUEADA (Cerro)" if bloqueado else "Libre"


# ---------------------------------------------------------
# 3. CARGA Y FUSIÓN DE DATOS
# ---------------------------------------------------------
print("Cargando bases de datos...")
df_internet = pd.read_excel('INTERNET_LOCALIDADES (1).xlsx')
df_vuln = pd.read_excel('localidades_vulnerables_sonora FINAL.xlsx')
df_torres = pd.read_excel('infraestructura_torres_limpia.xlsx')

df_internet['MUN_LIMPIO'] = df_internet['NOM_MUN'].apply(limpiar_texto)
df_internet['LOC_LIMPIA'] = df_internet['NOM_LOC'].apply(limpiar_texto)
df_vuln['MUN_LIMPIO'] = df_vuln['Municipio'].apply(limpiar_texto)
df_vuln['LOC_LIMPIA'] = df_vuln['Localidad'].apply(limpiar_texto)

# Traemos CFE además de la cobertura
columnas_traer = ['MUN_LIMPIO', 'LOC_LIMPIA', 'COB_BC', 'G_4G', 'CFE']
df_maestro = pd.merge(df_vuln, df_internet[columnas_traer], on=['MUN_LIMPIO', 'LOC_LIMPIA'], how='inner')
df_maestro = df_maestro.drop_duplicates(subset=['MUN_LIMPIO', 'LOC_LIMPIA'])

# Limpiar Altura_m en torres (quitar '-' y convertir a número)
df_torres['Altura_m'] = pd.to_numeric(df_torres['Altura_m'].astype(str).str.replace('-', ''), errors='coerce').fillna(0)

# ---------------------------------------------------------
# 4. FILTROS BÁSICOS
# ---------------------------------------------------------
df_maestro['Viviendas_Sin_Internet'] = pd.to_numeric(
    df_maestro['Viviendas_Sin_Internet'].astype(str).str.replace(',', ''), errors='coerce').fillna(0)
df_filtrado = df_maestro[df_maestro['Viviendas_Sin_Internet'] > 0].copy()
df_filtrado = df_filtrado[~df_filtrado['G_4G'].astype(str).str.strip().str.lower().str.contains('garantizada')].copy()

# ---------------------------------------------------------
# 5. ANÁLISIS ESPACIAL Y LÍNEA DE VISTA
# ---------------------------------------------------------
print(f"Analizando topografía para {len(df_filtrado)} localidades...")
distancias, torres, status_los, alturas_t, backhaul_t = [], [], [], [], []

contador = 1
for _, poblado in df_filtrado.iterrows():
    print(f"Analizando {contador}/{len(df_filtrado)}: {poblado['Localidad']}...")
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

        if dist_min <= 30:
            linea = verificar_linea_vista(poblado['Latitud'], poblado['Longitud'], t_ganadora['Latitud'],
                                          t_ganadora['Longitud'], t_ganadora['Altura_m'])
            status_los.append(linea)
        else:
            status_los.append("No aplica (Muy lejos)")
    else:
        torres.append("Ninguna");
        alturas_t.append(0);
        backhaul_t.append("");
        status_los.append("N/A")

    contador += 1

df_filtrado['Distancia_Torre_Km'] = distancias
df_filtrado['Torre_Cercana'] = torres
df_filtrado['Linea_Vista'] = status_los
df_filtrado['Altura_Torre'] = alturas_t
df_filtrado['Backhaul_Torre'] = backhaul_t

# ---------------------------------------------------------
# 6. SCORING FINAL (100 Puntos)
# ---------------------------------------------------------
print("Calculando Dictamen Final Integral...")
puntajes, dictamenes = [], []

for _, row in df_filtrado.iterrows():
    puntos = 0

    # 1. POBLACIÓN (Max 35)
    viv = row['Viviendas_Sin_Internet']
    if viv >= 500:
        puntos += 35
    elif 150 <= viv < 500:
        puntos += 25
    elif 50 <= viv < 150:
        puntos += 15
    else:
        puntos += 5

    # 2. AISLAMIENTO CELULAR (Max 20)
    cob = str(row['COB_BC']).strip().lower()
    if 'sin conectividad' in cob:
        puntos += 20
    elif '2g' in cob or 'no garantizada' in cob:
        puntos += 15
    elif '3g' in cob:
        puntos += 5

    # 3. INFRAESTRUCTURA CFE (Max 10)
    if 'sí' in str(row['CFE']).strip().lower() or 'si' in str(row['CFE']).strip().lower():
        puntos += 10

    # 4. CALIDAD DE LA TORRE (Max 10)
    if row['Altura_Torre'] >= 30: puntos += 5
    bx = str(row['Backhaul_Torre']).lower()
    if bx != 'nan' and 'no especific' not in bx and bx != '-': puntos += 5

    # 5. DISTANCIA Y LÍNEA DE VISTA (Max 25)
    dist = row['Distancia_Torre_Km']
    los = row['Linea_Vista']

    if dist <= 20 and los == 'Libre':
        puntos += 25
        dictamenes.append("1. Óptimo: PtP Confirmado")
    elif dist <= 20 and los == 'BLOQUEADA (Cerro)':
        puntos += 10
        dictamenes.append("2. Cerca pero Bloqueado (Requiere Repetidor)")
    elif 20 < dist <= 40:
        puntos += 10
        dictamenes.append("3. Requiere Torre Nueva (Viable Comercial)")
    else:
        dictamenes.append("4. Inviable (Subsidio Especial)")

    puntajes.append(puntos)

df_filtrado['Puntaje_Final'] = puntajes
df_filtrado['Dictamen'] = dictamenes

# Exportar
col_export = ['Municipio', 'Localidad', 'Viviendas_Sin_Internet', 'CFE', 'COB_BC',
              'Torre_Cercana', 'Distancia_Torre_Km', 'Linea_Vista', 'Puntaje_Final', 'Dictamen']
df_final = df_filtrado.sort_values(by='Puntaje_Final', ascending=False)[col_export]
df_final.to_excel('Dictamen_Maestro_Fase4.xlsx', index=False)
print("¡Listo! El Dictamen Maestro con todas las variables ha sido generado.")