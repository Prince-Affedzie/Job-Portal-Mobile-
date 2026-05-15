// data/services.js
// ─── Flat suggestions list (used in SearchTaskersScreen + quick-search) ───────
export const SERVICE_SUGGESTIONS = [
  // Home & Maintenance
  'Plumbing', 'Electrical Repairs', 'Carpentry', 'Painting', 'Masonry',
  'Welding', 'Roofing', 'Air Conditioning', 'Fumigation', 'General Cleaning',
  'Laundry & Ironing', 'Home Renovation', 'CCTV Installation', 'Home Security',
  'Home Appliance Repair', 'HVAC Installation', 'Waterproofing', 'Tiling',
  'Interior Plastering', 'Gutter Cleaning',

  // Digital & Tech
  'Web Development', 'Mobile App Development', 'Software Engineering',
  'UI/UX Design', 'IT Support', 'Network Administration', 'Cybersecurity',
  'Cloud Computing', 'Data Analysis', 'AI & Machine Learning',
  'SEO & SEM', 'Social Media Management', 'Digital Marketing',
  'Email Marketing', 'E-commerce Setup', 'WordPress Development',

  // Creative & Design
  'Graphic Design', 'Logo Design', 'Brand Identity', 'Illustration',
  'Motion Graphics', 'Animation', 'Video Editing', 'Photo Editing',
  'Photography', 'Videography', 'Drone Photography', 'Product Photography',
  '3D Modeling', 'Interior Design', 'Architectural Design', 'Fashion Design',
  'Packaging Design', 'Print Design',

  // Business & Professional
  'Accounting & Bookkeeping', 'Tax Filing', 'Business Plan Writing',
  'Legal Consultation', 'Virtual Assistance', 'Data Entry',
  'HR & Recruitment', 'Market Research', 'Project Management',
  'Business Registration', 'Notary Services', 'Translation Services',
  'Transcription', 'Copywriting', 'Content Writing', 'Proofreading',

  // Beauty & Wellness
  'Hair Styling & Braiding', 'Makeup Artistry', 'Nail Technician',
  'Massage & Spa', 'Barbering', 'Skincare & Facials', 'Waxing & Threading',
  'Lash Extensions', 'Personal Training', 'Yoga Instruction',
  'Nutrition Consulting', 'Life Coaching', 'Mental Health Counselling',

  // Events & Hospitality
  'Event Planning', 'Wedding Planning', 'Catering', 'Decoration & Decor',
  'MC & Hosting', 'DJ Services', 'Live Band', 'Event Photography',
  'Event Videography', 'Tent & Chair Rental', 'Ushering Services',
  'Cake & Pastry', 'Bar Services',

  // Education & Training
  'Private Tutoring', 'Language Lessons', 'Driving Lessons',
  'Music Lessons', 'Art Classes', 'Coding Bootcamp', 'CV & Career Coaching',
  'IELTS & TOEFL Prep', 'Corporate Training',

  // Fashion & Tailoring
  'Tailoring & Sewing', 'Shoe Making & Repair', 'Bag Making',
  'Alterations & Mending', 'Embroidery', 'Bead Work',

  // Logistics & Transport
  'Delivery & Dispatch', 'Moving & Packing', 'Errands & Shopping',
  'Airport Pickup', 'Car Hire & Chauffeur',

  // Automotive
  'Auto Mechanic', 'Car Wash & Detailing', 'Tyre Repair',
  'Car Painting', 'Auto Electrical', 'Panel Beating',

  // Agriculture & Environment
  'Gardening & Landscaping', 'Farm Labour', 'Crop Spraying',
  'Tree Cutting', 'Waste Collection',

  // Health & Care
  'Home Nursing', 'Elderly Care', 'Childcare & Babysitting',
  'Physiotherapy', 'Errand & Prescription Pickup',

  // Pets
  'Pet Grooming', 'Dog Walking', 'Veterinary Home Visit', 'Pet Sitting',

  // Food & Catering
  'Personal Chef', 'Meal Prep', 'Baking & Pastry', 'Cooking Lessons',
];

// ─── Full catalogue (used in ServiceModal suggestions) ────────────────────────
export const SERVICES_CATALOGUE = [

  // ── 1. Home Maintenance ────────────────────────────────────────────────────
  {
    category: 'Home Maintenance',
    icon: 'home-outline',
    subServices: [
      {
        name: 'Plumbing',
        tags: ['leaking pipe', 'sink repair', 'toilet installation', 'borehole', 'polytank', 'water heater', 'drain unblocking', 'bathroom fitting'],
      },
      {
        name: 'Electrical Repairs',
        tags: ['wiring', 'fan installation', 'meter issues', 'sockets', 'lighting', 'circuit breaker', 'generator wiring', 'earthing'],
      },
      {
        name: 'Air Conditioning',
        tags: ['ac repair', 'gas top-up', 'installation', 'cleaning', 'split unit', 'inverter ac', 'duct cleaning'],
      },
      {
        name: 'Home Appliance Repair',
        tags: ['washing machine', 'fridge repair', 'microwave', 'gas cooker', 'iron', 'water dispenser', 'tv repair'],
      },
      {
        name: 'CCTV Installation',
        tags: ['security camera', 'cctv setup', 'nvr', 'dvr', 'access control', 'alarm system', 'intercom'],
      },
      {
        name: 'Waterproofing',
        tags: ['roof leak', 'damp proofing', 'sealing', 'terrace waterproofing', 'basement', 'crack filling'],
      },
      {
        name: 'Painting',
        tags: ['interior painting', 'exterior painting', 'wall painting', 'ceiling', 'gloss', 'emulsion', 'texture coating', 'graffiti removal'],
      },
      {
        name: 'Gutter Cleaning',
        tags: ['gutters', 'downpipe', 'drainage', 'roof cleaning', 'moss removal'],
      },
      {
        name: 'HVAC Installation',
        tags: ['ventilation', 'exhaust fan', 'duct installation', 'ceiling fan', 'heater installation'],
      },
      {
        name: 'Home Renovation',
        tags: ['refurbishment', 'remodelling', 'extension', 'upgrade', 'space conversion', 'false ceiling', 'partition wall'],
      },
    ],
  },

  // ── 2. Construction & Trades ───────────────────────────────────────────────
  {
    category: 'Construction & Trades',
    icon: 'construct-outline',
    subServices: [
      {
        name: 'Masonry',
        tags: ['plastering', 'tiling', 'blocks', 'foundation', 'brickwork', 'screeding', 'terrazzo', 'stone work'],
      },
      {
        name: 'Carpentry',
        tags: ['roofing', 'furniture making', 'doors', 'cabinets', 'wardrobe', 'decking', 'wood flooring', 'ceiling boards'],
      },
      {
        name: 'Welding',
        tags: ['burglar proof', 'gates', 'metal frames', 'tank stands', 'steel door', 'grilles', 'railings', 'fence fabrication'],
      },
      {
        name: 'Roofing',
        tags: ['roof sheets', 'aluminium roofing', 'roof repair', 'gutter installation', 'fascia boards', 'skylight'],
      },
      {
        name: 'Tiling',
        tags: ['floor tiles', 'wall tiles', 'bathroom tiles', 'kitchen backsplash', 'grouting', 'tile removal'],
      },
      {
        name: 'Interior Plastering',
        tags: ['smooth finish', 'rough cast', 'skim coat', 'gypsum board', 'cornice', 'decorative plaster'],
      },
      {
        name: 'Glass & Aluminium Works',
        tags: ['sliding doors', 'louvre blades', 'curtain walling', 'shop fronts', 'glass partitions', 'mirrors', 'windows'],
      },
      {
        name: 'Landscaping',
        tags: ['lawn design', 'retaining walls', 'paving', 'driveways', 'drainage', 'outdoor lighting', 'garden path'],
      },
    ],
  },

  // ── 3. Cleaning & Domestic ─────────────────────────────────────────────────
  {
    category: 'Cleaning & Domestic',
    icon: 'brush-outline',
    subServices: [
      {
        name: 'General Cleaning',
        tags: ['home cleaning', 'office cleaning', 'window cleaning', 'post-construction cleaning', 'deep cleaning', 'move-in cleaning'],
      },
      {
        name: 'Laundry & Ironing',
        tags: ['washing', 'dry cleaning', 'ironing', 'folding', 'curtain cleaning', 'duvet washing'],
      },
      {
        name: 'Fumigation',
        tags: ['pest control', 'bed bugs', 'cockroaches', 'mosquitoes', 'termites', 'rodents', 'ants', 'spray'],
      },
      {
        name: 'Carpet & Upholstery Cleaning',
        tags: ['carpet washing', 'sofa cleaning', 'mattress cleaning', 'steam cleaning', 'stain removal'],
      },
      {
        name: 'Childcare & Babysitting',
        tags: ['babysitter', 'nanny', 'creche', 'after school', 'infant care', 'homework help'],
      },
      {
        name: 'Elderly Care',
        tags: ['senior care', 'companion', 'home aide', 'medication reminder', 'mobility assistance'],
      },
    ],
  },

  // ── 4. Digital & Technology ────────────────────────────────────────────────
  {
    category: 'Digital & Technology',
    icon: 'code-slash-outline',
    subServices: [
      {
        name: 'Web Development',
        tags: ['website', 'react', 'wordpress', 'e-commerce', 'landing page', 'html css', 'next.js', 'shopify', 'web app'],
      },
      {
        name: 'Mobile App Development',
        tags: ['react native', 'flutter', 'android', 'ios', 'expo', 'app design', 'play store', 'app store'],
      },
      {
        name: 'Software Engineering',
        tags: ['backend', 'api', 'node.js', 'python', 'database', 'microservices', 'devops', 'automation'],
      },
      {
        name: 'UI/UX Design',
        tags: ['figma', 'wireframe', 'prototyping', 'user research', 'app design', 'dashboard', 'design system'],
      },
      {
        name: 'IT Support',
        tags: ['laptop repair', 'software install', 'networking', 'cctv', 'virus removal', 'data recovery', 'printer setup'],
      },
      {
        name: 'Network Administration',
        tags: ['wifi setup', 'router', 'lan', 'firewall', 'vpn', 'server setup', 'network security'],
      },
      {
        name: 'Cybersecurity',
        tags: ['penetration testing', 'ethical hacking', 'security audit', 'vulnerability assessment', 'firewall'],
      },
      {
        name: 'Cloud Computing',
        tags: ['aws', 'google cloud', 'azure', 'server migration', 'cloud backup', 'hosting', 'deployment'],
      },
      {
        name: 'Data Analysis',
        tags: ['excel', 'power bi', 'tableau', 'python', 'sql', 'reporting', 'dashboards', 'statistics'],
      },
      {
        name: 'AI & Machine Learning',
        tags: ['chatbot', 'model training', 'nlp', 'computer vision', 'tensorflow', 'data science', 'automation'],
      },
      {
        name: 'E-commerce Setup',
        tags: ['shopify', 'woocommerce', 'product listing', 'payment gateway', 'online store', 'inventory management'],
      },
      {
        name: 'SEO & SEM',
        tags: ['search ranking', 'google ads', 'keyword research', 'backlinks', 'on-page seo', 'analytics', 'ppc'],
      },
    ],
  },

  // ── 5. Creative & Design ───────────────────────────────────────────────────
  {
    category: 'Creative & Design',
    icon: 'color-palette-outline',
    subServices: [
      {
        name: 'Graphic Design',
        tags: ['logo', 'flyer', 'branding', 'social media graphics', 'banners', 'poster', 'invitation card', 'certificate'],
      },
      {
        name: 'Logo Design',
        tags: ['brand mark', 'wordmark', 'icon design', 'vector logo', 'rebranding', 'logo refresh'],
      },
      {
        name: 'Brand Identity',
        tags: ['brand guidelines', 'colour palette', 'typography', 'stationery design', 'business card', 'letterhead'],
      },
      {
        name: 'Illustration',
        tags: ['digital art', 'character design', 'comic', 'book cover', 'children illustration', 'infographic'],
      },
      {
        name: 'Motion Graphics',
        tags: ['animated logo', 'explainer video', 'lower thirds', 'after effects', 'kinetic typography', 'intro outro'],
      },
      {
        name: 'Animation',
        tags: ['2d animation', '3d animation', 'whiteboard animation', 'cartoon', 'product animation'],
      },
      {
        name: '3D Modeling',
        tags: ['blender', 'architectural render', 'product visualization', '3d printing', 'cad design'],
      },
      {
        name: 'Interior Design',
        tags: ['space planning', 'mood board', 'furniture layout', 'colour scheme', 'renovation design', 'office interior'],
      },
      {
        name: 'Architectural Design',
        tags: ['floor plans', 'building plans', 'autocad', 'revit', 'structural drawing', 'site plan', 'permit drawing'],
      },
      {
        name: 'Packaging Design',
        tags: ['product label', 'box design', 'sachet design', 'dieline', 'mockup', 'retail packaging'],
      },
      {
        name: 'Print Design',
        tags: ['banner', 'billboard', 'brochure', 'magazine layout', 'catalogue', 'roll-up banner'],
      },
      {
        name: 'Fashion Design',
        tags: ['sketching', 'pattern making', 'fabric selection', 'collection design', 'costume design'],
      },
    ],
  },

  // ── 6. Photography & Video ─────────────────────────────────────────────────
  {
    category: 'Photography & Video',
    icon: 'camera-outline',
    subServices: [
      {
        name: 'Photography',
        tags: ['portrait', 'event photography', 'product shoot', 'real estate', 'headshot', 'family shoot', 'graduation'],
      },
      {
        name: 'Videography',
        tags: ['event coverage', 'wedding video', 'corporate video', 'documentary', 'music video', 'short film'],
      },
      {
        name: 'Drone Photography',
        tags: ['aerial photography', 'drone video', 'land survey', 'real estate aerial', 'event aerial', 'mapping'],
      },
      {
        name: 'Video Editing',
        tags: ['premiere pro', 'final cut', 'colour grading', 'subtitles', 'reel editing', 'youtube editing', 'reels'],
      },
      {
        name: 'Photo Editing',
        tags: ['retouching', 'background removal', 'colour correction', 'photoshop', 'lightroom', 'product editing'],
      },
      {
        name: 'Product Photography',
        tags: ['white background', 'lifestyle shoot', 'e-commerce photos', 'flat lay', 'food photography'],
      },
    ],
  },

  // ── 7. Digital Marketing & Business ───────────────────────────────────────
  {
    category: 'Digital Marketing & Business',
    icon: 'trending-up-outline',
    subServices: [
      {
        name: 'Digital Marketing',
        tags: ['facebook ads', 'instagram ads', 'google ads', 'tiktok ads', 'paid campaigns', 'growth hacking'],
      },
      {
        name: 'Social Media Management',
        tags: ['content calendar', 'posting', 'community management', 'instagram', 'twitter x', 'tiktok', 'linkedin'],
      },
      {
        name: 'Content Writing',
        tags: ['blog posts', 'articles', 'website copy', 'product descriptions', 'press release', 'newsletter'],
      },
      {
        name: 'Copywriting',
        tags: ['sales copy', 'ad copy', 'email copy', 'landing page copy', 'taglines', 'scripts'],
      },
      {
        name: 'Email Marketing',
        tags: ['mailchimp', 'newsletter', 'drip campaign', 'list building', 'automation', 'klaviyo'],
      },
      {
        name: 'Virtual Assistance',
        tags: ['data entry', 'scheduling', 'email management', 'transcription', 'research', 'admin support'],
      },
      {
        name: 'Accounting & Bookkeeping',
        tags: ['quickbooks', 'financial statements', 'payroll', 'tax returns', 'invoicing', 'vat filing', 'budgeting'],
      },
      {
        name: 'Business Plan Writing',
        tags: ['startup plan', 'investor pitch', 'financial projections', 'market analysis', 'feasibility study'],
      },
      {
        name: 'Market Research',
        tags: ['surveys', 'competitor analysis', 'consumer insights', 'industry report', 'focus groups'],
      },
      {
        name: 'HR & Recruitment',
        tags: ['hiring', 'job posting', 'cv screening', 'onboarding', 'hr policy', 'payroll'],
      },
      {
        name: 'Legal Consultation',
        tags: ['contract review', 'business registration', 'trademark', 'employment law', 'property law', 'notary'],
      },
      {
        name: 'Translation Services',
        tags: ['twi', 'french', 'english', 'hausa', 'arabic', 'ga', 'document translation', 'interpretation'],
      },
      {
        name: 'Proofreading & Editing',
        tags: ['grammar check', 'academic editing', 'thesis', 'manuscript', 'report editing'],
      },
    ],
  },

  // ── 8. Beauty & Wellness ───────────────────────────────────────────────────
  {
    category: 'Beauty & Wellness',
    icon: 'sparkles-outline',
    subServices: [
      {
        name: 'Hair Styling & Braiding',
        tags: ['braider', 'knotless braids', 'weaving', 'dreadlocks', 'hair washing', 'wig making', 'natural hair', 'relaxer'],
      },
      {
        name: 'Makeup Artistry',
        tags: ['bridal makeup', 'editorial', 'gele tying', 'contouring', 'airbrush makeup', 'party makeup'],
      },
      {
        name: 'Nail Technician',
        tags: ['pedicure', 'manicure', 'acrylic nails', 'gel polish', 'nail art', 'ombre nails', 'nail extensions'],
      },
      {
        name: 'Massage & Spa',
        tags: ['deep tissue', 'aromatherapy', 'swedish massage', 'facial', 'body scrub', 'hot stone', 'reflexology'],
      },
      {
        name: 'Barbering',
        tags: ['haircut', 'shave', 'beard trim', 'fade', 'skin fade', 'low cut', 'waves'],
      },
      {
        name: 'Skincare & Facials',
        tags: ['facial treatment', 'acne care', 'hyperpigmentation', 'chemical peel', 'microdermabrasion', 'toning'],
      },
      {
        name: 'Waxing & Threading',
        tags: ['eyebrow threading', 'body waxing', 'upper lip', 'underarm', 'leg waxing', 'sugaring'],
      },
      {
        name: 'Lash Extensions',
        tags: ['classic lashes', 'volume lashes', 'hybrid lashes', 'lash lift', 'lash tinting'],
      },
      {
        name: 'Personal Training',
        tags: ['weight loss', 'muscle building', 'home workout', 'gym training', 'cardio', 'hiit', 'fitness plan'],
      },
      {
        name: 'Yoga Instruction',
        tags: ['hatha yoga', 'vinyasa', 'meditation', 'flexibility', 'mindfulness', 'prenatal yoga'],
      },
      {
        name: 'Nutrition Consulting',
        tags: ['meal plan', 'diet advice', 'weight management', 'sports nutrition', 'diabetes diet', 'detox'],
      },
      {
        name: 'Life Coaching',
        tags: ['goal setting', 'motivation', 'career coaching', 'mindset coaching', 'confidence building'],
      },
    ],
  },

  // ── 9. Events & Hospitality ────────────────────────────────────────────────
  {
    category: 'Events & Hospitality',
    icon: 'balloon-outline',
    subServices: [
      {
        name: 'Event Planning',
        tags: ['birthday party', 'conference', 'product launch', 'anniversary', 'corporate event', 'outdoor event'],
      },
      {
        name: 'Wedding Planning',
        tags: ['full planning', 'day-of coordination', 'budget planning', 'vendor sourcing', 'destination wedding'],
      },
      {
        name: 'Catering',
        tags: ['buffet', 'jollof rice', 'waiter service', 'corporate catering', 'cocktail reception', 'chop bar'],
      },
      {
        name: 'Event Decoration & Decor',
        tags: ['balloons', 'floral arrangements', 'table setting', 'stage setup', 'backdrop', 'centrepiece'],
      },
      {
        name: 'DJ Services',
        tags: ['sound system', 'music mixing', 'mc', 'pa system', 'club dj', 'wedding dj', 'karaoke'],
      },
      {
        name: 'MC & Hosting',
        tags: ['bilingual mc', 'corporate host', 'awards night', 'wedding mc', 'show host', 'moderator'],
      },
      {
        name: 'Ushering Services',
        tags: ['event ushers', 'protocol', 'guest registration', 'vip management', 'crowd control'],
      },
      {
        name: 'Cake & Pastry',
        tags: ['wedding cake', 'birthday cake', 'cupcakes', 'custom cake', 'pastries', 'dessert table'],
      },
      {
        name: 'Tent & Chair Rental',
        tags: ['marquee hire', 'canopy', 'chairs tables', 'event furniture', 'dance floor', 'lighting rig'],
      },
      {
        name: 'Live Band',
        tags: ['highlife band', 'gospel band', 'jazz', 'afrobeats', 'brass band', 'live music', 'choir'],
      },
    ],
  },

  // ── 10. Education & Training ───────────────────────────────────────────────
  {
    category: 'Education & Training',
    icon: 'book-outline',
    subServices: [
      {
        name: 'Private Tutoring',
        tags: ['maths', 'science', 'bece prep', 'wassce prep', 'primary school', 'jhs', 'shs', 'physics', 'chemistry'],
      },
      {
        name: 'Language Lessons',
        tags: ['twi', 'french', 'english', 'ga', 'hausa', 'mandarin', 'arabic', 'translation', 'accent reduction'],
      },
      {
        name: 'Music Lessons',
        tags: ['piano', 'guitar', 'drums', 'singing', 'music theory', 'voice training', 'keyboard'],
      },
      {
        name: 'Art Classes',
        tags: ['drawing', 'painting', 'sketching', 'pottery', 'sculpture', 'mixed media', 'kids art'],
      },
      {
        name: 'Coding & Tech Training',
        tags: ['programming', 'web development', 'python', 'excel', 'data entry', 'canva', 'microsoft office'],
      },
      {
        name: 'Driving Lessons',
        tags: ['beginner driving', 'manual', 'automatic', 'DVLA test prep', 'defensive driving', 'reverse parking'],
      },
      {
        name: 'IELTS & TOEFL Prep',
        tags: ['ielts coaching', 'toefl', 'english proficiency', 'speaking', 'writing', 'listening', 'reading'],
      },
      {
        name: 'CV & Career Coaching',
        tags: ['resume writing', 'linkedin profile', 'job search', 'interview prep', 'cover letter', 'career pivot'],
      },
      {
        name: 'Corporate Training',
        tags: ['leadership', 'sales training', 'team building', 'customer service', 'communication skills', 'workshop'],
      },
    ],
  },

  // ── 11. Fashion & Tailoring ────────────────────────────────────────────────
  {
    category: 'Fashion & Tailoring',
    icon: 'cut-outline',
    subServices: [
      {
        name: 'Tailoring & Sewing',
        tags: ['kaba and slit', 'suit', 'alterations', 'seamstress', 'men agbada', 'traditional wear', 'school uniform'],
      },
      {
        name: 'Shoe Making & Repair',
        tags: ['leather work', 'cobbler', 'custom shoes', 'sandal repair', 'heel replacement', 'sneaker restore'],
      },
      {
        name: 'Bag Making',
        tags: ['leather bag', 'tote bag', 'handbag', 'custom bag', 'beaded bag', 'ankara bag'],
      },
      {
        name: 'Embroidery & Beadwork',
        tags: ['machine embroidery', 'hand embroidery', 'bead work', 'monogram', 'fabric applique'],
      },
      {
        name: 'Alterations & Mending',
        tags: ['hemming', 'zipper repair', 'resizing', 'patching', 'dress alteration', 'suit adjustment'],
      },
    ],
  },

  // ── 12. Logistics & Transport ──────────────────────────────────────────────
  {
    category: 'Logistics & Transport',
    icon: 'car-outline',
    subServices: [
      {
        name: 'Delivery & Dispatch',
        tags: ['same day delivery', 'package delivery', 'courier', 'last mile', 'bike delivery', 'dropshipping runner'],
      },
      {
        name: 'Moving & Packing',
        tags: ['house moving', 'office relocation', 'packing boxes', 'furniture moving', 'truck hire'],
      },
      {
        name: 'Errands & Shopping',
        tags: ['grocery run', 'market shopping', 'queue proxy', 'bill payment', 'document delivery'],
      },
      {
        name: 'Airport Pickup & Drop-off',
        tags: ['airport transfer', 'kotoka airport', 'executive car', 'meet and greet', 'luggage assist'],
      },
      {
        name: 'Car Hire & Chauffeur',
        tags: ['private driver', 'wedding car', 'executive car hire', 'self-drive', 'daily hire'],
      },
    ],
  },

  // ── 13. Automotive ─────────────────────────────────────────────────────────
  {
    category: 'Automotive',
    icon: 'speedometer-outline',
    subServices: [
      {
        name: 'Auto Mechanic',
        tags: ['engine repair', 'service', 'oil change', 'diagnostics', 'brakes', 'suspension', 'transmission'],
      },
      {
        name: 'Car Wash & Detailing',
        tags: ['full car wash', 'interior cleaning', 'engine wash', 'polish', 'wax', 'ceramic coating'],
      },
      {
        name: 'Auto Electrical',
        tags: ['car wiring', 'battery', 'alternator', 'starter motor', 'central locking', 'car alarm'],
      },
      {
        name: 'Tyre Services',
        tags: ['tyre change', 'puncture repair', 'wheel balancing', 'alignment', 'tyre fitting'],
      },
      {
        name: 'Panel Beating & Car Painting',
        tags: ['dent repair', 'body work', 'spray painting', 'rust treatment', 'bumper repair'],
      },
    ],
  },

  // ── 14. Agriculture & Environment ─────────────────────────────────────────
  {
    category: 'Agriculture & Environment',
    icon: 'leaf-outline',
    subServices: [
      {
        name: 'Gardening',
        tags: ['lawn mowing', 'weeding', 'pruning', 'planting', 'irrigation', 'flower beds', 'vegetable garden'],
      },
      {
        name: 'Farm Labour',
        tags: ['ploughing', 'harvesting', 'planting', 'farm hands', 'tractor hire', 'crop management'],
      },
      {
        name: 'Crop Spraying',
        tags: ['pesticides', 'herbicides', 'drone spraying', 'fertilizer application', 'weed control'],
      },
      {
        name: 'Tree Services',
        tags: ['tree cutting', 'stump removal', 'tree trimming', 'tree planting', 'hedge trimming'],
      },
      {
        name: 'Waste Collection',
        tags: ['rubbish removal', 'junk disposal', 'recycling', 'skip hire', 'green waste'],
      },
    ],
  },

  // ── 15. Health & Care ──────────────────────────────────────────────────────
  {
    category: 'Health & Care',
    icon: 'medkit-outline',
    subServices: [
      {
        name: 'Home Nursing',
        tags: ['wound dressing', 'iv drip', 'post-surgery care', 'medication administration', 'vital signs monitoring'],
      },
      {
        name: 'Physiotherapy',
        tags: ['back pain', 'stroke rehab', 'sports injury', 'joint pain', 'exercise therapy', 'orthopaedic'],
      },
      {
        name: 'Mental Health Counselling',
        tags: ['therapy', 'anxiety', 'depression', 'grief counselling', 'relationship therapy', 'cbt'],
      },
      {
        name: 'Prescription Pickup & Errands',
        tags: ['pharmacy run', 'medication delivery', 'lab sample delivery', 'doctor errands'],
      },
    ],
  },

  // ── 16. Pets ───────────────────────────────────────────────────────────────
  {
    category: 'Pets',
    icon: 'paw-outline',
    subServices: [
      {
        name: 'Pet Grooming',
        tags: ['dog grooming', 'cat grooming', 'bath', 'nail clipping', 'fur trimming', 'de-shedding'],
      },
      {
        name: 'Dog Walking',
        tags: ['daily walks', 'group walks', 'puppy training', 'exercise', 'leash training'],
      },
      {
        name: 'Pet Sitting',
        tags: ['home boarding', 'overnight care', 'feeding visits', 'cat sitting', 'holiday care'],
      },
      {
        name: 'Veterinary Home Visit',
        tags: ['vaccination', 'check-up', 'deworming', 'tick treatment', 'microchipping'],
      },
    ],
  },

  // ── 17. Food & Catering ────────────────────────────────────────────────────
  {
    category: 'Food & Catering',
    icon: 'restaurant-outline',
    subServices: [
      {
        name: 'Personal Chef',
        tags: ['home cooking', 'meal prep', 'private dining', 'special diet', 'vegan cooking', 'continental'],
      },
      {
        name: 'Baking & Pastry',
        tags: ['bread', 'cakes', 'meat pies', 'doughnuts', 'chin chin', 'cupcakes', 'cookies', 'occasion cakes'],
      },
      {
        name: 'Cooking Lessons',
        tags: ['ghanaian cuisine', 'continental cooking', 'pastry class', 'knife skills', 'beginner cooking'],
      },
      {
        name: 'Bar & Cocktail Services',
        tags: ['mobile bartender', 'cocktail mixing', 'drinks service', 'event bar', 'wine service'],
      },
    ],
  },
];