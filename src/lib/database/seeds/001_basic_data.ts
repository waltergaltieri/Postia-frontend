import { Seed } from './index'

export const basicDataSeed: Seed = {
  name: 'basic_data',
  description:
    'Create comprehensive basic sample data for development and testing',

  run: db => {
    // Create multiple sample agencies for different scenarios
    db.prepare(
      `
      INSERT INTO agencies (id, name, email, credits, plan, settings_notifications, settings_timezone, settings_language)
      VALUES 
        ('agency-demo-001', 'Demo Marketing Agency', 'demo@agency.com', 1000, 'pro', true, 'America/Mexico_City', 'es'),
        ('agency-startup-001', 'Startup Creative Hub', 'hello@startuphub.com', 500, 'free', true, 'America/New_York', 'en'),
        ('agency-enterprise-001', 'Enterprise Solutions Inc', 'contact@enterprise.com', 5000, 'enterprise', false, 'Europe/Madrid', 'es')
    `
    ).run()

    // Create diverse users across agencies
    db.prepare(
      `
      INSERT INTO users (id, email, password_hash, agency_id, role)
      VALUES 
        -- Demo Agency Users
        ('user-admin-001', 'admin@agency.com', '$2b$10$dummy.hash.for.development', 'agency-demo-001', 'admin'),
        ('user-member-001', 'member@agency.com', '$2b$10$dummy.hash.for.development', 'agency-demo-001', 'member'),
        ('user-member-002', 'designer@agency.com', '$2b$10$dummy.hash.for.development', 'agency-demo-001', 'member'),
        -- Startup Agency Users
        ('user-startup-admin', 'founder@startuphub.com', '$2b$10$dummy.hash.for.development', 'agency-startup-001', 'admin'),
        ('user-startup-member', 'team@startuphub.com', '$2b$10$dummy.hash.for.development', 'agency-startup-001', 'member'),
        -- Enterprise Agency Users
        ('user-enterprise-admin', 'manager@enterprise.com', '$2b$10$dummy.hash.for.development', 'agency-enterprise-001', 'admin'),
        ('user-enterprise-member1', 'analyst1@enterprise.com', '$2b$10$dummy.hash.for.development', 'agency-enterprise-001', 'member'),
        ('user-enterprise-member2', 'analyst2@enterprise.com', '$2b$10$dummy.hash.for.development', 'agency-enterprise-001', 'member')
    `
    ).run()

    // Create diverse workspaces with varied branding
    db.prepare(
      `
      INSERT INTO workspaces (id, agency_id, name, branding_primary_color, branding_secondary_color, branding_logo, branding_slogan, branding_description, branding_whatsapp)
      VALUES 
        -- Demo Agency Workspaces
        ('workspace-001', 'agency-demo-001', 'Cliente Restaurante La Tradición', '#e11d48', '#64748b', '/logos/restaurante.png', 'Sabores que conquistan corazones', 'Restaurante familiar con tradición de 30 años especializado en cocina mediterránea', '+52-555-0123'),
        ('workspace-002', 'agency-demo-001', 'Cliente Fitness Revolution', '#059669', '#6b7280', '/logos/fitness.png', 'Tu mejor versión te espera', 'Gimnasio moderno con entrenadores certificados y tecnología de vanguardia', '+52-555-0456'),
        ('workspace-003', 'agency-demo-001', 'Cliente TechSolutions Pro', '#2563eb', '#4b5563', '/logos/tech.png', 'Innovación que transforma', 'Empresa de desarrollo de software y transformación digital para empresas', '+52-555-0789'),
        ('workspace-004', 'agency-demo-001', 'Cliente Boutique Elegance', '#7c3aed', '#71717a', '/logos/boutique.png', 'Estilo que define personalidad', 'Boutique de moda femenina con diseños exclusivos y tendencias internacionales', '+52-555-0321'),
        -- Startup Agency Workspaces
        ('workspace-startup-001', 'agency-startup-001', 'EcoFriendly Store', '#10b981', '#6b7280', '/logos/eco.png', 'Planeta verde, futuro brillante', 'Tienda online de productos ecológicos y sostenibles', '+1-555-0111'),
        ('workspace-startup-002', 'agency-startup-001', 'Digital Nomad Hub', '#f59e0b', '#6b7280', '/logos/nomad.png', 'Trabajo sin fronteras', 'Plataforma para nómadas digitales y trabajo remoto', '+1-555-0222'),
        -- Enterprise Agency Workspaces
        ('workspace-enterprise-001', 'agency-enterprise-001', 'Global Finance Corp', '#1f2937', '#9ca3af', '/logos/finance.png', 'Confianza que construye futuro', 'Corporación financiera internacional con servicios integrales', '+34-91-555-0001'),
        ('workspace-enterprise-002', 'agency-enterprise-001', 'Healthcare Innovation', '#dc2626', '#6b7280', '/logos/health.png', 'Salud e innovación unidos', 'Centro médico especializado en tratamientos innovadores', '+34-91-555-0002'),
        ('workspace-enterprise-003', 'agency-enterprise-001', 'Education Excellence', '#7c2d12', '#78716c', '/logos/education.png', 'Educación que transforma vidas', 'Instituto educativo con metodologías avanzadas de aprendizaje', '+34-91-555-0003')
    `
    ).run()

    // Create comprehensive sample resources with varied types and metadata
    db.prepare(
      `
      INSERT INTO resources (id, workspace_id, name, original_name, file_path, url, type, mime_type, size_bytes, width, height, duration_seconds)
      VALUES 
        -- Restaurante Resources
        ('resource-001', 'workspace-001', 'Plato Estrella Paella', 'paella-valenciana.jpg', '/uploads/paella-valenciana.jpg', '/api/resources/paella-valenciana.jpg', 'image', 'image/jpeg', 245760, 1080, 1080, null),
        ('resource-002', 'workspace-001', 'Interior Acogedor', 'interior-restaurante.jpg', '/uploads/interior-restaurante.jpg', '/api/resources/interior-restaurante.jpg', 'image', 'image/jpeg', 189440, 1200, 800, null),
        ('resource-003', 'workspace-001', 'Chef Preparando', 'chef-cooking.mp4', '/uploads/chef-cooking.mp4', '/api/resources/chef-cooking.mp4', 'video', 'video/mp4', 15728640, 1920, 1080, 30),
        ('resource-004', 'workspace-001', 'Terraza Nocturna', 'terraza-noche.jpg', '/uploads/terraza-noche.jpg', '/api/resources/terraza-noche.jpg', 'image', 'image/jpeg', 198720, 1080, 1350, null),
        -- Fitness Resources
        ('resource-005', 'workspace-002', 'Entrenamiento Funcional', 'functional-training.jpg', '/uploads/functional-training.jpg', '/api/resources/functional-training.jpg', 'image', 'image/jpeg', 312320, 1080, 1350, null),
        ('resource-006', 'workspace-002', 'Rutina Cardio', 'cardio-routine.mp4', '/uploads/cardio-routine.mp4', '/api/resources/cardio-routine.mp4', 'video', 'video/mp4', 25165824, 1920, 1080, 45),
        ('resource-007', 'workspace-002', 'Instalaciones Modernas', 'gym-facilities.jpg', '/uploads/gym-facilities.jpg', '/api/resources/gym-facilities.jpg', 'image', 'image/jpeg', 267840, 1200, 900, null),
        ('resource-008', 'workspace-002', 'Clase Grupal', 'group-class.jpg', '/uploads/group-class.jpg', '/api/resources/group-class.jpg', 'image', 'image/jpeg', 234560, 1080, 1080, null),
        -- Tech Resources
        ('resource-009', 'workspace-003', 'Oficina Moderna', 'modern-office.jpg', '/uploads/modern-office.jpg', '/api/resources/modern-office.jpg', 'image', 'image/jpeg', 278528, 1200, 900, null),
        ('resource-010', 'workspace-003', 'Equipo Desarrollando', 'team-coding.jpg', '/uploads/team-coding.jpg', '/api/resources/team-coding.jpg', 'image', 'image/jpeg', 298240, 1080, 1350, null),
        ('resource-011', 'workspace-003', 'Demo Producto', 'product-demo.mp4', '/uploads/product-demo.mp4', '/api/resources/product-demo.mp4', 'video', 'video/mp4', 31457280, 1920, 1080, 60),
        -- Boutique Resources
        ('resource-012', 'workspace-004', 'Colección Primavera', 'spring-collection.jpg', '/uploads/spring-collection.jpg', '/api/resources/spring-collection.jpg', 'image', 'image/jpeg', 223360, 1080, 1350, null),
        ('resource-013', 'workspace-004', 'Desfile Moda', 'fashion-show.mp4', '/uploads/fashion-show.mp4', '/api/resources/fashion-show.mp4', 'video', 'video/mp4', 41943040, 1920, 1080, 90),
        ('resource-014', 'workspace-004', 'Tienda Interior', 'store-interior.jpg', '/uploads/store-interior.jpg', '/api/resources/store-interior.jpg', 'image', 'image/jpeg', 187520, 1200, 800, null),
        -- Startup Resources
        ('resource-015', 'workspace-startup-001', 'Productos Eco', 'eco-products.jpg', '/uploads/eco-products.jpg', '/api/resources/eco-products.jpg', 'image', 'image/jpeg', 201728, 1080, 1080, null),
        ('resource-016', 'workspace-startup-002', 'Workspace Remoto', 'remote-workspace.jpg', '/uploads/remote-workspace.jpg', '/api/resources/remote-workspace.jpg', 'image', 'image/jpeg', 245760, 1200, 900, null),
        -- Enterprise Resources
        ('resource-017', 'workspace-enterprise-001', 'Edificio Corporativo', 'corporate-building.jpg', '/uploads/corporate-building.jpg', '/api/resources/corporate-building.jpg', 'image', 'image/jpeg', 334080, 1200, 1600, null),
        ('resource-018', 'workspace-enterprise-002', 'Equipo Médico', 'medical-equipment.jpg', '/uploads/medical-equipment.jpg', '/api/resources/medical-equipment.jpg', 'image', 'image/jpeg', 289920, 1080, 1350, null),
        ('resource-019', 'workspace-enterprise-003', 'Aula Innovadora', 'innovative-classroom.jpg', '/uploads/innovative-classroom.jpg', '/api/resources/innovative-classroom.jpg', 'image', 'image/jpeg', 256000, 1200, 900, null)
    `
    ).run()

    // Create diverse templates for different use cases
    db.prepare(
      `
      INSERT INTO templates (id, workspace_id, name, type, images, social_networks)
      VALUES 
        -- Restaurante Templates
        ('template-001', 'workspace-001', 'Post Promocional Platos', 'single', '["promo-dish-template.jpg"]', '["facebook", "instagram"]'),
        ('template-002', 'workspace-001', 'Carrusel Menú Semanal', 'carousel', '["menu-slide1.jpg", "menu-slide2.jpg", "menu-slide3.jpg"]', '["instagram", "facebook"]'),
        ('template-003', 'workspace-001', 'Historia Instagram Especiales', 'single', '["story-special.jpg"]', '["instagram"]'),
        -- Fitness Templates
        ('template-004', 'workspace-002', 'Post Motivacional', 'single', '["motivation-template.jpg"]', '["instagram", "facebook"]'),
        ('template-005', 'workspace-002', 'Carrusel Rutinas', 'carousel', '["routine-slide1.jpg", "routine-slide2.jpg", "routine-slide3.jpg", "routine-slide4.jpg"]', '["instagram"]'),
        ('template-006', 'workspace-002', 'Post Testimonial', 'single', '["testimonial-template.jpg"]', '["facebook", "instagram", "linkedin"]'),
        -- Tech Templates
        ('template-007', 'workspace-003', 'Post Corporativo', 'single', '["corporate-template.jpg"]', '["linkedin", "twitter"]'),
        ('template-008', 'workspace-003', 'Carrusel Servicios', 'carousel', '["service-slide1.jpg", "service-slide2.jpg", "service-slide3.jpg"]', '["linkedin"]'),
        ('template-009', 'workspace-003', 'Post Innovación', 'single', '["innovation-template.jpg"]', '["linkedin", "twitter", "facebook"]'),
        -- Boutique Templates
        ('template-010', 'workspace-004', 'Post Colección', 'single', '["collection-template.jpg"]', '["instagram", "facebook"]'),
        ('template-011', 'workspace-004', 'Carrusel Looks', 'carousel', '["look-slide1.jpg", "look-slide2.jpg", "look-slide3.jpg"]', '["instagram"]'),
        -- Startup Templates
        ('template-012', 'workspace-startup-001', 'Post Sostenibilidad', 'single', '["sustainability-template.jpg"]', '["instagram", "facebook", "linkedin"]'),
        ('template-013', 'workspace-startup-002', 'Post Trabajo Remoto', 'single', '["remote-work-template.jpg"]', '["linkedin", "twitter"]'),
        -- Enterprise Templates
        ('template-014', 'workspace-enterprise-001', 'Post Financiero', 'single', '["finance-template.jpg"]', '["linkedin"]'),
        ('template-015', 'workspace-enterprise-002', 'Post Salud', 'single', '["health-template.jpg"]', '["facebook", "linkedin"]'),
        ('template-016', 'workspace-enterprise-003', 'Post Educativo', 'single', '["education-template.jpg"]', '["linkedin", "facebook"]')
    `
    ).run()

    // Create sample social accounts with realistic connection states
    db.prepare(
      `
      INSERT INTO social_accounts (id, workspace_id, platform, account_id, account_name, is_connected, connected_at, access_token, refresh_token, token_expires_at)
      VALUES 
        -- Restaurante Social Accounts
        ('social-001', 'workspace-001', 'facebook', 'fb_restaurante_123', 'Restaurante La Tradición', true, '2025-01-10 10:00:00', 'fb_access_token_123', 'fb_refresh_token_123', '2025-03-10 10:00:00'),
        ('social-002', 'workspace-001', 'instagram', 'ig_restaurante_123', '@restaurante_tradicion', true, '2025-01-10 10:05:00', 'ig_access_token_123', 'ig_refresh_token_123', '2025-03-10 10:05:00'),
        ('social-003', 'workspace-001', 'twitter', 'tw_restaurante_123', '@RestauranteTrad', false, null, null, null, null),
        -- Fitness Social Accounts
        ('social-004', 'workspace-002', 'instagram', 'ig_fitness_456', '@fitness_revolution', true, '2025-01-10 11:00:00', 'ig_access_token_456', 'ig_refresh_token_456', '2025-03-10 11:00:00'),
        ('social-005', 'workspace-002', 'facebook', 'fb_fitness_456', 'Fitness Revolution', true, '2025-01-10 11:05:00', 'fb_access_token_456', 'fb_refresh_token_456', '2025-03-10 11:05:00'),
        ('social-006', 'workspace-002', 'linkedin', 'li_fitness_456', 'Fitness Revolution', false, null, null, null, null),
        -- Tech Social Accounts
        ('social-007', 'workspace-003', 'linkedin', 'li_tech_789', 'TechSolutions Pro', true, '2025-01-10 12:00:00', 'li_access_token_789', 'li_refresh_token_789', '2025-03-10 12:00:00'),
        ('social-008', 'workspace-003', 'twitter', 'tw_tech_789', '@TechSolutionsPro', true, '2025-01-10 12:05:00', 'tw_access_token_789', 'tw_refresh_token_789', '2025-03-10 12:05:00'),
        ('social-009', 'workspace-003', 'facebook', 'fb_tech_789', 'TechSolutions Pro', false, null, null, null, null),
        -- Boutique Social Accounts
        ('social-010', 'workspace-004', 'instagram', 'ig_boutique_321', '@boutique_elegance', true, '2025-01-10 13:00:00', 'ig_access_token_321', 'ig_refresh_token_321', '2025-03-10 13:00:00'),
        ('social-011', 'workspace-004', 'facebook', 'fb_boutique_321', 'Boutique Elegance', false, null, null, null, null),
        -- Startup Social Accounts
        ('social-012', 'workspace-startup-001', 'instagram', 'ig_eco_111', '@ecofriendly_store', true, '2025-01-10 14:00:00', 'ig_access_token_111', 'ig_refresh_token_111', '2025-03-10 14:00:00'),
        ('social-013', 'workspace-startup-002', 'linkedin', 'li_nomad_222', 'Digital Nomad Hub', true, '2025-01-10 15:00:00', 'li_access_token_222', 'li_refresh_token_222', '2025-03-10 15:00:00'),
        -- Enterprise Social Accounts
        ('social-014', 'workspace-enterprise-001', 'linkedin', 'li_finance_001', 'Global Finance Corp', true, '2025-01-10 16:00:00', 'li_access_token_001', 'li_refresh_token_001', '2025-03-10 16:00:00'),
        ('social-015', 'workspace-enterprise-002', 'facebook', 'fb_health_002', 'Healthcare Innovation', true, '2025-01-10 17:00:00', 'fb_access_token_002', 'fb_refresh_token_002', '2025-03-10 17:00:00'),
        ('social-016', 'workspace-enterprise-003', 'linkedin', 'li_education_003', 'Education Excellence', false, null, null, null, null)
    `
    ).run()

    console.log('✓ Created 3 sample agencies (Demo, Startup, Enterprise)')
    console.log('✓ Created 8 users across different agencies and roles')
    console.log('✓ Created 9 workspaces with diverse branding')
    console.log('✓ Created 19 sample resources (images and videos)')
    console.log('✓ Created 16 templates for different use cases')
    console.log('✓ Created 16 social account connections with realistic states')
    console.log('✓ Basic seed data ready for development and testing')
  },
}
