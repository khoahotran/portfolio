export const heroData = {
  role: "Software Developer",
  name: "Trần Nguyễn Anh Khoa",
  tagline: "Architecting robust backend services and high-performance full-stack solutions with NestJS and Firebase.",
  location: "Ho Chi Minh City, Vietnam",
  email: "trannguyenanhkhoa0104@gmail.com",
  github: "https://github.com/khoahotran",
  linkedin: "https://linkedin.com/in/khoahotran",
  stats: [
    { label: 'Latency', value: '150 - 300ms' },
    { label: 'Scale', value: '1.5k users/min' },
    { label: 'Transaction Error', value: '< 1%' },
    { label: 'Response Time', value: '-20-30%' }
  ]
};

export const aboutData = {
  title: 'About Me',
  headline: 'Building modern digital experiences with precision and purpose.',
  paragraph1: "I'm a Full Stack Developer with a passion for building modular, scalable backend services and responsive front-end experiences.",
  paragraph2: "My expertise lies in designing robust APIs, optimizing database performance, and delivering seamless user interfaces across web and mobile platforms.",
  values: [
    'Modular, scalable backend services.',
    'Fast, reliable APIs with caching and search.',
    'Full-stack delivery across web and mobile clients.'
  ],
};

export const experienceData = [
  {
    title: 'Software Developer (Intern → Part-time → Full-time)',
    company: 'JK Technologies',
    location: 'Ho Chi Minh City, Vietnam',
    period: 'Jun 2025 - Present',
    description: [
      'SeensioGO: Implemented NestJS + Firebase Functions backend for store management and Sio in-app currency flows.',
      'SeensioGO: Added Algolia geo-search for store discovery; built audit logging and transaction tracking.',
      'SeensioGO: Introduced caching for frequently accessed store data; built admin dashboard pages in Next.js/React.',
      'Jujuja: Built store onboarding with multi-channel registration and approval workflows.',
      'Jujuja: Implemented daily quest async jobs and j-point loyalty system with atomic transactions.',
      'Jujuja: Developed owner reporting APIs with Excel export and Algolia geo-search in Ionic app.',
    ],
    impact: [
      'Store lookup latency: 150-300 ms (Algolia)',
      'Transaction consistency errors: <1%',
      'API response improvement: ~20-30% via caching',
      'Daily quest load: ~500-1,500 users/min during runs',
      'Reporting APIs: 5-7s responses',
    ],
  },
];

export const caseStudiesData = [
  {
    title: 'SeensioGO',
    role: 'Full-stack Developer',
    scale: 'Mobile + Admin dashboard',
    summary:
      'Backend services for store management and Sio in-app currency transactions; supports Unity-based mobile client and admin web.',
    metrics: ['Latency 150-300 ms (Algolia)', 'Consistency errors <1%', 'API response +20-30% via cache'],
    stack: ['NestJS', 'Firebase Functions', 'Firestore', 'Algolia', 'Next.js', 'TailwindCSS'],
    architecture: [
      'NestJS services deployed as Firebase Functions.',
      'Algolia geo-search for store discovery.',
      'Caching layer for frequently accessed store data.',
      'Audit logging and transaction tracking for balance changes.',
    ],
    links: {
      deck: 'https://apps.apple.com/app/seensiogo/id6474233078',
    },
  },
  {
    title: 'Jujuja',
    role: 'Full-stack Developer',
    scale: 'Daily quest load ~500-1,500 users/min',
    summary:
      'Store onboarding workflows, daily quest automation, and j-point loyalty system with atomic transactions; Angular/Ionic client.',
    metrics: ['500-1,500 users/min quests', 'Reporting APIs 5-7s', 'Atomic loyalty transactions'],
    stack: ['NestJS', 'Firebase Functions', 'Firestore', 'Algolia', 'Twilio', 'Angular', 'Ionic', 'Capacitor'],
    architecture: [
      'Async background jobs for daily quests and rewards.',
      'Multi-channel store registration and activation approval.',
      'Algolia geo-search in Ionic app; Twilio integration.',
      'Owner reporting APIs with Excel export.',
    ],
    links: {
      deck: 'https://apps.apple.com/app/jujuja/id6553972212',
    },
  },
  {
    title: 'Uynex',
    role: 'Full-stack Developer',
    scale: 'Personal Project',
    summary:
      'Personal expense management app with real-time tracking and cookie-based session security. Built with a modular NestJS architecture.',
    metrics: ['CRUD <200ms', 'Secure Sessions', 'Modular Design'],
    stack: ['NestJS', 'MongoDB', 'ReactJS', 'TypeScript', 'shadcn/ui'],
    architecture: [
      'RESTful API design with modular NestJS services.',
      'Cookie-based authentication with session persistence.',
      'React frontend with state-driven category tracking.',
    ],
    links: { github: 'https://github.com/MinhPham131204/expense_management' },
  },
  {
    title: 'Smart Printing Service',
    role: 'Front-end Developer',
    scale: 'Campus-wide Platform',
    summary:
      'Printing management system for HCMUT students featuring PayOS integration and strict role-based access control.',
    metrics: ['RBAC to reduce unauthorized usage (UAT)', 'Agile team of 7', 'End-to-end SDLC participation'],
    stack: ['MERN Stack', 'TypeScript', 'PayOS', 'Git'],
    architecture: [
      'PayOS payment gateway integration.',
      'Role-based authorization pages.',
      'Responsive design for student-wide accessibility.',
    ],
    links: { github: 'https://github.com/ngochidung2111/CNPM' },
  },
  {
    title: 'Tesell',
    role: 'Front-end Developer',
    scale: 'Team of 5',
    summary:
      'E-commerce platform for electronic devices; built responsive catalogue and shopping interface with consistent design tokens.',
    metrics: ['Responsive catalogue', 'Conventional Commits adopted'],
    stack: ['ReactJS', 'Tailwind CSS', 'MERN Stack', 'Git'],
    architecture: [
      'Dynamic product listing and detail pages in ReactJS.',
      'Tailwind CSS for consistent tokens across breakpoints.',
      'Conventional Commits for traceable history and changelog.',
    ],
    links: { github: 'https://github.com/HCMUT-Tesell/Tesell' },
  },
];

export const skillCategoriesData = [
  {
    category: 'Programming',
    skills: ['HTML/CSS/JavaScript/TypeScript', 'Python', 'Go', 'SQL'],
  },
  {
    category: 'Backend',
    skills: ['NestJS', 'NodeJS', 'Firebase Functions', 'Firestore', 'REST APIs'],
  },
  {
    category: 'Frontend',
    skills: ['ReactJS', 'NextJS', 'Angular', 'Ionic', 'TailwindCSS'],
  },
  {
    category: 'Database',
    skills: ['PostgreSQL', 'MongoDB', 'Firebase/Firestore'],
  },
  {
    category: 'Search & Cache',
    skills: ['Algolia', 'In-memory caching'],
  },
  {
    category: 'Infra & Tools',
    skills: ['Docker', 'Git', 'GCP', 'Postman', 'Figma'],
  },
];


export const educationData = {
  title: 'Education',
  items: [
    {
      degree: 'Bachelor of Computer Science',
      institution: 'Ho Chi Minh City University of Technology (HCMUT)',
      location: 'Ho Chi Minh City, Vietnam',
      period: 'Dec 2022 - Jun 2026 (Expected)',
      highlights: [
        'CGPA: 3.8/4.0',
        'School awards: All-round Excellent Student Title 2023-2024 and 2024-2025',
      ],
    },
    {
      degree: 'Master of Computer Science',
      institution: 'Ho Chi Minh City University of Technology (HCMUT)',
      location: 'Ho Chi Minh City, Vietnam',
      period: 'Jan 2026 - Dec 2027 (Expected)',
      highlights: [],
    },
  ],
};

export const architectureData = [
  {
    title: 'SeensioGO',
    description: 'NestJS services on Firebase Functions; Firestore + Algolia geo-search; caching layer; audit logging for transactions.',
    mode: 'Backend + search',
    link: 'https://apps.apple.com/app/seensiogo/id6474233078',
  },
  {
    title: 'Jujuja',
    description: 'NestJS/Firebase backend with async quest jobs, Algolia for store discovery, Twilio integration; Angular/Ionic client.',
    mode: 'Async jobs + mobile',
    link: 'https://apps.apple.com/app/jujuja/id6553972212',
  },
  {
    title: 'Uynex',
    description: 'NestJS REST API with modular services, MongoDB data layer, cookie-session auth; ReactJS + shadcn/ui frontend.',
    mode: 'Full-stack web',
    link: 'https://github.com/MinhPham131204/expense_management',
  },
];

export const metricsData = [
  { label: 'Store lookup latency', value: '150 - 300 ms', detail: 'SeensioGO (Algolia geo-search)' },
  { label: 'Consistency errors', value: '< 1%', detail: 'SeensioGO transactions' },
  { label: 'API response', value: '~20 - 30% faster', detail: 'SeensioGO caching' },
  { label: 'Quest load', value: '500 - 1,500 users/min', detail: 'Jujuja daily quest jobs' },
  { label: 'Reporting APIs', value: '5 - 7 s', detail: 'Jujuja owner reports' },
  { label: 'CRUD latency', value: '< 200 ms', detail: 'Uynex common operations' },
];

export const contactData = {
  title: 'Reach Out',
  headline: "Let's build something exceptional.",
  description: "I'm always open to discussing full-stack opportunities, new technologies, or potential collaborations.",
  email: 'trannguyenanhkhoa0104@gmail.com',
  linkedin: 'https://linkedin.com/in/khoahotran',
  github: 'https://github.com/khoahotran',
  location: 'Ho Chi Minh City, Vietnam',
};

export const certificationsData = [
  {
    name: 'TOEIC Listening & Reading',
    issuer: 'ETS',
    date: 'Score: 730/990',
  },
];

export const credibilityData = {
  oss: [
    { name: 'open-kafka-tools', stars: '1.2k⭐', role: 'Author', focus: 'Kafka consumer lag tooling + chaos scripts' },
    { name: 'otel-lambda-layer', stars: '740⭐', role: 'Maintainer', focus: 'Serverless OTel distro with batteries-included exporters' },
    { name: 'infra-runbooks', stars: '320⭐', role: 'Curator', focus: 'Incident playbooks and templates for SLO programs' },
  ],
  writing: [
    { title: 'Designing multi-region payments without global locks', time: '8 min', takeaway: 'How to keep idempotency without sacrificing latency.' },
    { title: 'Incident drills that actually work', time: '6 min', takeaway: 'Burn-rate alerts, roles, and fast comms beats big dashboards.' },
    { title: 'Sampling strategies for telemetry pipelines', time: '7 min', takeaway: 'Adaptive sampling while preserving rare error signals.' },
  ]
};

export const philosophyData = [
  {
    title: 'Reliability > features',
    detail: 'Ship with explicit SLOs, error budgets, and rollback paths before adding complexity.',
  },
  {
    title: 'Make it observable',
    detail: 'Traces + metrics + logs with shared context; every alert links to a runbook.',
  },
  {
    title: 'Bias to idempotency',
    detail: 'Design APIs and jobs to replay safely; simplify recovery and reduce page load.',
  },
  {
    title: 'Cost-aware scaling',
    detail: 'Measure cost per 1k requests and enforce guardrails alongside performance goals.',
  },
];


