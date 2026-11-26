# Guía para editar el sitio

Todo el contenido del sitio está en la carpeta `data/`, en tablas CSV y archivos de texto. Las
páginas leen esos archivos cada vez que alguien las abre. **Para agregar un objeto, una curva de
luz o una publicación solo hay que editar `data/`**; no se toca código.

Todo se hace desde la página del repositorio en GitHub, sin instalar nada. Cada cambio se guarda
con el botón verde **Commit changes**. El sitio se actualiza solo en uno o dos minutos; en la
pestaña **Actions** del repositorio se ve el avance («pages build and deployment»). Luego hay que
recargar la página del sitio sin caché: Ctrl + F5, o Cmd + Shift + R en Mac.

## Contenido

1. [Reglas de los archivos CSV](#reglas-de-los-archivos-csv)
2. [Agregar un espectro](#agregar-un-espectro)
3. [Reemplazar un espectro sintético por el real](#reemplazar-un-espectro-sintético-por-el-real)
4. [Agregar una curva de luz](#agregar-una-curva-de-luz)
5. [Agregar una publicación](#agregar-una-publicación)
6. [Figuras orbitales: resonancias y población de fondo](#figuras-orbitales-resonancias-y-población-de-fondo)
7. [Referencia de columnas](#referencia-de-columnas)
8. [Si algo no se ve](#si-algo-no-se-ve)

## Reglas de los archivos CSV

- Para editarlos en GitHub: abre el archivo y haz clic en el lápiz (**Edit this file**).
- La primera fila son los nombres de las columnas: **no los cambies ni los borres**.
- Separador: coma. Decimales con punto (`0.25`, no `0,25`).
- Si un texto lleva comas, ponlo entre comillas: `"S, Sr"`.
- Fechas como `AAAA-MM-DD`, por ejemplo `2019-04-18`.
- Un dato que no existe se deja vacío: dos comas seguidas `,,`.
- **Escribe los valores tal como aparecen en la publicación** (`7.80`, no `7.8`): el sitio los
  muestra exactamente como están en la tabla.
- Si editas en Excel, guarda como «CSV UTF-8 (delimitado por comas)». Si no, los acentos se
  dañan. Es más seguro editar directo en GitHub.

## Agregar un espectro

**1. Prepara el archivo del espectro**: un `.txt` con dos columnas, longitud de onda y
reflectancia, separadas por espacios. La longitud de onda puede ir en µm o en Å; el sitio la
reconoce sola. Las líneas que empiezan con `#` son comentarios. Ejemplo:

```
# (1270) Datura — OAGH, 2019-04-18
0.4400  0.8412
0.4453  0.8460
...
```

Nómbralo con el identificador del objeto: el número si está numerado (`1270.txt`), o la
designación con guion si no (`2026-EE2.txt`).

**2. Súbelo**: en GitHub entra a `data/spectra/files/`, haz clic en **Add file → Upload files**,
arrastra el archivo y confirma con **Commit changes**.

**3. Agrega una fila a `data/spectra/catalog.csv`**: lo más fácil es copiar una fila parecida y
cambiar los valores. Las columnas están descritas en la
[referencia](#espectros-dataspectracatalogcsv). Lo mínimo indispensable: `id`, `name`,
`publication`, `class`, `spectrum_file` y `spectrum_status` (`observed`).

Para que el objeto aparezca en la figura orbital, llena también `a_au`, `e` e `i_deg`. Los valores
se consultan en el [JPL Small-Body Database](https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html).

Si el artículo **no usó el clasificador híbrido** (por ejemplo, si clasificó por distancia espectral
a las medias de DeMeo et al. 2009), deja vacías las columnas `cwf_*`, `knn_*`, `pca_*` y `nca_*`. La
ficha mostrará solo la clase propuesta, y en `notes` puedes explicar cómo se obtuvo. Marca
`d_estimated` con `yes` solo si el diámetro se calculó con el albedo medio del tipo taxonómico. Si
el artículo da un intervalo, escríbelo tal cual en `d_km` (por ejemplo `0.0119–0.0381`).

**4. Si el artículo es nuevo**, agrégalo también a `data/publications.csv`
([ver abajo](#agregar-una-publicación)) y usa su `id` en la columna `publication`.

## Reemplazar un espectro sintético por el real

Los espectros y curvas de luz que hay ahora son **sintéticos**: se generaron a partir de la clase,
el periodo y la amplitud publicados, solo para que el sitio funcione mientras llegan los datos
reales. Cada archivo lo dice en su encabezado, y el sitio muestra un aviso mientras quede alguno.

Para cambiar uno por el real:

1. En `data/spectra/files/`, sube el espectro real **con el mismo nombre** (por ejemplo `1270.txt`).
   GitHub reemplaza el anterior.
2. En `data/spectra/catalog.csv`, cambia `spectrum_status` de `synthetic` a `observed` en esa fila.

Cuando ya no quede ninguno `synthetic`, el aviso desaparece solo. Lo mismo aplica a las curvas de
luz, con `data_status` en `data/lightcurves/objects.csv`.

## Agregar una curva de luz

Las curvas de luz usan dos tablas, porque un objeto puede tener varias determinaciones del
periodo (una por temporada de observación):

1. **El archivo de fotometría** en `data/lightcurves/files/`, por ejemplo `2345.csv`, con tres
   columnas y esta primera línea exacta:
   ```
   jd,mag,mag_err
   2460353.6120,0.0153,0.0120
   ...
   ```
   `jd` es la fecha juliana; `mag`, la magnitud relativa o reducida; `mag_err`, su error. Puede
   llevar líneas de comentario con `#` antes de `jd,mag,mag_err`.
2. **Una fila en `data/lightcurves/objects.csv`** con los datos del objeto.
3. **Una fila por determinación en `data/lightcurves/periods.csv`**: `lightcurve` = 1, 2, 3…
   La primera es la que aparece en la tabla principal y en la figura del periodo contra la amplitud.

Si no se pudo determinar el periodo, agrega el objeto en `objects.csv` y no pongas filas en
`periods.csv`. El sitio mostrará «not determined».

## Agregar una publicación

Agrega una fila a `data/publications.csv`. El `id` es una clave corta y única (por ejemplo
`buendia2027`) que se usa en la columna `publication` de las otras tablas para ligar cada objeto
con su artículo. Si tiene DOI, escríbelo sin `https://doi.org/` (por ejemplo `10.1093/mnras/staf2098`).

## Figuras orbitales: resonancias y población de fondo

Las figuras de semieje mayor contra excentricidad e inclinación (las dos de la portada y la de la página de espectros) dibujan:

- **En *a–e*:** las líneas q = 1.017, 1.3 y 1.67 au, Q = 0.983 au y a = 1 au, y los nombres de las
  regiones. Se calculan solas; no dependen de ningún archivo.
- **En *a–i*:** el eje horizontal va de 0.9 a 3.5 au y el vertical de 0 a 40°; si algún objeto pasa
  de 40°, el eje sube solo hasta el siguiente múltiplo de 5. Se dibujan las resonancias 5:1, 4:1 y 3:1,
  y las curvas de las resonancias seculares ν6 y ν16, que se leen de `data/orbits/nu6.csv` y `data/orbits/nu16.csv` (columnas `a_au,i_deg`).
  Las actuales se digitalizaron de la figura del grupo. Para usar las originales, sube tus archivos
  con esos mismos nombres y la misma primera línea `a_au,i_deg`.
- **Opcional: una población de fondo** en gris, como en las figuras de la tesis. Si existe
  `data/orbits/background.csv`, las dos figuras lo dibujan detrás de nuestros objetos. Debe tener la
  primera línea `a,e,i` y una fila por asteroide; si a una fila le falta `e` o `i`, simplemente no
  aparece en esa figura. Conviene que no pase de unas 60 000 filas, porque se descarga cada vez que
  alguien abre la página.

Para generarlo en Colab a partir de los DataFrames de la tesis (ajusta los nombres si cambian):

```python
import pandas as pd
cercanos = pd.concat([df_Atira, df_Aten, df_Apollo, df_Amor, df_MC])
cinturon = pd.concat([df_IMB, df_MB, df_OMB])
fondo = pd.concat([cercanos.sample(min(len(cercanos), 20000), random_state=1),
                   cinturon.sample(40000, random_state=1)])
fondo = fondo[(fondo.a > 0.5) & (fondo.a < 3.5)][['a', 'e', 'i']].round(4)
fondo.to_csv('background.csv', index=False)
```

Luego súbelo a `data/orbits/` con **Add file → Upload files**.

## Referencia de columnas

### Espectros: `data/spectra/catalog.csv`

| Columna | Qué va | Ejemplo |
| --- | --- | --- |
| `id` | Identificador único; también es el nombre del archivo y la dirección de la ficha (`spectra/#1270`) | `1270`, `2026-EE2` |
| `number` | Número del asteroide (vacío si no tiene) | `1270` |
| `name` | Nombre o designación | `Datura` |
| `population` | `flora_member`, `flora_background`, `nea_aten`, `nea_apollo`; se pueden agregar otras | `flora_member` |
| `publication` | `id` de la publicación en `publications.csv` | `buendia2026` |
| `date_ut` | Fecha de observación (UT) | `2019-04-18` |
| `exposure` | Exposiciones | `3×1200` |
| `v_mag`, `phase_deg` | Magnitud V y ángulo de fase (°) al observar | `16.0`, `6.9` |
| `pv`, `h_mag`, `d_km` | Albedo, magnitud absoluta y diámetro | `0.28`, `12.5`, `8.20` |
| `d_estimated` | `yes` si el diámetro se estimó con el albedo medio del tipo | `yes` |
| `solar_analogue` | Estrella análoga solar | `HD 142331` |
| `smass_control` | `SMASSI` o `SMASSII` si es objeto de control | |
| `flora_zappala1995`, `flora_nesvorny2024` | `yes` si es miembro de la familia según ese criterio | `yes` |
| `cwf_label`, `cwf_value` | Tipo y valor de la función de peso acumulada | `S`, `1.000` |
| `knn_label`, `knn_prob` | Tipo y probabilidad del k-NN | `S`, `1.000` |
| `pca_label`, `pca_prob` | Igual, para k-NN con PCA | |
| `nca_label`, `nca_prob` | Igual, para k-NN con NCA | |
| `class` | Clase propuesta (Bus & Binzel) | `Sq` |
| `previous_class` | Clase publicada antes por otros autores | `S` |
| `a_au`, `e`, `i_deg` | Elementos orbitales (JPL) | `2.23`, `0.208`, `5.99` |
| `spectrum_file` | Archivo en `data/spectra/files/` | `1270.txt` |
| `spectrum_status` | `observed` o `synthetic` | `observed` |
| `notes` | Texto libre que aparece en la ficha | |

### Curvas de luz: `data/lightcurves/objects.csv`

| Columna | Qué va |
| --- | --- |
| `id`, `number`, `name` | Como en espectros |
| `population` | Texto libre que empieza con `MBA` para el cinturón principal (por ejemplo `MBA (inner)`); cualquier otro valor cuenta como cercano a la Tierra o cruzador de Marte |
| `family`, `taxonomy` | Familia y clase taxonómica publicadas |
| `a_au`, `e`, `i_deg` | Semieje mayor (au), excentricidad e inclinación (°), del JPL Small-Body Database. Sin ellos, el objeto no aparece en las figuras orbitales de la portada |
| `h_mag`, `d_km`, `pv` | Parámetros físicos |
| `telescope` | `Tonantzintla Schmidt Camera` |
| `observing_dates` | Noches separadas por `;` (`2018-03-17; 2018-03-27`) o un intervalo (`2024-02-28 to 2024-03-02`) |
| `filters` | Filtro por noche, separados por `;` (`C; R`) |
| `publication` | `id` de la publicación |
| `data_file`, `data_status` | Archivo en `data/lightcurves/files/` y `observed` o `synthetic` |
| `notes` | Texto libre |

### Periodos: `data/lightcurves/periods.csv`

| Columna | Qué va |
| --- | --- |
| `id` | El mismo `id` del objeto |
| `lightcurve` | 1, 2, 3… |
| `period_h`, `period_err_h` | Periodo y su error, en horas |
| `amplitude_mag` | Amplitud pico a pico |
| `fourier_order` | Orden del ajuste (`6th`) |
| `lcdb_period_h` | Valor de la Asteroid Lightcurve Database citado en el artículo |
| `publication`, `notes` | |

### Publicaciones: `data/publications.csv`

`id`, `year`, `authors` (separados por comas), `title`, `journal`, `volume`, `pages`, `doi`,
`ads` (bibcode de ADS, si no hay DOI), `url` (si no hay ninguno de los anteriores), `modules`
(`spectra`, `classification` y/o `lightcurves`, separados por `;`) y `note`.

## Si algo no se ve

- **«The data could not be loaded»**: algún CSV quedó mal formado. Lo más común es una coma de
  más dentro de un texto sin comillas. En GitHub, el CSV se ve como tabla: si una fila sale
  desalineada, ahí está el problema.
- **La ficha dice «Spectrum file not found»**: el nombre en `spectrum_file` no coincide con el
  archivo, incluidas mayúsculas y minúsculas.
- **No veo mi cambio**: espera a que termine el proceso en **Actions** y recarga con Ctrl + F5.
- **Abrí `index.html` con doble clic y no carga**: es normal. Este sitio lee sus datos desde el
  servidor, así que se revisa en su dirección web, no como archivo local.

No es necesario tocar `assets/` (el código de las páginas) ni `estilo/` (el diseño, que se
comparte con el archivo interno de observaciones).
