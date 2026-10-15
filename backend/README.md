# Backend administrativo de Sedes ITSQMET

El panel de administradores usa este servicio de Render, **no Firebase Authentication ni un PIN incrustado en GitHub Pages**.

Variables de entorno necesarias (guardar exclusivamente como secretos en Render):

- `ADMIN_CEDULA`: cédula administrativa.
- `ADMIN_PIN_HASH`: cadena `scrypt:<sal hex>:<hash hex>` derivada del PIN; nunca subir el PIN original.
- `SESSION_SECRET`: cadena aleatoria larga utilizada para firmar sesiones de 30 minutos.
- `FIREBASE_SERVICE_ACCOUNT_JSON`: contenido JSON íntegro de una **nueva** cuenta de servicio con acceso mínimo a Firestore del proyecto `utet-4387a`. No publicar en GitHub, mensajes ni registros.

Para cambiar el PIN, generar un nuevo salt y hash con scrypt, y actualizar `ADMIN_PIN_HASH` en Render. Reiniciar el servicio.

Inicio: `npm install --prefix backend` y `node backend/server.js`.
Origen del frontend permitido: `https://jeffer91.github.io`.

El endpoint `/health` indica si existen las variables necesarias sin revelar sus valores. Las rutas de datos solo aceptan sesiones firmadas y el backend valida el período de los documentos antes de modificarlos.

**La aplicación no podrá recuperar datos hasta proporcionar la cuenta de servicio de Firebase en Render.**
