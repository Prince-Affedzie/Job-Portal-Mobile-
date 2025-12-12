// Data constants for dropdowns and selections
export const REGIONS = [
  { label: 'Greater Accra', value: 'Greater Accra' },
  { label: 'Ahafo', value: 'Ahafo' },
  { label: 'Ashanti', value: 'Ashanti' },
  { label: 'Bono East', value: 'Bono East' },
  { label: 'Brong Ahafo', value: 'Brong Ahafo' },
  { label: 'Central', value: 'Central' },
  { label: 'Eastern', value: 'Eastern' },
  { label: 'Northern', value: 'Northern' },
  { label: 'North East', value: 'North East' },
  { label: 'Oti', value: 'Oti' },
  { label: 'Savannah', value: 'Savannah' },
  { label: 'Upper East', value: 'Upper East' },
  { label: 'Upper West', value: 'Upper West' },
  { label: 'Volta', value: 'Volta' },
  { label: 'Western North', value: 'Western North' },
  { label: 'Western', value: 'Western' },
];

const DIGITAL_TECH_SKILLS = [
  'Software Engineering',
  'Web Development',
  'Mobile App Development',
  'UI/UX Design',
  'Graphic Design',
  'Video Editing',
  'Photo Editing',
  'Digital Marketing',
  'SEO/SEM',
  'Social Media Management',
  'Data Analysis',
  'AI/ML',
  'Cybersecurity',
  'Network Administration',
  'IT Support',
  'Cloud Computing',
  'Blockchain',
  'Game Development',
];

const CREATIVE_DESIGN_SKILLS = [
  'Graphic Design',
  'Logo Design',
  'Brand Identity',
  'Interior Decor',
  'Interior Design',
  'Architectural Design',
  '3D Modeling',
  'Animation',
  'Motion Graphics',
  'Video Production',
  'Photography',
  'Illustration',
  'Fashion Design',
  'Jewelry Design',
  'Product Design',
  'Industrial Design',
  'Art Direction',
  'Creative Writing',
];

const HOME_PROFESSIONAL_SKILLS = [
  'Plumbing',
  'Electrical Repairs',
  'Carpentry',
  'Painting',
  'Cleaning Services',
  'Gardening',
  'Landscaping',
  'Moving & Packing',
  'Home Appliance Repair',
  'HVAC Installation',
  'CCTV Installation',
  'Home Security',
  'Smart Home Setup',
  'Home Renovation',
  'Roofing',
  'Masonry',
  'Flooring Installation',
  'Window Installation',
  'Event Planning',
  'Catering',
  'Personal Training',
  'Tutoring',
  'Language Translation',
  'Virtual Assistance',
  'Accounting',
  'Legal Services',
];


export const ALL_SKILLS = [
  ...DIGITAL_TECH_SKILLS,
  ...CREATIVE_DESIGN_SKILLS,
  ...HOME_PROFESSIONAL_SKILLS,
].sort();

export const ONBOARDING_STEPS = [
  {
    step: 1,
    title: 'Basic Info',
    description: 'Tell us about yourself',
    icon: 'person-outline'
  },
  {
    step: 2,
    title: 'Location',
    description: 'Where are you located?',
    icon: 'location-outline'
  },
  {
    step: 3,
    title: 'Skills',
    description: 'What are you good at?',
    icon: 'code-slash-outline'
  },
  {
    step: 4,
    title: 'Profile Photo',
    description: 'Add a professional photo',
    icon: 'camera-outline'
  },
  {
    step: 5,
    title: 'Review',
    description: 'Confirm your details',
    icon: 'checkmark-done-outline'
  }
];