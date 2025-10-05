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

    // Create comprehensive publication data with different states and dates
    db.prepare(
      `
      INSERT INTO publications (id, campaign_id, template_id, resource_id, social_network, content, image_url, scheduled_date, status, published_at, external_post_id)
      VALUES 
        -- Published Publications (Historical)
        ('pub-001', 'campaign-008', 'template-001', 'resource-001', 'facebook', '🎄 ¡Feliz Navidad! Disfruta de nuestro menú especial navideño en familia. Sabores tradicionales que crean recuerdos inolvidables. ¡Te esperamos! #NavidadFamiliar #MenuNavideño #RestauranteTradicion', '/api/resources/paella-valenciana.jpg', '2024-12-15 12:00:00', 'published', '2024-12-15 12:00:00', 'fb_post_12345'),
        ('pub-002', 'campaign-008', 'template-001', 'resource-002', 'instagram', '✨ Ambiente navideño mágico te espera. Ven a celebrar las fiestas con nosotros en un lugar lleno de calidez y tradición 🎅 #NavidadMagica #AmbienteAcogedor #CelebrarEnFamilia', '/api/resources/interior-restaurante.jpg', '2024-12-16 18:00:00', 'published', '2024-12-16 18:00:00', 'ig_post_67890'),
        ('pub-003', 'campaign-009', 'template-004', 'resource-005', 'instagram', '💪 ¡Noviembre de transformación! Cada día es una oportunidad para ser mejor. Tu cuerpo y mente te lo agradecerán 🔥 #NoviembreFit #TransformacionTotal #MotivacionDiaria', '/api/resources/functional-training.jpg', '2024-11-15 08:00:00', 'published', '2024-11-15 08:00:00', 'ig_post_11111'),
        ('pub-004', 'campaign-010', 'template-014', 'resource-017', 'linkedin', 'Cerramos 2024 con resultados excepcionales. Crecimiento del 25% y expansión a nuevos mercados. Gracias a nuestro equipo y clientes por hacer posible este éxito. #ResultadosAnuales #CrecimientoEmpresarial', '/api/resources/corporate-building.jpg', '2024-12-20 10:00:00', 'published', '2024-12-20 10:00:00', 'li_post_22222'),
        
        -- Scheduled Publications (Future)
        ('pub-005', 'campaign-001', 'template-001', 'resource-001', 'facebook', '🍽️ ¡Descubre nuestro menú especial de invierno! Platos calientes que abrazan el alma. Ingredientes frescos de temporada en cada bocado. ¡Ven y déjate conquistar! #MenuInvierno #SaboresDeTemporada #ExperienciaGastronomica', '/api/resources/paella-valenciana.jpg', '2025-01-16 12:00:00', 'scheduled', null, null),
        ('pub-006', 'campaign-001', 'template-001', 'resource-002', 'instagram', '❄️ El invierno sabe mejor en nuestro restaurante. Ambiente cálido, sabores únicos y momentos especiales te esperan ✨ #InviernoEspecial #AmbienteCálido #MomentosUnicos', '/api/resources/interior-restaurante.jpg', '2025-01-17 19:00:00', 'scheduled', null, null),
        ('pub-007', 'campaign-001', 'template-002', 'resource-003', 'instagram', '👨‍🍳 Nuestros chefs preparan cada plato con pasión y dedicación. El arte culinario cobra vida en cada creación del menú de invierno 🔥 #ChefApasionado #ArteCulinario #PasionPorCocinar', '/api/resources/chef-cooking.mp4', '2025-01-18 13:30:00', 'scheduled', null, null),
        ('pub-008', 'campaign-002', 'template-004', 'resource-005', 'instagram', '🚀 ¡2025 es TU año! Comienza con energía, determinación y la mejor actitud. Tu transformación fitness empieza HOY 💪 #2025EsTuAño #TransformacionFitness #EmpiezaHoy', '/api/resources/functional-training.jpg', '2025-01-16 07:00:00', 'scheduled', null, null),
        ('pub-009', 'campaign-002', 'template-005', 'resource-006', 'instagram', '🔥 Rutina de cardio que cambiará tu vida. Quema calorías, fortalece tu corazón y siente la energía corriendo por tus venas ⚡ #CardioIntensivo #QuemaCalorías #EnergíaPura', '/api/resources/cardio-routine.mp4', '2025-01-16 19:00:00', 'scheduled', null, null),
        ('pub-010', 'campaign-003', 'template-007', 'resource-009', 'linkedin', 'La transformación digital no es solo tecnología, es evolución empresarial. Nuestros servicios de cloud computing impulsan el crecimiento de tu negocio hacia el futuro. #TransformacionDigital #CloudComputing #InnovacionEmpresarial', '/api/resources/modern-office.jpg', '2025-01-21 10:00:00', 'scheduled', null, null),
        ('pub-011', 'campaign-003', 'template-007', 'resource-010', 'twitter', '☁️ Cloud computing que potencia tu empresa. Escalabilidad, seguridad y eficiencia en una sola solución. El futuro es ahora. #CloudComputing #TechSolutions #Innovacion', '/api/resources/team-coding.jpg', '2025-01-22 15:00:00', 'scheduled', null, null),
        ('pub-012', 'campaign-004', 'template-010', 'resource-012', 'instagram', '🌸 Primavera-Verano 2025 ya está aquí. Colores vibrantes, diseños únicos y el estilo que define tu personalidad. ¡Descubre la colección! ✨ #PrimaveraVerano2025 #ColoresVibrantes #EstiloUnico', '/api/resources/spring-collection.jpg', '2025-02-02 11:00:00', 'scheduled', null, null),
        ('pub-013', 'campaign-004', 'template-011', 'resource-013', 'instagram', '👗 El desfile que marca tendencia. Cada prenda cuenta una historia, cada look inspira confianza. La moda es arte en movimiento 🎨 #DefileModa #TendenciasModa #ArteEnMovimiento', '/api/resources/fashion-show.mp4', '2025-02-03 16:00:00', 'scheduled', null, null),
        
        -- Failed Publications (for testing error scenarios)
        ('pub-014', 'campaign-001', 'template-001', 'resource-004', 'facebook', '🌙 Noches especiales en nuestra terraza. El menú de invierno bajo las estrellas, una experiencia gastronómica única que recordarás siempre ⭐ #NochesEspeciales #TerrazaEstrellada #ExperienciaUnica', '/api/resources/terraza-noche.jpg', '2025-01-15 20:00:00', 'failed', null, null),
        ('pub-015', 'campaign-002', 'template-004', 'resource-007', 'facebook', '🏋️‍♀️ Instalaciones de última generación para tu entrenamiento. Tecnología y comodidad se unen para ofrecerte la mejor experiencia fitness 🚀 #InstalacionesModernas #TecnologiaFitness #ExperienciaUnica', '/api/resources/gym-facilities.jpg', '2025-01-15 09:00:00', 'failed', null, null),
        
        -- Cancelled Publications
        ('pub-016', 'campaign-003', 'template-008', 'resource-011', 'linkedin', 'Demo interactiva de nuestras soluciones cloud. Descubre cómo la tecnología puede transformar tu modelo de negocio en tiempo real. #DemoInteractiva #SolucionesCloud #TransformacionTecnologica', '/api/resources/product-demo.mp4', '2025-01-20 14:00:00', 'cancelled', null, null),
        
        -- More scheduled publications for calendar testing
        ('pub-017', 'campaign-001', 'template-002', 'resource-001', 'facebook', '🥘 Cada plato del menú de invierno es una obra maestra culinaria. Sabores que abrazan, texturas que sorprenden, experiencias que perduran 👨‍🍳 #ObraMaestraCulinaria #SaboresQueAbrazan #ExperienciasCulinarias', '/api/resources/paella-valenciana.jpg', '2025-01-19 13:00:00', 'scheduled', null, null),
        ('pub-018', 'campaign-002', 'template-006', 'resource-008', 'facebook', '👥 Únete a nuestra comunidad fitness. Entrenamientos grupales que motivan, compañeros que inspiran, resultados que transforman vidas 💪 #ComunidadFitness #EntrenamientoGrupal #TransformaVidas', '/api/resources/group-class.jpg', '2025-01-20 18:00:00', 'scheduled', null, null),
        ('pub-019', 'campaign-003', 'template-009', 'resource-009', 'twitter', '🚀 Innovación que impulsa el crecimiento empresarial. Nuestras soluciones tecnológicas abren nuevas posibilidades para tu negocio #InnovacionEmpresarial #SolucionesTech #CrecimientoDigital', '/api/resources/modern-office.jpg', '2025-01-23 11:30:00', 'scheduled', null, null),
        ('pub-020', 'campaign-004', 'template-010', 'resource-014', 'facebook', '🛍️ Nuestra boutique es más que una tienda, es un espacio donde el estilo cobra vida. Ven y descubre piezas únicas que reflejan tu personalidad ✨ #BoutiqueUnica #EstiloPersonal #PiezasUnicas', '/api/resources/store-interior.jpg', '2025-02-04 12:00:00', 'scheduled', null, null)
    `
    ).run()

    // Update error messages for failed publications
    db.prepare(
      `
      UPDATE publications 
      SET error_message = CASE id
        WHEN 'pub-014' THEN 'Error de conexión con Facebook API. Token de acceso expirado.'
        WHEN 'pub-015' THEN 'Límite de publicaciones diarias alcanzado en Facebook.'
        ELSE error_message
      END
      WHERE status = 'failed'
    `
    ).run()

    console.log(
      '✓ Created 12 campaigns in different states (active, draft, completed, paused)'
    )
    console.log('✓ Created comprehensive campaign-resource relationships')
    console.log('✓ Created campaign-template relationships')
    console.log('✓ Created 20 publications with varied states:')
    console.log('  - 4 published (historical data)')
    console.log('  - 14 scheduled (future publications)')
    console.log('  - 2 failed (error scenarios)')
    console.log('  - 1 cancelled')
    console.log(
      '✓ Campaign and publication data ready for comprehensive testing'
    )
  },
}
