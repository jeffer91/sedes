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

El panel usa Firebase Authentication. Solo permite continuar en la interfaz a usuarios autenticados con correo `@itsqmet.edu.ec`.

Para seguridad real también deben aplicarse las reglas de Firestore del archivo `firestore.rules.example` (o reglas equivalentes) desde Firebase Console.

## Publicación

Cada push a `main` despliega automáticamente GitHub Pages mediante `.github/workflows/pages.yml`.
