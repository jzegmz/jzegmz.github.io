# Chat P2P Cifrado

Chat entre dos personas que funciona 100% en el navegador, **sin servidor**.
La conversación viaja cifrada de extremo a extremo mediante WebRTC (DataChannel sobre DTLS).

## Cómo conectarse

**Persona A (inicia):**
1. Pulsa **"Crear invitación (Persona A)"**.
2. Copia el código del Paso 1 y envíalo a la otra persona.
3. Pega la respuesta que te devuelvan en el Paso 2 y pulsa **"Conectar"**.

**Persona B (se une):**
1. Pulsa **"Unirse a una invitación (Persona B)"**.
2. Pega el código recibido en el Paso 1 y pulsa **"Generar respuesta"**.
3. Copia la respuesta del Paso 2 y envíasela a la Persona A.

Cuando la conexión se establece, el chat se abre automáticamente.
El botón rojo **"Borrar"** limpia toda la conversación.

## Seguridad

- Cifrado de extremo a extremo (DTLS) por defecto en WebRTC.
- Sin servidor propio: los mensajes van directos navegador a navegador.
- Solo se usan servidores STUN públicos para descubrir direcciones (no ven el contenido).
