# Postia Frontend

Plataforma de generación de contenido con IA para agencias de marketing.

## Tecnologías

- **Next.js 14+** - Framework React con App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Redux Toolkit** - State management
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **React Hot Toast** - Notifications

## Estructura del Proyecto

```
src/
├── app/                    # Next.js App Router
├── components/            # Componentes reutilizables
│   ├── common/           # Componentes base (Button, Input, Modal)
│   ├── dashboard/        # Componentes del dashboard
│   ├── campaigns/        # Componentes de campañas
│   ├── resources/        # Gestión de recursos
│   ├── templates/        # Gestión de templates
│   └── calendar/         # Componentes del calendario
├── layouts/              # Layouts de la aplicación
├── store/                # Redux store
│   ├── api/             # RTK Query APIs
│   └── slices/          # Redux slices
├── hooks/                # Custom hooks
├── utils/                # Funciones utilitarias
├── types/                # Definiciones de tipos TypeScript
└── styles/               # Estilos globales
```

## Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Iniciar servidor de producción
npm run start

# Linting
npm run lint
npm run lint:fix

# Formateo de código
npm run format
npm run format:check

# Verificación de tipos
npm run type-check

# Limpiar archivos de build
npm run clean
```

## Configuración

### ESLint + Prettier

El proyecto está configurado con ESLint y Prettier para mantener la calidad y consistencia del código.

### Tailwind CSS

Configurado con:

- Colores personalizados para la marca
- Utilidades adicionales
- Componentes base reutilizables
- Responsive design

### Redux Toolkit

- Store configurado con RTK Query para data fetching
- Slices organizados por funcionalidad
- Middleware configurado para serialización

## Desarrollo

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Iniciar servidor de desarrollo:

   ```bash
   npm run dev
   ```

3. Abrir [http://localhost:3000](http://localhost:3000) en el navegador

## Próximos Pasos

Este es el setup inicial del proyecto. Los siguientes tasks implementarán:

1. Componentes base de UI
2. Sistema de autenticación
3. Layouts y navegación
4. Gestión de workspaces
5. Sistema de recursos y templates
6. Creación de campañas
7. Calendario de publicaciones
8. Configuraciones y settings
