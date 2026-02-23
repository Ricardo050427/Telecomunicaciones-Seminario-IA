import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import pandas as pd

df_original = None
df_actual = None
orden_estado = {}

def cargar_archivo():
    global df_original, df_actual

    ruta = filedialog.askopenfilename(
        filetypes=[("Archivos Excel", "*.xlsx *.xls")]
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


root = tk.Tk()
root.title("interfaz")
root.geometry("1100x650")

frame_superior = tk.Frame(root)
frame_superior.pack(pady=10)

tk.Button(frame_superior, text="Cargar Excel", command=cargar_archivo).pack(side="left", padx=5)

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