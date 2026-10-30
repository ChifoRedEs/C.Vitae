# Generador de CV

App web para crear currículums con plantillas, editarlos por secciones y exportarlos en PDF o Word. Funciona entera en el navegador: no necesita servidor, base de datos ni compilación.

## Funciones

- **Mis CV**: varios currículums por perfil, con miniatura, duplicar, renombrar y eliminar.
- **Editor** con menú de secciones siempre visible (sin desplazar) y botones Anterior / Siguiente: datos personales y foto, perfil profesional, experiencia, formación, aptitudes, idiomas y cursos o méritos. Vista previa A4 en directo.
- **Ajuste de foto**: zoom, encuadre, luz y contraste.
- **Diseño**: 21 plantillas en 4 categorías (Columna lateral, Datos arriba, Formal y ATS, Moderna y creativa), color de acento, tipografía, tamaño de texto, ajuste automático a una página, y títulos, orden y visibilidad de cada sección.
- **Exportar**: PDF (con el diálogo de impresión del navegador), Word `.docx` y copia `.json`.
- **Mi perfil**: varios perfiles en el mismo navegador, copia de seguridad completa, importación y espacio usado.

Los datos se guardan en el `localStorage` del navegador. Nada sale del dispositivo. Si se borran los datos del navegador, se pierden los CV, así que conviene guardar una copia desde «Mi perfil».

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub, por ejemplo `generador-cv`.
2. Sube el contenido de esta carpeta a la raíz del repositorio (`index.html` debe quedar en la raíz).
3. En el repositorio, ve a **Settings → Pages**.
4. En **Build and deployment**, elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`. Pulsa **Save**.
5. En uno o dos minutos la app estará en `https://TU-USUARIO.github.io/generador-cv/`.

Con Git desde la terminal:

```bash
cd generador-cv
git init
git add .
git commit -m "Primera versión del generador de CV"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/generador-cv.git
git push -u origin main
```

## Probar en local

Abre `index.html` con doble clic, o mejor, sirve la carpeta:

```bash
python3 -m http.server 8000
# y abre http://localhost:8000
```

## Estructura

```
generador-cv/
├── index.html        Estructura de la app
├── .nojekyll         Evita que GitHub Pages procese los archivos
├── css/
│   ├── app.css       Interfaz (barra lateral, pestañas, formularios, impresión)
│   └── cv.css        Estilos de las 21 plantillas del CV
└── js/
    ├── store.js      Modelo de datos, perfiles, ejemplo y guardado
    ├── templates.js  Plantillas, colores, HTML del CV y ajuste a página A4
    ├── docx.js       Exportación a Word sin librerías externas
    └── app.js        Navegación, editor, diseño, exportar y zona de usuario
```

## Añadir una plantilla

1. En `js/templates.js`, añade un objeto a `A.PLANTILLAS` con `id`, `cat` (categoría), `layout` (`lateral`, `cabecera`, `columna` o `etiquetas`), `nombre`, `desc`, `acento`, `fuente` y una función `colores`. Opcionales: `ancho` (columna lateral en px), `lado: "der"`, `fotoPos: "der"`, `banda`, `centrado`, `foto: false`, `mono`.
2. En `css/cv.css`, añade las reglas `.cv.tN …` con lo que la diferencie.

## Consejos para el PDF

En el diálogo de impresión: destino **Guardar como PDF**, márgenes **Ninguno** y **Gráficos de fondo** activado. Chrome y Edge dan el resultado más fiel.
