import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import pandas as pd
import webbrowser
import math
import numpy as np

df_original = None
df_actual = None
orden_estado = {}

sierra = [
    "Agua Prieta (26002)",
    "Fronteras (26027)",
    "Nacozari de García (26041)",
    "Bavispe (26015)",
    "Villa Hidalgo (26067)",
    "Bacerac (26010)",
    "Cumpas (26023)",
    "Huásabas (26032)",
    "Huachinera (26031)",
    "Granados (26028)",
    "Moctezuma (26038)",
    "Divisaderos (26024)",
    "Bacadéhuachi (26008)",
    "Nácori Chico (26040)",
    "Tepache (26063)",
    "Mazatán (26037)",
    "Villa Pesqueira (26068)",
    "San Pedro de la Cueva (26057)",
    "Bacanora (26009)",
    "Sahuaripa (26052)",
    "Suaqui Grande (26062)",
    "San Javier (26054)",
    "Soyopa (26061)",
    "Onavas (26044)",
    "Arivechi (26005)",
    "Yécora (26069)"
]

def cargar_archivo():
    global df_original, df_actual

    ruta = filedialog.askopenfilename(
        filetypes=[("Archivos Excel", "*.xlsx *.xls *.CSV")]
    )

    if not ruta:
        return

    df_original = pd.read_excel(ruta)
    df_actual = df_original.copy()

    actualizar_tabla(df_actual)


def actualizar_tabla(df):
    for item in tabla.get_children():
        tabla.delete(item)

    tabla["columns"] = list(df.columns)
    tabla["show"] = "headings"

    for col in df.columns:
        tabla.heading(col, text=col, command=lambda c=col: ordenar_columna(c))
        tabla.column(col, width=120)

    for _, row in df.iterrows():
        tabla.insert("", "end", values=list(row))


def ordenar_columna(col):
    global df_actual

    asc = orden_estado.get(col, True)
    df_actual = df_actual.sort_values(by=col, ascending=asc)
    orden_estado[col] = not asc

    actualizar_tabla(df_actual)


def filtrar():
    global df_actual

    texto = entrada_busqueda.get().lower()

    if not texto:
        df_actual = df_original.copy()
    else:
        df_actual = df_original[
            df_original.astype(str).apply(
                lambda row: row.str.lower().str.contains(texto).any(), axis=1
            )
        ]

    actualizar_tabla(df_actual)


def exportar():
    if df_actual is None:
        return

    ruta = filedialog.asksaveasfilename(defaultextension=".xlsx")

    if ruta:
        df_actual.to_excel(ruta, index=False)
        messagebox.showinfo("Éxito", "Archivo exportado correctamente")

def sin_internet():
    global df_actual
    df_actual = df_original[(df_original["INTERNET"] == "No") & (df_original["NOM_MUN"].isin(sierra))][["MUN", "NOM_MUN", "LOC", "NOM_LOC", "POBLACION", "TOTHOG", "LONGITUD", "LATITUD", "ALTITUD"]]
    actualizar_tabla(df_actual)

def esta_en_sierra():
    global df_actual

    sierra_sin_codigo = [m.split(" (")[0].strip().lower() for m in sierra]

    df_actual = df_original[
        df_original["municipio"].str.strip().str.lower().isin(sierra_sin_codigo)
    ].copy()

    actualizar_tabla(df_actual)

def abrir_maps():
    seleccionado = tabla.focus()

    if not seleccionado:
        return

    valores = tabla.item(seleccionado, "values")

    # Obtener índice de columnas
    columnas = tabla["columns"]

    lat_index = columnas.index("LATITUD")
    lon_index = columnas.index("LONGITUD")

    lat = valores[lat_index]
    lon = valores[lon_index]

    url = f"https://www.google.com/maps?q={lat},{lon}"
    webbrowser.open(url)

def analizar_prioridad_torres():
    global df_actual

    # pedir el excel
    ruta_torres = filedialog.askopenfilename(
        title="Selecciona el Excel de las Torres",
        filetypes=[("Archivos Excel/CSV", "*.xlsx *.xls *.csv")]
    )
    if not ruta_torres: return

    try:
        # leer el archivo
        if ruta_torres.lower().endswith('.csv'):
            df_torres = pd.read_csv(ruta_torres)
        else:
            df_torres = pd.read_excel(ruta_torres)
    except Exception as e:
        messagebox.showerror("Error", f"No se pudo leer el archivo: {e}")
        return

    df_locs = df_actual.copy()

    if df_locs.empty:
        messagebox.showwarning("Aviso", "No hay datos en la tabla. Carga las localidades primero.")
        return

    # acotar nombres de los municipios
    df_locs['MUN_LIMPIO'] = df_locs['NOM_MUN'].astype(str).apply(lambda x: x.split(' (')[0].strip().upper())
    df_torres['municipio'] = df_torres['municipio'].astype(str).str.strip().str.upper()

    # contar cuantas torres hay por municipio
    conteo_torres = df_torres['municipio'].value_counts().reset_index()
    conteo_torres.columns = ['MUN_LIMPIO', 'TORRES_EXISTENTES']

    df_locs['POBLACION'] = pd.to_numeric(df_locs['POBLACION'], errors='coerce').fillna(0)
    df_locs['LATITUD'] = pd.to_numeric(df_locs['LATITUD'], errors='coerce')
    df_locs['LONGITUD'] = pd.to_numeric(df_locs['LONGITUD'], errors='coerce')

    resumen = []

    for mun, grupo in df_locs.groupby('MUN_LIMPIO'):
        pob_total = grupo['POBLACION'].sum()
        num_locs = len(grupo)

        # calcular centro de gravedad poblacional
        if pob_total > 0:
            lat_opt = (grupo['LATITUD'] * grupo['POBLACION']).sum() / pob_total
            lon_opt = (grupo['LONGITUD'] * grupo['POBLACION']).sum() / pob_total
        else:
            lat_opt = grupo['LATITUD'].mean()
            lon_opt = grupo['LONGITUD'].mean()

        nombre_original = grupo['NOM_MUN'].iloc[0]

        resumen.append({
            'NOM_MUN': nombre_original,
            'MUN_LIMPIO': mun,
            'LOCS_SIN_RED': num_locs,
            'POB_AFECTADA': int(pob_total),
            'LATITUD': round(lat_opt, 6),
            'LONGITUD': round(lon_opt, 6)
        })

    df_resumen = pd.DataFrame(resumen)

    # cruzar ambas tablas
    df_final = pd.merge(df_resumen, conteo_torres, on='MUN_LIMPIO', how='left')
    df_final['TORRES_EXISTENTES'] = df_final['TORRES_EXISTENTES'].fillna(0).astype(int)

    # indice de prioridad
    df_final['PRIORIDAD'] = round(df_final['POB_AFECTADA'] / (df_final['TORRES_EXISTENTES'] + 1), 2)
    df_final = df_final.sort_values(by='PRIORIDAD', ascending=False).drop(columns=['MUN_LIMPIO'])

    df_actual = df_final
    actualizar_tabla(df_actual)
    messagebox.showinfo("Análisis Completo", "Se ha generado el índice de prioridad por municipio.")

root = tk.Tk()
root.title("interfaz")
root.geometry("1100x650")

frame_superior = tk.Frame(root)
frame_superior.pack(pady=10)

tk.Button(frame_superior, text="Cargar Excel", command=cargar_archivo).pack(side="left", padx=5)
tk.Button(frame_superior, text="Sin Internet", command=sin_internet).pack(side="left", padx=5)
tk.Button(frame_superior, text="Maps", command=abrir_maps).pack(side="left", padx=5)
tk.Button(frame_superior, text="Sierra", command=esta_en_sierra).pack(side="left", padx=5)
tk.Button(frame_superior, text="Analizar Prioridad", command=analizar_prioridad_torres).pack(side="left", padx=5)

entrada_busqueda = tk.Entry(frame_superior, width=30)
entrada_busqueda.pack(side="left", padx=5)

tk.Button(frame_superior, text="Buscar", command=filtrar).pack(side="left", padx=5)

tk.Button(frame_superior, text="Exportar", command=exportar).pack(side="left", padx=5)

frame_tabla = tk.Frame(root)
frame_tabla.pack(fill="both", expand=True)

scroll_y = tk.Scrollbar(frame_tabla)
scroll_y.pack(side="right", fill="y")

scroll_x = tk.Scrollbar(frame_tabla, orient="horizontal")
scroll_x.pack(side="bottom", fill="x")

tabla = ttk.Treeview(frame_tabla, yscrollcommand=scroll_y.set, xscrollcommand=scroll_x.set)
tabla.pack(fill="both", expand=True)

scroll_y.config(command=tabla.yview)
scroll_x.config(command=tabla.xview)

root.mainloop()