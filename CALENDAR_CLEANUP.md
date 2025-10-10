# Limpieza de Datos Simulados del Calendario

Este documento explica cómo eliminar todos los datos simulados del calendario para empezar a usar datos reales.

## ¿Qué se ha eliminado?

✅ **Datos simulados eliminados:**
- Publicaciones de prueba hardcodeadas en el componente del calendario
- Datos de publicaciones simuladas en los seeds de la base de datos
- Llamadas API simuladas en el modal de detalles de publicación

✅ **Funcionalidad real implementada:**
- Carga de eventos desde la API real (`/api/calendar`)
- Estadísticas dinámicas basadas en datos reales
- Operaciones reales para publicar, reprogramar, cancelar y regenerar
- Estado vacío cuando no hay publicaciones

## Cómo limpiar datos existentes

Si ya tienes datos de prueba en tu base de datos, ejecuta:

```bash
# Opción 1: Usar el script de limpieza
node clear-calendar-data.js

# Opción 2: Limpiar y regenerar seeds sin publicaciones
npm run db:reset
```

## Verificar que el calendario esté limpio

1. Ejecuta el sistema:
   ```bash
   npm run dev
   ```

2. Ve al calendario en cualquier workspace
3. Deberías ver:
   - Estadísticas en 0
   - Mensaje "No hay publicaciones programadas"
   - Botón para crear campaña

## Empezar a usar datos reales

Para empezar a ver publicaciones en el calendario:

1. **Crea una campaña** en la sección de Campañas
2. **Configura la campaña** con:
   - Recursos (imágenes/videos)
   - Templates
   - Redes sociales
   - Fechas de programación
3. **Genera publicaciones** usando la IA
4. Las publicaciones aparecerán automáticamente en el calendario

## Estructura de datos real

El calendario ahora consume datos de:
- **API**: `/api/calendar?workspaceId={id}`
- **Base de datos**: Tabla `publications` con estado `scheduled`
- **Operaciones**: APIs reales para gestionar publicaciones

## Funcionalidades disponibles

- ✅ Vista de calendario (mes/semana/día)
- ✅ Estadísticas dinámicas
- ✅ Detalles de publicación
- ✅ Publicar ahora
- ✅ Reprogramar
- ✅ Cancelar
- ✅ Regenerar con IA
- ✅ Estado vacío
- ✅ Actualización en tiempo real

¡El calendario está listo para usar con datos reales! 🎉