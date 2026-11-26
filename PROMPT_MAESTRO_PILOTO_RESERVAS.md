# Prompt maestro para Codex — Piloto comercial de reservas para negocios locales

## Tu papel

Actúa como mi socio de producto, diseñador UX/UI y desarrollador senior. Quiero que me ayudes a diseñar e implementar un piloto comercial de un sistema de reservas para pequeñas clínicas y negocios locales. Debes tomar decisiones razonables, explicar brevemente las decisiones importantes y avanzar de forma autónoma siempre que no falte una definición que cambie de manera material el producto.

No quiero una demostración técnica vacía ni un CRUD genérico. Quiero una demo muy convincente que pueda enseñar presencialmente a un propietario y que le haga pensar: «esto me ahorra tiempo, me ayuda a tratar mejor a mis clientes y me permite entender mi negocio».

La prioridad absoluta es el valor percibido por el pequeño empresario y la facilidad de uso. La sofisticación técnica, la escalabilidad extrema y las integraciones reales quedan subordinadas a ese objetivo durante el piloto.

## Contexto del producto

El producto será inicialmente una solución de reservas para una clínica pequeña ficticia, pero deberá sentirse adaptable a fisioterapia, estética, podología, psicología, peluquería, masajes u otros negocios con cita previa.

El canal de captación principal será WhatsApp. En el producto real, cuando un cliente escriba al WhatsApp Business del local recibirá un mensaje con un enlace para reservar. Para el piloto no es imprescindible conectar la API real de WhatsApp: basta con simular fielmente el mensaje y ofrecer accesos que permitan demostrar el flujo completo.

El producto se comercializará como servicio, con configuración inicial y cuota mensual. Por eso debe parecer un producto configurable, no un desarrollo hecho exclusivamente para una sola clínica.

## Objetivo de este piloto

Construir una aplicación demostrable, visualmente cuidada, responsive y cargada con datos ficticios realistas que permita recorrer dos experiencias completas:

1. La de un cliente que llega desde WhatsApp, reserva una cita en menos de un minuto y recibe una confirmación clara.
2. La del propietario o recepcionista que abre el panel y entiende en pocos segundos qué ocurre hoy, qué acciones necesita realizar, quiénes son sus clientes y cómo evoluciona el negocio.

La demo debe poder ejecutarse localmente con instrucciones sencillas y sin depender de servicios de pago ni credenciales externas. Todas las acciones principales deben funcionar y mantener el estado mientras se utiliza la demo. No quiero botones decorativos que aparenten funcionalidad y no hagan nada.

## Principios de producto

- Diseñar para una persona con poca afinidad tecnológica y poco tiempo.
- Mostrar lenguaje de negocio, no conceptos técnicos.
- Priorizar claridad, rapidez, confianza y reducción de trabajo manual.
- Cada pantalla debe responder a una necesidad concreta.
- Evitar sobrecargar con métricas que un comercio pequeño no sabría interpretar.
- Las ayudas deben explicar qué significa el dato y qué puede hacer el usuario con él.
- Las acciones frecuentes deben estar a uno o dos clics.
- Los datos sensibles ficticios deben parecer realistas, pero nunca corresponder a personas reales.
- La interfaz debe funcionar especialmente bien en móvil para el cliente y en ordenador/tablet para el negocio.
- Usar fechas, horas, moneda y textos en formato español.
- Cumplir una accesibilidad básica: buen contraste, foco visible, etiquetas, áreas táctiles cómodas y no depender solo del color.

## Marca y escenario ficticio

Crea una clínica ficticia llamada **Clínica Armonía**. Utiliza una identidad visual cercana, profesional y moderna, sin parecer una gran corporación sanitaria. Define una paleta serena, tipografía legible, logo textual sencillo y fotografías o ilustraciones solo si aportan valor y pueden utilizarse sin dependencias problemáticas.

Configura inicialmente:

- Servicios: Fisioterapia (50 min, 42 €), Osteopatía (50 min, 48 €), Masaje terapéutico (30 min, 32 €) y Podología (40 min, 38 €).
- Profesionales: Laura, Marta y Carlos.
- Horario habitual de lunes a viernes, con mañana y tarde, y sábado por la mañana.
- Diferentes servicios asignados a diferentes profesionales.
- Reservas, cancelaciones, nuevos clientes, clientes recurrentes y algunos huecos libres repartidos durante las próximas semanas.

Centraliza estos datos para que cambiar la marca, servicios, profesionales y horarios sea sencillo. No disperses valores de configuración por la interfaz.

## Recorrido 1: experiencia del cliente

Incluye una pantalla inicial que simule el mensaje automático recibido por WhatsApp:

> Hola 👋 Gracias por escribir a Clínica Armonía. Puedes reservar tu cita online en menos de un minuto. Si necesitas ayuda, también puedes hablar con nosotros.

Debe contener acciones para **Reservar cita**, **Consultar o gestionar mi cita** y **Hablar con la clínica**. En la demo, “Reservar cita” inicia el flujo; las otras opciones deben mostrar una experiencia coherente o una explicación de demo, nunca quedarse sin respuesta.

El flujo principal será:

1. Elegir servicio.
2. Elegir día entre aquellos que tengan disponibilidad real para ese servicio.
3. Elegir hora disponible.
4. Introducir datos mínimos.
5. Revisar y confirmar.
6. Ver confirmación y opciones posteriores.

### Selección de servicio

Mostrar cada servicio con nombre, explicación breve, duración y precio. Añadir una ayuda discreta del tipo «¿No sabes cuál elegir? Habla con la clínica». No obligar a elegir profesional, aunque se puede permitir como opción secundaria si no complica el recorrido.

### Selección de fecha

Mostrar un calendario móvil muy claro. Deshabilitar días sin disponibilidad y explicar el motivo mediante leyenda o ayuda. Permitir avanzar a semanas posteriores. Mantener visible un resumen del servicio elegido.

### Selección de hora

Mostrar solo horas realmente compatibles con la duración del servicio, el horario del profesional, bloqueos y citas existentes. Si intervienen varios profesionales, se puede asignar automáticamente el disponible. Agrupar horarios en mañana y tarde. Si no quedan horas, sugerir el día disponible más cercano.

### Datos del cliente

Solicitar únicamente nombre, teléfono y, opcionalmente, correo electrónico y una nota breve. Incluir consentimiento de privacidad con texto comprensible. Validar los campos con mensajes humanos y concretos.

### Confirmación

Antes de reservar, mostrar un resumen inequívoco: servicio, fecha, hora, duración, precio y profesional si ya está asignado. Al confirmar, crear realmente la reserva en el estado de la demo y bloquear ese hueco para impedir una doble reserva.

La pantalla final debe mostrar:

- Confirmación visual clara.
- Código localizador sencillo.
- Datos completos de la cita.
- Botones para añadir al calendario, cambiar la cita y cancelar.
- Vista previa del WhatsApp de confirmación y del recordatorio de 24 horas.
- Indicación de cómo contactar con el negocio.

## Recorrido 2: panel del negocio

La pantalla inicial no debe ser un dashboard lleno de gráficos. Debe funcionar como centro de trabajo diario.

### Inicio / Hoy

Mostrar en primer término:

- Próxima cita y tiempo restante.
- Agenda cronológica de hoy con hora, cliente, servicio, profesional y estado.
- Huecos libres visibles.
- Acciones rápidas: nueva cita, llamar/copiar teléfono, abrir WhatsApp, confirmar, marcar asistencia, cancelar, reprogramar y añadir nota.
- Avisos accionables: citas pendientes de confirmar, cancelación reciente, hueco liberado, cliente que no ha respondido o agenda casi completa.

Añadir un resumen compacto: citas de hoy, confirmadas, pendientes, canceladas, ocupación estimada e ingresos previstos. Cada métrica debe incluir una ayuda breve que explique cómo se calcula y para qué sirve.

### Agenda

Crear vistas de día y semana suficientemente visuales. Permitir filtrar por profesional, servicio y estado. Las citas deben distinguirse también mediante texto o icono, no únicamente por color.

Al abrir una cita, permitir:

- Consultar todos sus datos.
- Cambiar fecha, hora, servicio o profesional.
- Confirmar, marcar como atendida, cancelada o no presentada.
- Escribir notas internas.
- Copiar teléfono.
- Simular el envío de un WhatsApp.
- Consultar un pequeño historial de cambios.

Debe existir una creación manual de cita para reservas recibidas por teléfono o presencialmente. Tiene que utilizar las mismas reglas de disponibilidad y advertir antes de generar conflictos.

### Clientes

Crear un listado buscable por nombre o teléfono. La ficha de cliente debe mostrar:

- Datos de contacto.
- Próxima cita.
- Historial de citas.
- Número de visitas.
- Cancelaciones y ausencias.
- Servicios habituales.
- Última visita y tiempo desde entonces.
- Notas internas.
- Consentimiento para comunicaciones.
- Acción para contactar por WhatsApp.

Incluye una etiqueta útil y explicable, como «nuevo», «habitual», «hace tiempo que no viene» o «varias ausencias». No realices diagnósticos médicos ni perfiles invasivos.

### Inteligencia de negocio comprensible

Añade una sección llamada **Cómo va el negocio**, pensada para alguien que no sabe analítica. Debe permitir elegir un periodo y mostrar solo indicadores accionables:

- Número de citas y evolución frente al periodo anterior.
- Ingresos previstos basados en las citas atendidas o confirmadas, aclarando que no equivale a contabilidad real.
- Porcentaje de ocupación y franjas con más huecos.
- Servicios más reservados.
- Clientes nuevos frente a recurrentes.
- Cancelaciones y ausencias.
- Procedencia de las reservas: WhatsApp, teléfono, presencial o web.
- Próximos huecos difíciles de llenar.

Después de los datos, genera entre tres y cinco conclusiones en lenguaje natural y prudente. Ejemplos: «Los martes por la tarde tienes más huecos libres» o «Fisioterapia concentra la mayoría de reservas esta semana». Estas conclusiones deben derivarse de los datos locales mediante reglas deterministas; no hace falta integrar IA externa.

Cada recomendación debe tener, cuando sea pertinente, una acción asociada: ver huecos, revisar clientes inactivos, copiar una lista o preparar un mensaje. No prometas resultados comerciales ni sugieras campañas sanitarias agresivas.

### Exportación y trabajo con Excel

Permitir exportar citas y clientes a CSV o XLSX si la tecnología elegida lo permite de forma sencilla. Como mínimo, debe funcionar la exportación CSV compatible con Excel y un botón para copiar una tabla visible al portapapeles.

Antes de exportar, permitir elegir periodo, estado, profesional y servicio. Indicar con claridad qué columnas se exportarán. Aplicar las mismas medidas de privacidad que en pantalla y no incluir notas internas sensibles por defecto.

### Configuración

Crear una configuración funcional, aunque compacta, para:

- Datos y apariencia del negocio.
- Servicios, duración, precio y estado activo.
- Profesionales y servicios que realizan.
- Horarios habituales.
- Vacaciones, descansos y bloqueos puntuales.
- Antelación mínima y máxima para reservar.
- Tiempo de cortesía o separación entre citas.
- Política de cancelación.
- Textos de confirmación y recordatorio.

No hace falta implementar facturación, nóminas, historia clínica, inventario ni contabilidad.

## Lógica funcional imprescindible

Modela al menos estas entidades: negocio, servicio, profesional, asignación servicio-profesional, horario, bloqueo, cliente, reserva y evento/historial de reserva.

Estados mínimos de una reserva: pendiente, confirmada, atendida, cancelada y no presentada.

La disponibilidad debe calcularse, no almacenarse como una lista fija:

**horarios de profesionales compatibles − bloqueos − reservas activas − márgenes configurados = huecos reservables**

Garantiza:

- Ausencia de doble reserva.
- Respeto de duración y márgenes.
- Exclusión de citas canceladas al calcular ocupación.
- Reprogramación consistente.
- Persistencia de cambios en la demo.
- Datos iniciales recuperables mediante una opción segura de «Restablecer demo».

## Alcance técnico del piloto

Antes de programar, inspecciona el repositorio y reutiliza su stack, convenciones y componentes si ya existen. Si el repositorio está vacío, propón una opción ligera y explica en pocas líneas por qué es adecuada. Mi experiencia incluye .NET, SQL y React/Next.js, pero para este piloto puedes elegir la solución que permita obtener antes una demo sólida y mantenible.

La aplicación debe:

- Arrancar localmente con pocos comandos.
- Incluir datos semilla realistas.
- No requerir API de WhatsApp, proveedor de correo, pagos ni servicios de pago.
- Simular mensajes y recordatorios de manera claramente etiquetada como demo.
- Separar de manera razonable UI, reglas de negocio y acceso a datos.
- Evitar una infraestructura innecesaria de microservicios.
- Manejar errores y estados vacíos con mensajes útiles.
- Tener pruebas automatizadas prioritariamente sobre disponibilidad, creación, cancelación y reprogramación.
- Incluir un README con instalación, ejecución, recorrido comercial y limitaciones.

Si una integración externa impide que el piloto sea reproducible, crea un adaptador o simulador sustituible en el futuro.

## Fuera de alcance por ahora

- Integración real con WhatsApp Business Platform.
- Chatbot o agente de IA conversacional.
- Pagos online.
- Sincronización real con Google Calendar u Outlook.
- Historia clínica y documentación médica.
- Facturación fiscal.
- Aplicación móvil nativa.
- Arquitectura multiempresa completa con aislamiento de producción.
- Permisos complejos, SSO o cumplimiento regulatorio certificado.
- Envío real de mensajes, correos o campañas.

Puedes preparar puntos de extensión para estas funciones, pero no dedicar tiempo a implementarlas salvo que yo lo autorice.

## Calidad visual y de interacción

Quiero un resultado que pueda enseñar a un cliente, no una maqueta gris de desarrollador. Utiliza un sistema visual coherente, espacios generosos, jerarquía tipográfica clara, estados de carga, confirmaciones, diálogos seguros y microcopys cercanos.

Evita:

- Tablas gigantes como pantalla principal.
- Menús con demasiadas secciones.
- Gráficos sin explicación.
- Textos técnicos como UUID, endpoint, webhook, tenant o job.
- Interfaces que parezcan plantillas genéricas de administración.
- Exceso de degradados, animaciones o estética futurista.

Incluye estados de ejemplo que permitan vender el producto: un día normal, un día casi completo, una cancelación que libera un hueco y un cliente recurrente con historial.

## Recorrido comercial de la demo

Prepara una forma visible de cambiar entre **Vista cliente** y **Vista negocio**. El recorrido recomendado debe poder demostrarse en 5–7 minutos:

1. Enseñar el mensaje de WhatsApp simulado.
2. Reservar una cita como cliente.
3. Entrar al panel y ver aparecer la nueva reserva.
4. Confirmarla o reprogramarla.
5. Abrir la ficha del cliente y ver su historial.
6. Mostrar qué conclusiones sencillas ofrece el sistema.
7. Exportar las citas filtradas.

Añade en el README un guion comercial breve con qué enseñar y qué beneficio verbalizar en cada paso.

## Método de trabajo requerido

No implementes todo a ciegas en una sola entrega. Trabaja de esta manera:

### Fase 1 — Descubrimiento y definición

1. Inspecciona el repositorio.
2. Resume qué existe y qué condiciona el desarrollo.
3. Convierte este documento en un backlog priorizado con:
   - imprescindible para la demo;
   - mejora de alto impacto;
   - futuro/no implementar.
4. Propón arquitectura, modelo de datos, mapa de pantallas y flujo principal.
5. Señala un máximo de cinco decisiones que realmente necesiten mi intervención.

No me preguntes por detalles que puedas resolver razonablemente basándote en el objetivo del piloto.

### Fase 2 — Base demostrable

Implementa primero un recorrido vertical completo: servicio → fecha → hora → datos → reserva → aparición en agenda. Verifícalo antes de ampliar el panel.

### Fase 3 — Valor para el negocio

Añade agenda operativa, acciones rápidas, ficha de cliente, indicadores comprensibles, recomendaciones deterministas y exportación.

### Fase 4 — Pulido comercial

Revisa responsive, accesibilidad, textos, datos demo, estados vacíos, errores, consistencia visual y guion comercial. Elimina elementos inacabados que resten credibilidad.

En cada fase:

- Mantén una lista de tareas actualizada.
- Implementa en incrementos pequeños y verificables.
- Ejecuta pruebas y revisiones pertinentes.
- Indica qué funciona, qué se ha simulado y qué queda pendiente.
- No cambies de stack ni añadas dependencias relevantes sin justificarlo.

## Criterios de aceptación del piloto

Consideraré el piloto listo cuando:

- Un cliente pueda completar una reserva desde móvil sin explicación externa.
- La hora reservada desaparezca de disponibilidad y aparezca en el panel.
- El negocio pueda crear, modificar, confirmar, cancelar y marcar asistencia.
- Los cambios afecten correctamente a disponibilidad e indicadores.
- La agenda diaria permita saber rápidamente qué pasa hoy.
- La ficha del cliente aporte contexto útil sin convertirse en historia clínica.
- La sección analítica traduzca datos en conclusiones comprensibles.
- Se pueda exportar información filtrada para abrirla en Excel.
- La aplicación incluya datos demo creíbles y una forma de restablecerlos.
- Todo el recorrido comercial pueda demostrarse sin credenciales externas.
- Existan pruebas de las reglas críticas de agenda.
- El README permita a otra persona ejecutar y enseñar la demo.

## Primera respuesta que espero de ti

Empieza inspeccionando el repositorio. Después responde con:

1. Diagnóstico breve del estado actual.
2. Propuesta concreta de stack y arquitectura, ajustada al piloto.
3. Modelo de datos inicial.
4. Mapa de pantallas y navegación.
5. Backlog dividido en las cuatro fases anteriores.
6. Decisiones o riesgos que necesitan validación, solo si son realmente relevantes.
7. Primer incremento vertical que vas a construir y cómo comprobarás que funciona.

No empieces por la integración real de WhatsApp. Empieza por el núcleo del valor: que una persona reserve fácilmente y que el negocio vea, entienda y pueda actuar sobre esa reserva.
