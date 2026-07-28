# ImageFix

ImageFix es una aplicación web estática para analizar una carpeta de imágenes, previsualizar renombrados y descargar el resultado como ZIP. Todo el procesamiento se realiza en el navegador: no hay backend ni cargas de archivos.

## Ejecutar

Abre `index.html` directamente en un navegador moderno (Chrome, Edge o Firefox) o abre la carpeta en Visual Studio Code. La dependencia JSZip se carga desde CDN para crear el archivo ZIP; los archivos del usuario nunca se envían a Internet.

## Funcionamiento

1. Selecciona o arrastra una carpeta.
2. ImageFix filtra los formatos soportados y aplica las reglas en modo simulación.
3. Revisa la tabla, busca y ordena los resultados.
4. Confirma la ventana de descarga para generar `NombreDeCarpeta.zip`.

Las colisiones se resuelven agregando ` (1)`, ` (2)`, etc. y nunca se sobrescribe un archivo.

## Estructura

- `index.html`: estructura, accesibilidad y carga de recursos.
- `css/styles.css`: tema oscuro, responsive, tarjetas y estados.
- `js/analyzer.js`: formatos, reglas y análisis.
- `js/renamer.js`: estadísticas y fase de aplicación.
- `js/zip.js`: generación y descarga local del ZIP.
- `js/ui.js`: renderizado y mensajes de interfaz.
- `js/utils.js`: funciones compartidas.
- `js/app.js`: eventos y coordinación de la aplicación.

## Agregar reglas

Implementa una función en `js/analyzer.js` que reciba el nombre base sin extensión y devuelva `{ name, rule }` cuando coincida, o `null` cuando no coincida. Después añádela al arreglo `renameRules`. Las reglas se prueban en orden.

## Agregar formatos

Añade la extensión en minúsculas al conjunto `IMAGE_EXTENSIONS` de `js/utils.js`.

## Modificar el diseño

Edita las variables CSS de `:root` y las reglas de `css/styles.css`. No hay framework ni proceso de compilación.
