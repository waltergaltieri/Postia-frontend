import { Seed } from './index'

export const campaignDataSeed: Seed = {
  name: 'campaign_data',
  description:
    'Create comprehensive campaign and publication data for testing different scenarios',

  run: db => {
    // Create campaigns in different states with varied configurations
    db.prepare(
      `
      INSERT INTO campaigns (id, workspace_id, name, objective, start_date, end_date, social_networks, interval_hours, content_type, optimization_settings, prompt, status)
      VALUES 
        -- Active Campaigns
        ('campaign-001', 'workspace-001', 'Promoción Menú Especial Invierno', 'Aumentar ventas del menú especial de temporada invernal', '2025-01-15', '2025-02-15', '["facebook", "instagram"]', 24, 'optimized', '{"facebook": {"tone": "casual", "hashtags": true}, "instagram": {"tone": "inspirational", "hashtags": true}}', 'Crea contenido atractivo para promocionar nuestro menú especial de invierno, destacando ingredientes frescos de temporada, platos calientes reconfortantes y la experiencia gastronómica única de nuestro restaurante familiar', 'active'),
        ('campaign-002', 'workspace-002', 'Motivación Año Nuevo 2025', 'Motivar a nuevos miembros en enero y retener existentes', '2025-01-01', '2025-01-31', '["instagram", "facebook"]', 12, 'unified', null, 'Genera contenido motivacional para enero 2025, enfocado en objetivos fitness, vida saludable, superación personal y la importancia de mantener constancia en el ejercicio', 'active'),
        ('campaign-003', 'workspace-003', 'Lanzamiento Servicios Cloud', 'Promocionar nuevos servicios de cloud computing', '2025-01-20', '2025-03-20', '["linkedin", "twitter"]', 48, 'optimized', '{"linkedin": {"tone": "professional", "hashtags": false}, "twitter": {"tone": "informative", "hashtags": true}}', 'Crea contenido profesional sobre nuestros nuevos servicios de cloud computing, transformación digital, seguridad en la nube y casos de éxito empresariales', 'active'),
        ('campaign-004', 'workspace-004', 'Colección Primavera-Verano 2025', 'Lanzar nueva colección de moda primavera-verano', '2025-02-01', '2025-04-30', '["instagram", "facebook"]', 18, 'optimized', '{"instagram": {"tone": "trendy", "hashtags": true}, "facebook": {"tone": "elegant", "hashtags": false}}', 'Promociona nuestra nueva colección primavera-verano 2025, destacando tendencias, colores vibrantes, versatilidad de las prendas y el estilo único de nuestra boutique', 'active'),
        
        -- Draft Campaigns
        ('campaign-005', 'workspace-001', 'Día de San Valentín Romántico', 'Crear ambiente romántico para parejas en San Valentín', '2025-02-10', '2025-02-16', '["facebook", "instagram"]', 12, 'unified', null, 'Crea contenido romántico para San Valentín, destacando nuestro ambiente íntimo, menú especial para parejas y la experiencia perfecta para celebrar el amor', 'draft'),
        ('campaign-006', 'workspace-002', 'Desafío Fitness 30 Días', 'Lanzar desafío fitness de 30 días para marzo', '2025-03-01', '2025-03-31', '["instagram", "facebook", "linkedin"]', 24, 'optimized', '{"instagram": {"tone": "motivational", "hashtags": true}, "facebook": {"tone": "community", "hashtags": true}, "linkedin": {"tone": "wellness", "hashtags": false}}', 'Promociona nuestro desafío fitness de 30 días, enfocado en transformación corporal, hábitos saludables, comunidad de apoyo y resultados medibles', 'draft'),
        ('campaign-007', 'workspace-startup-001', 'Mes de la Sostenibilidad', 'Promover productos ecológicos durante marzo', '2025-03-01', '2025-03-31', '["instagram", "facebook", "linkedin"]', 36, 'unified', null, 'Crea contenido sobre sostenibilidad, productos ecológicos, impacto ambiental positivo y estilo de vida consciente con el planeta', 'draft'),
        
        -- Completed Campaigns (Historical Data)
        ('campaign-008', 'workspace-001', 'Navidad Familiar 2024', 'Promoción navideña diciembre 2024', '2024-12-01', '2024-12-31', '["facebook", "instagram"]', 24, 'optimized', '{"facebook": {"tone": "festive", "hashtags": true}, "instagram": {"tone": "warm", "hashtags": true}}', 'Contenido navideño familiar, menú especial de fiestas, ambiente acogedor y celebraciones memorables', 'completed'),
        ('campaign-009', 'workspace-002', 'Reto Noviembre Fit', 'Desafío fitness noviembre 2024', '2024-11-01', '2024-11-30', '["instagram", "facebook"]', 12, 'unified', null, 'Contenido motivacional para noviembre, preparación física para fiestas y mantenimiento de rutinas', 'completed'),
        ('campaign-010', 'workspace-enterprise-001', 'Reporte Anual 2024', 'Comunicar resultados anuales 2024', '2024-12-15', '2024-12-31', '["linkedin"]', 72, 'optimized', '{"linkedin": {"tone": "corporate", "hashtags": false}}', 'Contenido corporativo sobre resultados anuales, logros empresariales y perspectivas futuras', 'completed'),
        
        -- Paused Campaigns
        ('campaign-011', 'workspace-003', 'Webinar Series Tech', 'Serie de webinars técnicos pausada temporalmente', '2025-01-10', '2025-03-10', '["linkedin", "twitter"]', 168, 'optimized', '{"linkedin": {"tone": "educational", "hashtags": false}, "twitter": {"tone": "informative", "hashtags": true}}', 'Promociona serie de webinars técnicos sobre desarrollo de software, mejores prácticas y tendencias tecnológicas', 'paused'),
        ('campaign-012', 'workspace-startup-002', 'Comunidad Nómadas', 'Construcción de comunidad de nómadas digitales', '2025-01-15', '2025-04-15', '["linkedin", "twitter", "facebook"]', 48, 'unified', null, 'Contenido sobre trabajo remoto, comunidad de nómadas digitales, herramientas de productividad y estilo de vida location-independent', 'paused')
    `
    ).run()

    // Link campaigns with resources (many-to-many relationships)
    db.prepare(
      `
      INSERT INTO campaign_resources (campaign_id, resource_id)
      VALUES 
        -- Campaign 001 (Restaurante Menú Invierno)
        ('campaign-001', 'resource-001'),
        ('campaign-001', 'resource-002'),
        ('campaign-001', 'resource-003'),
        ('campaign-001', 'resource-004'),
        -- Campaign 002 (Fitness Motivación)
        ('campaign-002', 'resource-005'),
        ('campaign-002', 'resource-006'),
        ('campaign-002', 'resource-007'),
        ('campaign-002', 'resource-008'),
        -- Campaign 003 (Tech Cloud)
        ('campaign-003', 'resource-009'),
        ('campaign-003', 'resource-010'),
        ('campaign-003', 'resource-011'),
        -- Campaign 004 (Boutique Primavera)
        ('campaign-004', 'resource-012'),
        ('campaign-004', 'resource-013'),
        ('campaign-004', 'resource-014'),
        -- Campaign 005 (San Valentín)
        ('campaign-005', 'resource-001'),
        ('campaign-005', 'resource-004'),
        -- Campaign 006 (Desafío Fitness)
        ('campaign-006', 'resource-005'),
        ('campaign-006', 'resource-007'),
        ('campaign-006', 'resource-008'),
        -- Campaign 007 (Sostenibilidad)
        ('campaign-007', 'resource-015'),
        -- Campaign 008 (Navidad Histórica)
        ('campaign-008', 'resource-001'),
        ('campaign-008', 'resource-002'),
        -- Campaign 009 (Fitness Histórico)
        ('campaign-009', 'resource-005'),
        ('campaign-009', 'resource-007'),
        -- Campaign 010 (Enterprise Reporte)
        ('campaign-010', 'resource-017'),
        -- Campaign 011 (Tech Webinar)
        ('campaign-011', 'resource-009'),
        ('campaign-011', 'resource-010'),
        -- Campaign 012 (Nómadas)
        ('campaign-012', 'resource-016')
    `
    ).run()

    // Link campaigns with templates
    db.prepare(
      `
      INSERT INTO campaign_templates (campaign_id, template_id)
      VALUES 
        -- Active campaigns
        ('campaign-001', 'template-001'),
        ('campaign-001', 'template-002'),
        ('campaign-002', 'template-004'),
        ('campaign-002', 'template-005'),
        ('campaign-003', 'template-007'),
        ('campaign-003', 'template-008'),
        ('campaign-004', 'template-010'),
        ('campaign-004', 'template-011'),
        -- Draft campaigns
        ('campaign-005', 'template-001'),
        ('campaign-006', 'template-004'),
        ('campaign-006', 'template-006'),
        ('campaign-007', 'template-012'),
        -- Historical campaigns
        ('campaign-008', 'template-001'),
        ('campaign-009', 'template-004'),
        ('campaign-010', 'template-014'),
        -- Paused campaigns
        ('campaign-011', 'template-007'),
        ('campaign-012', 'template-013')
    `
    ).run()

    // No publication data - calendar will be empty for real data usage

    console.log(
      '✓ Created 12 campaigns in different states (active, draft, completed, paused)'
    )
    console.log('✓ Created comprehensive campaign-resource relationships')
    console.log('✓ Created campaign-template relationships')
    console.log('✓ No publication data created - calendar ready for real data')
    console.log(
      '✓ Campaign structure ready for real publication generation'
    )
  },
}
