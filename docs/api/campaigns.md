# Campaigns API

Las campañas representan estrategias de marketing con configuraciones específicas para generar contenido automatizado en redes sociales.

## Endpoints

### GET /api/campaigns

Obtiene campañas con filtros y paginación.

**Parámetros de Consulta:**

- `workspaceId` (requerido): ID del workspace
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Elementos por página (default: 10, máx: 100)
- `status` (opcional): Estado de la campaña (`draft`, `active`, `completed`, `paused`)
- `search` (opcional): Búsqueda por nombre u objetivo

**Ejemplo:**

```
GET /api/campaigns?workspaceId=workspace-123&status=active&page=1&limit=10
```

**Respuesta:**

```json
{
  "data": [
    {
      "id": "campaign-123",
      "workspaceId": "workspace-456",
      "name": "Campaña de Verano 2024",
      "objective": "Aumentar el engagement y las ventas durante la temporada de verano",
      "startDate": "2024-06-01T00:00:00Z",
      "endDate": "2024-08-31T23:59:59Z",
      "socialNetworks": ["facebook", "instagram"],
      "intervalHours": 24,
      "contentType": "optimized",
      "optimizationSettings": {
        "facebook": {
          "tone": "professional",
          "hashtags": true
        },
        "instagram": {
          "tone": "casual",
          "hashtags": true
        }
      },
      "prompt": "Crear contenido atractivo para la temporada de verano...",
      "status": "active",
      "createdAt": "2024-05-15T10:00:00Z",
      "updatedAt": "2024-05-20T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  },
  "message": "Campañas obtenidas exitosamente",
  "success": true
}
```

### POST /api/campaigns

Crea una nueva campaña.

**Cuerpo de la Solicitud:**

```json
{
  "workspaceId": "workspace-123",
  "name": "Nueva Campaña",
  "objective": "Objetivo de la campaña",
  "startDate": "2024-06-01T00:00:00Z",
  "endDate": "2024-08-31T23:59:59Z",
  "socialNetworks": ["facebook", "instagram"],
  "intervalHours": 24,
  "contentType": "optimized",
  "optimizationSettings": {
    "facebook": {
      "tone": "professional",
      "hashtags": true
    },
    "instagram": {
      "tone": "casual",
      "hashtags": true
    }
  },
  "prompt": "Prompt para generar contenido...",
  "resourceIds": ["resource-1", "resource-2"],
  "templateIds": ["template-1"]
}
```

**Validaciones:**

- `workspaceId`: Requerido, debe ser UUID válido
- `name`: Requerido, máximo 200 caracteres
- `objective`: Requerido, máximo 1000 caracteres
- `startDate`: Requerido, formato ISO datetime
- `endDate`: Requerido, formato ISO datetime, debe ser posterior a startDate
- `socialNetworks`: Requerido, array con al menos una red social válida
- `intervalHours`: Opcional, entero entre 1 y 168 (default: 24)
- `contentType`: Opcional, `unified` o `optimized` (default: `unified`)
- `prompt`: Requerido, máximo 2000 caracteres
- `resourceIds`: Opcional, array de UUIDs
- `templateIds`: Opcional, array de UUIDs

**Respuesta (201):**

```json
{
  "data": {
    "id": "campaign-789",
    "workspaceId": "workspace-123",
    "name": "Nueva Campaña",
    "objective": "Objetivo de la campaña",
    "startDate": "2024-06-01T00:00:00Z",
    "endDate": "2024-08-31T23:59:59Z",
    "socialNetworks": ["facebook", "instagram"],
    "intervalHours": 24,
    "contentType": "optimized",
    "optimizationSettings": {
      "facebook": {
        "tone": "professional",
        "hashtags": true
      },
      "instagram": {
        "tone": "casual",
        "hashtags": true
      }
    },
    "prompt": "Prompt para generar contenido...",
    "status": "draft",
    "createdAt": "2024-02-01T12:00:00Z",
    "updatedAt": "2024-02-01T12:00:00Z"
  },
  "message": "Campaña creada exitosamente",
  "success": true
}
```

### GET /api/campaigns/{id}

Obtiene una campaña específica por ID.

**Parámetros de Ruta:**

- `id`: ID de la campaña (UUID)

**Respuesta:**

```json
{
  "data": {
    "id": "campaign-123",
    "workspaceId": "workspace-456",
    "name": "Campaña de Verano 2024",
    "objective": "Aumentar el engagement y las ventas durante la temporada de verano",
    "startDate": "2024-06-01T00:00:00Z",
    "endDate": "2024-08-31T23:59:59Z",
    "socialNetworks": ["facebook", "instagram"],
    "intervalHours": 24,
    "contentType": "optimized",
    "optimizationSettings": {
      "facebook": {
        "tone": "professional",
        "hashtags": true
      },
      "instagram": {
        "tone": "casual",
        "hashtags": true
      }
    },
    "prompt": "Crear contenido atractivo para la temporada de verano...",
    "status": "active",
    "createdAt": "2024-05-15T10:00:00Z",
    "updatedAt": "2024-05-20T14:30:00Z"
  },
  "message": "Campaña obtenida exitosamente",
  "success": true
}
```

### PATCH /api/campaigns/{id}

Actualiza una campaña existente.

**Parámetros de Ruta:**

- `id`: ID de la campaña (UUID)

**Cuerpo de la Solicitud:**

```json
{
  "name": "Nombre Actualizado",
  "status": "active",
  "intervalHours": 12
}
```

**Nota:** Todos los campos son opcionales. Solo se actualizarán los campos proporcionados.

**Respuesta:**

```json
{
  "data": {
    "id": "campaign-123",
    "workspaceId": "workspace-456",
    "name": "Nombre Actualizado",
    "objective": "Aumentar el engagement y las ventas durante la temporada de verano",
    "startDate": "2024-06-01T00:00:00Z",
    "endDate": "2024-08-31T23:59:59Z",
    "socialNetworks": ["facebook", "instagram"],
    "intervalHours": 12,
    "contentType": "optimized",
    "optimizationSettings": {
      "facebook": {
        "tone": "professional",
        "hashtags": true
      },
      "instagram": {
        "tone": "casual",
        "hashtags": true
      }
    },
    "prompt": "Crear contenido atractivo para la temporada de verano...",
    "status": "active",
    "createdAt": "2024-05-15T10:00:00Z",
    "updatedAt": "2024-02-01T15:45:00Z"
  },
  "message": "Campaña actualizada exitosamente",
  "success": true
}
```

### DELETE /api/campaigns/{id}

Elimina una campaña y todas sus publicaciones relacionadas.

**Parámetros de Ruta:**

- `id`: ID de la campaña (UUID)

**Respuesta:**

```json
{
  "data": null,
  "message": "Campaña eliminada exitosamente",
  "success": true
}
```

## Estados de Campaña

- `draft`: Borrador, no genera publicaciones
- `active`: Activa, genera publicaciones según configuración
- `completed`: Completada, no genera más publicaciones
- `paused`: Pausada, temporalmente inactiva

## Tipos de Contenido

- `unified`: Mismo contenido para todas las redes sociales
- `optimized`: Contenido optimizado específico para cada red social

## Configuraciones de Optimización

Cuando `contentType` es `optimized`, se pueden especificar configuraciones por red social:

```json
{
  "optimizationSettings": {
    "facebook": {
      "tone": "professional",
      "hashtags": true
    },
    "instagram": {
      "tone": "casual",
      "hashtags": true
    },
    "twitter": {
      "tone": "concise",
      "hashtags": true
    },
    "linkedin": {
      "tone": "professional",
      "hashtags": false
    }
  }
}
```

## Errores Comunes

### 400 - Bad Request

```json
{
  "error": "Datos de entrada inválidos",
  "details": [
    {
      "field": "name",
      "message": "Nombre es requerido"
    },
    {
      "field": "socialNetworks",
      "message": "Al menos una red social es requerida"
    }
  ],
  "success": false
}
```

### 404 - Not Found

```json
{
  "error": "Campaña no encontrada",
  "success": false
}
```

## Ejemplos de Uso

### Obtener campañas activas

```bash
curl -X GET "/api/campaigns?workspaceId=workspace-123&status=active" \
  -H "Authorization: Bearer <token>"
```

### Crear campaña básica

```bash
curl -X POST /api/campaigns \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "workspace-123",
    "name": "Campaña de Primavera",
    "objective": "Promocionar productos de temporada",
    "startDate": "2024-03-01T00:00:00Z",
    "endDate": "2024-05-31T23:59:59Z",
    "socialNetworks": ["instagram", "facebook"],
    "prompt": "Crear contenido fresco y atractivo para la temporada de primavera"
  }'
```

### Activar campaña

```bash
curl -X PATCH /api/campaigns/campaign-123 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active"
  }'
```
