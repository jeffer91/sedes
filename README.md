# ITSQMET · Selección de sede para Complexivo

Aplicación institucional para registrar si el estudiante realizará el proceso presencial del examen complexivo en **Quito** o **Manta**.

## Enlaces

- Estudiante: https://jeffer91.github.io/sedes/estudiante/
- Administrador: https://jeffer91.github.io/sedes/administrador/

## Firebase

Proyecto: `utet-4387a`

Colecciones utilizadas:
- `Estudiante`: consulta puntual de datos del estudiante por cédula.
- `matriculas`: base administrativa para cálculo de estudiantes elegibles y pendientes.
- `eleccionSedeComplexivo`: registros de esta aplicación.

ID del registro:
`2026-04__2026-09__CEDULA`

Campos principales:
`cedula`, `nombres`, `nombreCarrera`, `sedeAcademica`, `sedeComplexivo`, `periodoId`, `fechaRegistro`, `createdAt`, `updatedAt`.

## Administración

El panel usa Firebase Authentication y restringe el acceso a la identidad administrativa configurada.

Para seguridad real también deben aplicarse las reglas de Firestore del archivo `firestore.rules.example` (o reglas equivalentes) desde Firebase Console.

## Publicación

Cada push a `main` despliega automáticamente GitHub Pages mediante `.github/workflows/pages.yml`.


### Acceso administrativo por usuario y PIN

La interfaz administrativa utiliza el usuario institucional configurado en la aplicación y valida el PIN mediante Firebase Authentication.

Cuenta Firebase requerida:
- Email de autenticación: `0401135306@itsqmet.edu.ec`
- La contraseña de Firebase debe seguir el formato interno `UTET-<PIN>`.

El PIN no se almacena literalmente en el código fuente. La cuenta debe existir en Firebase Authentication para que el acceso funcione.


#### Requisito de Firebase Authentication

El acceso administrador por usuario + PIN se valida realmente con Firebase Authentication. Para que funcione, Firebase debe tener habilitado **Email/Password** y debe existir la cuenta administrativa interna indicada por la aplicación. Las reglas de ejemplo de Firestore quedaron restringidas a esa identidad administrativa, no a todo el dominio institucional.


## Auditoría técnica 2026-10-08

La auditoría automática confirmó:

- GitHub Pages despliega correctamente.
- La consulta puntual a `Estudiante` responde desde Firestore.
- La colección `matriculas` actualmente permite lectura pública en el backend desplegado.
- Firebase Authentication devuelve `CONFIGURATION_NOT_FOUND`, por lo que el panel administrador no puede autenticarse todavía.

El repositorio incluye ahora `firestore.rules`, `firebase.json` y un workflow manual para desplegar las reglas. Para ejecutarlo de forma segura se requiere un **nuevo** service account de Firebase almacenado en el secret de GitHub `FIREBASE_SERVICE_ACCOUNT_UTET`. No reutilices credenciales que hayan sido expuestas previamente.
