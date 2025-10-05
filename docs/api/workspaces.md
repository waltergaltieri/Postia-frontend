# Workspaces API

Los workspaces representan espacios de trabajo dentro de una agencia donde se organizan campañas, recursos y plantillas para diferentes clientes o proyectos.

## Endpoints

### GET /api/workspaces

Obtiene todos los espacios de trabajo de la agencia del usuario autenticado.

**Respuesta:**

```json
{
  "data": [
    {
      "id": "workspace-123",
      "agencyId": "agency-456",
      "name": "Restaurante El Buen Sabor",
      "branding": {
        "primaryColor": "#E53E3E",
        "secondaryColor": "#718096",
        "logo": "https://example.com/logo.png",
        "slogan": "La mejor comida de la ciudad",
        "description": "Restaurante familiar con más de 20 años de experiencia",
        "whatsapp": "+1234567890"
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "message": "Espacios de trabajo obtenidos exitosamente",
  "success": true
}
```

### POST /api/workspaces

Crea un nuevo espacio de trabajo.

**Cuerpo de la Solicitud:**

```json
{
  "name": "Mi Nuevo Workspace",
  "branding": {
    "primaryColor": "#9333ea",
    "secondaryColor": "#737373",
    "logo": "https://example.com/logo.png",
    "slogan": "Mi slogan personalizado",
    "description": "Descripción del workspace",
    "whatsapp": "+1234567890"
  }
}
```

**Validaciones:**

- `name`: Requerido, máximo 100 caracteres
- `branding.primaryColor`: Debe ser un color hex válido (#RRGGBB)
- `branding.secondaryColor`: Debe ser un color hex válido (#RRGGBB)
- `branding.logo`: Debe ser una URL válida o cadena vacía
- `branding.slogan`: Máximo 100 caracteres
- `branding.description`: Máximo 500 caracteres
- `branding.whatsapp`: Debe ser un número de teléfono válido con formato internacional

**Respuesta (201):**

```json
{
  "data": {
    "id": "workspace-789",
    "agencyId": "agency-456",
    "name": "Mi Nuevo Workspace",
    "branding": {
      "primaryColor": "#9333ea",
      "secondaryColor": "#737373",
      "logo": "https://example.com/logo.png",
      "slogan": "Mi slogan personalizado",
      "description": "Descripción del workspace",
      "whatsapp": "+1234567890"
    },
    "createdAt": "2024-02-01T12:00:00Z",
    "updatedAt": "2024-02-01T12:00:00Z"
  },
  "message": "Espacio de trabajo creado exitosamente",
  "success": true
}
```

### GET /api/workspaces/{id}

Obtiene un espacio de trabajo específico por ID.

**Parámetros de Ruta:**

- `id`: ID del workspace (UUID)

**Respuesta:**

```json
{
  "data": {
    "id": "workspace-123",
    "agencyId": "agency-456",
    "name": "Restaurante El Buen Sabor",
    "branding": {
      "primaryColor": "#E53E3E",
      "secondaryColor": "#718096",
      "logo": "https://example.com/logo.png",
      "slogan": "La mejor comida de la ciudad",
      "description": "Restaurante familiar con más de 20 años de experiencia",
      "whatsapp": "+1234567890"
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "message": "Espacio de trabajo obtenido exitosamente",
  "success": true
}
```

### PATCH /api/workspaces/{id}

Actualiza un espacio de trabajo existente.

**Parámetros de Ruta:**

- `id`: ID del workspace (UUID)

**Cuerpo de la Solicitud:**

```json
{
  "name": "Nombre Actualizado",
  "branding": {
    "primaryColor": "#FF6B6B",
    "slogan": "Nuevo slogan"
  }
}
```

**Nota:** Todos los campos son opcionales. Solo se actualizarán los campos proporcionados.

**Respuesta:**

```json
{
  "data": {
    "id": "workspace-123",
    "agencyId": "agency-456",
    "name": "Nombre Actualizado",
    "branding": {
      "primaryColor": "#FF6B6B",
      "secondaryColor": "#718096",
      "logo": "https://example.com/logo.png",
      "slogan": "Nuevo slogan",
      "description": "Restaurante familiar con más de 20 años de experiencia",
      "whatsapp": "+1234567890"
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-02-01T14:30:00Z"
  },
  "message": "Espacio de trabajo actualizado exitosamente",
  "success": true
}
```

### DELETE /api/workspaces/{id}

Elimina un espacio de trabajo y todos sus datos relacionados.

**Parámetros de Ruta:**

- `id`: ID del workspace (UUID)

**Respuesta:**

```json
{
  "data": null,
  "message": "Espacio de trabajo eliminado exitosamente",
  "success": true
}
```

**Nota:** Esta operación eliminará en cascada:

- Todas las campañas del workspace
- Todos los recursos del workspace
- Todas las plantillas del workspace
- Todas las publicaciones relacionadas
- Todas las cuentas de redes sociales conectadas

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
      "field": "branding.primaryColor",
      "message": "Color debe ser un hex válido"
    }
  ],
  "success": false
}
```

### 404 - Not Found

```json
{
  "error": "Espacio de trabajo no encontrado",
  "success": false
}
```

### 403 - Forbidden

```json
{
  "error": "No autorizado para acceder a este espacio de trabajo",
  "success": false
}
```

## Ejemplos de Uso

### Crear workspace básico

```bash
curl -X POST /api/workspaces \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mi Restaurante"
  }'
```

### Crear workspace con branding completo

```bash
curl -X POST /api/workspaces \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Boutique Elegancia",
    "branding": {
      "primaryColor": "#9F7AEA",
      "secondaryColor": "#4A5568",
      "slogan": "Moda que inspira",
      "description": "Boutique especializada en moda femenina contemporánea",
      "whatsapp": "+1234567891"
    }
  }'
```

### Actualizar solo el nombre

```bash
curl -X PATCH /api/workspaces/workspace-123 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nuevo Nombre del Workspace"
  }'
```
