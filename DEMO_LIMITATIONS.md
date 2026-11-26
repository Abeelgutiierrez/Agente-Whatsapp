# Limitaciones de Clínica Armonía

Esta es una prueba de concepto para demostraciones comerciales con datos ficticios. **No debe almacenar datos médicos, teléfonos, correos ni información personal real.**

- No está preparada para producción: no hay autenticación, autorización por roles, aislamiento entre empresas ni un sistema operativo de copias de seguridad y recuperación.
- El panel y su API son accesibles desde la red local donde se ejecuta. La gestión del cliente por localizador y teléfono es solo un mecanismo de demostración, no una prueba de identidad adecuada para producción.
- WhatsApp, contactos y recordatorios son simulados. No hay envíos ni programación automática de comunicaciones. Copiar un mensaje no lo envía.
- No ofrece facturación, cobros, pagos, historia clínica, diagnósticos ni documentación médica. Los ingresos previstos son estimaciones de agenda.
- El reloj interno permanece fijado a las 10:00 de un día laborable para repetir el recorrido. Las fechas se regeneran al restablecer la demo, no al recargar.
- SQLite persiste en el ordenador que ejecuta el servidor; ambos dispositivos deben poder comunicarse por la misma red. La demo no funciona como aplicación autónoma sin conexión al servidor.
- Se calcula la ocupación con los horarios y bloqueos configurados actualmente. No se conserva una versión histórica de cada horario, y el indicador no representa asistencia ni contabilidad.
- Las citas conservan duración, precio y margen acordados; no hay gestión de salas, equipamiento compartido ni reservas de grupos. El conflicto se comprueba por profesional.
- El CSV se orienta a Excel en español. Se incluyen solo las columnas indicadas en la vista previa, sin notas. No hay formato XLSX.
- La accesibilidad incluye contraste, etiquetas, teclado, foco y adaptación a pantallas. Las comprobaciones automáticas no sustituyen una auditoría completa con usuarios y tecnologías de asistencia.

## Antes de trabajar con clientes reales

Definir requisitos y responsabilidades del servicio; implementar autenticación y permisos, aislamiento de negocios, verificación de identidad, protección frente a abuso, HTTPS y gestión de secretos; diseñar tratamiento y conservación de datos, consentimiento y procesos de privacidad; desplegar con monitorización, registros adecuados, copias de seguridad probadas y recuperación; comprobar concurrencia, zonas horarias y capacidad con cargas reales; realizar revisiones profesionales de seguridad, accesibilidad y obligaciones aplicables al negocio; y contratar/configurar los proveedores externos que se decida integrar.

La demo no declara cumplimiento regulatorio certificado ni promete resultados comerciales.
