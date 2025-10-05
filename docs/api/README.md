# Postia API Documentation

Esta documentación describe todos los endpoints de la API REST de Postia MVP.

## Autenticación

Todos los endpoints requieren autenticación mediante JWT token en el header `Authorization`:

```
Authorization: Bearer <token>
```

## Formato de Respuesta

Todas las respuestas siguen el formato estándar:

### Respuesta Exitosa

```json
{
  "data": <datos>,
  "message": "Mensaje descriptivo",
  "success": true
}
```

### Respuesta con Paginación

```json
{
  "data": [<array de datos>],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  },
  "message": "Mensaje descriptivo",
  "success": true
}
```

### Respuesta de Error

```json
{
  "error": "Mensaje de error",
  "success": false
}
```

### Respuesta de Error de Validación

```json
{
  "error": "Datos de entrada inválidos",
  "details": [
    {
      "field": "nombre_campo",
      "message": "Mensaje específico del error"
    }
  ],
  "success": false
}
```

## Códigos de Estado HTTP

- `200` - OK: Operación exitosa
- `201` - Created: Recurso creado exitosamente
- `400` - Bad Request: Datos de entrada inválidos
- `401` - Unauthorized: Token de autenticación requerido o inválido
- `403` - Forbidden: No autorizado para realizar esta operación
- `404` - Not Found: Recurso no encontrado
- `500` - Internal Server Error: Error interno del servidor

## Endpoints

### [Workspaces](./workspaces.md)

- `GET /api/workspaces` - Obtener espacios de trabajo
- `POST /api/workspaces` - Crear espacio de trabajo
- `GET /api/workspaces/{id}` - Obtener espacio específico
- `PATCH /api/workspaces/{id}` - Actualizar espacio
- `DELETE /api/workspaces/{id}` - Eliminar espacio

### [Campaigns](./campaigns.md)

- `GET /api/campaigns` - Obtener campañas
- `POST /api/campaigns` - Crear campaña
- `GET /api/campaigns/{id}` - Obtener campaña específica
- `PATCH /api/campaigns/{id}` - Actualizar campaña
- `DELETE /api/campaigns/{id}` - Eliminar campaña

### [Resources](./resources.md)

- `GET /api/resources` - Obtener recursos
- `POST /api/resources` - Subir recursos
- `GET /api/resources/{id}` - Obtener recurso específico
- `PATCH /api/resources/{id}` - Actualizar recurso
- `DELETE /api/resources/{id}` - Eliminar recurso

### [Templates](./templates.md)

- `GET /api/templates` - Obtener plantillas
- `POST /api/templates` - Crear plantilla
- `GET /api/templates/{id}` - Obtener plantilla específica
- `PATCH /api/templates/{id}` - Actualizar plantilla
- `DELETE /api/templates/{id}` - Eliminar plantilla

### [Calendar](./calendar.md)

- `GET /api/calendar` - Obtener datos del calendario
- `GET /api/publications/{id}` - Obtener publicación específica
- `PATCH /api/publications/{id}` - Actualizar publicación
- `POST /api/publications/{id}/publish` - Publicar inmediatamente
- `POST /api/publications/{id}/reschedule` - Reprogramar publicación
- `POST /api/publications/{id}/cancel` - Cancelar publicación
- `POST /api/publications/{id}/regenerate` - Regenerar contenido

### [Dashboard](./dashboard.md)

- `GET /api/dashboard` - Obtener métricas del dashboard

## Tipos de Datos

### SocialNetwork

```typescript
type SocialNetwork = 'facebook' | 'instagram' | 'twitter' | 'linkedin'
```

### CampaignStatus

```typescript
type CampaignStatus = 'draft' | 'active' | 'completed' | 'paused'
```

### PublicationStatus

```typescript
type PublicationStatus = 'scheduled' | 'published' | 'failed' | 'cancelled'
```

### ResourceType

```typescript
type ResourceType = 'image' | 'video'
```

### TemplateType

```typescript
type TemplateType = 'single' | 'carousel'
```

## Validación de Datos

La API utiliza Zod para validación de esquemas. Todos los campos requeridos y sus restricciones están documentados en cada endpoint específico.

## Ejemplos de Uso

### Crear un Workspace

```bash
curl -X POST /api/workspaces \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mi Nuevo Workspace",
    "branding": {
      "primaryColor": "#9333ea",
      "secondaryColor": "#737373",
      "slogan": "Mi slogan personalizado"
    }
  }'
```

### Obtener Campañas con Filtros

```bash
curl -X GET "/api/campaigns?workspaceId=123&status=active&page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

### Subir Recursos

```bash
curl -X POST /api/resources \
  -H "Authorization: Bearer <token>" \
  -F "workspaceId=123" \
  -F "files=@image1.jpg" \
  -F "files=@image2.png"
```
