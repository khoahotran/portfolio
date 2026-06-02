export const heroData = {
  role: 'Software Engineer',
  name: 'Trần Nguyễn Anh Khoa',
  tagline:
    'Building high-performance backend systems and event-driven architectures in Go and TypeScript.',
  location: 'Ho Chi Minh City, Vietnam',
  email: 'trannguyenanhkhoa0104@gmail.com',
  github: 'https://github.com/khoahotran',
  linkedin: 'https://linkedin.com/in/khoahotran',
  stats: [
    { label: 'Latency', value: '150 - 300ms' },
    { label: 'Scale', value: '1.5k users/min' },
    { label: 'Transaction Error', value: '< 1%' },
    { label: 'Response Time', value: '- 20-30%' }
  ]
};

export const aboutData = {
  title: 'About Me',
  headline: 'Systems that scale. Code that ships. Architecture that lasts.',
  paragraph1:
    "I'm a Backend Engineer focused on building distributed systems, event-driven architectures, and high-performance services using Go and TypeScript. I care about correctness, observability, and operational simplicity.",
  paragraph2:
    'My work spans production backend services at scale, Go microservices with gRPC and Kafka, event-sourced financial systems, and ML-driven research platforms — all grounded in real system-design trade-offs.',
  values: [
    'Modular, scalable backend services.',
    'Fast, reliable APIs with caching and search.',
    'Go services with gRPC, Kafka, and OpenTelemetry.',
    'CQRS, event sourcing, and saga patterns for data consistency.',
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
  // ── Experience (Professional) ────────────────────────────────────────────
  {
    title: 'SeensioGO',
    role: 'Full-stack Developer',
    scale: 'Mobile + Admin dashboard',
    section: 'experience',
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
    section: 'experience',
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
  // ── Personal Projects ────────────────────────────────────────────────────
  {
    title: 'Aegis',
    role: 'Author — Backend Engineer',
    scale: 'Personal Project',
    section: 'personal',
    summary:
      'Modular, high-performance Auth & Authorization platform in Go. Separate Identity, Policy, and Gateway microservices connected via gRPC, with a GraphQL API gateway, Kafka-based audit logging, and OpenTelemetry tracing.',
    metrics: [
      'Argon2id password hashing',
      'Token bucket rate limiting',
      'Sub-5ms policy cache hits (Redis)',
      'Full OTel trace propagation',
    ],
    stack: ['Go', 'gRPC', 'GraphQL (gqlgen)', 'PostgreSQL', 'Redis', 'Redpanda/Kafka', 'Jaeger', 'Docker'],
    architecture: [
      'Identity Service: user registration, Argon2id hashing, JWT issuance.',
      'Policy Service: RBAC evaluation with Redis-cached decisions.',
      'API Gateway: GraphQL (gqlgen) routing to gRPC backends.',
      'Audit Service: Kafka consumer persisting auth events to PostgreSQL.',
      'OpenTelemetry distributed tracing with Jaeger.',
    ],
    links: {
      github: 'https://github.com/khoahotran/aegis',
    },
  },
  {
    title: 'Event-Driven Core Banking',
    role: 'Author — Backend Engineer',
    scale: 'Personal Project',
    section: 'personal',
    summary:
      'Production-grade core banking system in Go using Event Sourcing and CQRS on Firestore. Includes distributed Saga transfers, real-time fraud detection with velocity rules, Prometheus metrics, and snapshotting every 100 events.',
    metrics: [
      'Event sourcing with O(1) read projections',
      'Optimistic concurrency control on writes',
      'Fraud detection: velocity + burst-silence rules',
      'Snapshots at every 100 event versions',
    ],
    stack: ['Go', 'Firestore', 'Gin', 'GraphQL (gqlgen)', 'Prometheus', 'Docker Compose'],
    architecture: [
      'Write side: append-only EventStore on Firestore with OCC.',
      'Read side: ProjectionRepository for fast O(1) account reads.',
      'Saga worker: orchestrates Debit A → Credit B across aggregates.',
      'Fraud engine: velocity rules trigger automatic account freeze.',
      'Prometheus /metrics endpoint for business + fraud observability.',
    ],
    links: {
      github: 'https://github.com/khoahotran/event-driven-core-banking',
    },
  },
  {
    title: 'QuantAlpha Lab (HFT)',
    role: 'Contributor — Backend + ML',
    scale: 'Academic Research Platform',
    section: 'personal',
    summary:
      'High-Frequency Trading research platform with decoupled Go API, Angular 18 frontend, and async Python worker backed by Redis Streams and PostgreSQL. Models trained on VN30F2112 Level-3 order-book data with rolling-window ML classifiers.',
    metrics: [
      'VN30F2112 order-book (2021-04-19 → 2021-12-16)',
      'Rolling 30-min train → 10-sec prediction windows',
      'Redis Streams for async job dispatch',
      'Live at hft-mauve.vercel.app',
    ],
    stack: ['Go', 'Angular 18', 'Python', 'Redis Streams', 'PostgreSQL', 'scikit-learn'],
    architecture: [
      'Data Scientist role: OBI/factor computation, ML classifier training.',
      'Quant Researcher role: alpha signal expression backtesting.',
      'Portfolio Manager role: strategy monitoring and capital allocation.',
      'Go REST API serving Angular frontend; Python worker via Redis Streams.',
    ],
    links: {
      github: 'https://github.com/khoahotran/HFT',
    },
  },
  {
    title: 'ScrapeAndDown',
    role: 'Author — Backend Engineer',
    scale: 'Personal Project',
    section: 'personal',
    summary:
      'Production-quality Go CLI tool for scraping YouTube metadata and downloading video files. Hexagonal architecture with Apify adapter for metadata and yt-dlp for video extraction. Job-based with UUIDs, graceful shutdown, and clean port/adapter separation.',
    metrics: [
      'Hexagonal (ports & adapters) architecture',
      'UUID job traceability',
      'Auto-downloads yt-dlp binary on Windows',
      'Graceful OS signal handling',
    ],
    stack: ['Go', 'Apify API', 'yt-dlp', 'Hexagonal Architecture'],
    architecture: [
      'Core: domain logic, Orchestrator, port interfaces.',
      'Adapters: Apify (metadata), ytdlp (URL extraction), downloader (HTTP), localstorage (FS).',
      'Job pipeline: each URL is a trackable job with full state lifecycle.',
      'CLI entry point with context cancellation and interrupt handling.',
    ],
    links: {
      github: 'https://github.com/khoahotran/ScrapeAndDown',
    },
  },
  // ── University / Team Projects ────────────────────────────────────────────
  {
    title: 'Uynex',
    role: 'Full-stack Developer',
    scale: 'Personal Project',
    section: 'university',
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
    section: 'university',
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
    section: 'university',
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
    skills: ['Go', 'TypeScript / JavaScript', 'Python', 'SQL'],
  },
  {
    category: 'Backend',
    skills: ['NestJS', 'Go', 'Firebase Functions', 'REST APIs', 'GraphQL'],
  },
  {
    category: 'Distributed Systems',
    skills: ['Kafka', 'Redis Streams', 'Event Sourcing', 'CQRS', 'Saga Pattern'],
  },
  {
    category: 'Frontend',
    skills: ['ReactJS', 'NextJS', 'Angular', 'Ionic', 'TailwindCSS'],
  },
  {
    category: 'Database',
    skills: ['PostgreSQL', 'Firestore', 'MongoDB', 'Redis'],
  },
  {
    category: 'Observability',
    skills: ['OpenTelemetry', 'Jaeger', 'Prometheus', 'Structured Logging'],
  },
  {
    category: 'Search & Cache',
    skills: ['Algolia', 'Redis', 'In-memory caching'],
  },
  {
    category: 'Infra & Tools',
    skills: ['Docker', 'Docker Compose', 'GCP', 'Git', 'Postman', 'Figma'],
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
        'School awards: All-round Excellent Student Title 2023-2024, 2024-2025 and 2025-2026',
      ],
    },
    {
      degree: 'Master of Computer Science',
      institution: 'Ho Chi Minh City University of Technology (HCMUT)',
      location: 'Ho Chi Minh City, Vietnam',
      period: 'Jan 2026 - Dec 2027 (Expected)',
      highlights: ['Specialization: Computer Science'],
    },
  ],
};

export const architectureData = [
  {
    title: 'Aegis — Auth Platform',
    description:
      'Identity + Policy + Gateway microservices in Go. gRPC inter-service, GraphQL external API, Kafka audit log, OTel tracing.',
    mode: 'Microservices + Event-driven',
    link: 'https://github.com/khoahotran/aegis',
  },
  {
    title: 'Event-Driven Core Banking',
    description:
      'Event sourcing + CQRS on Firestore. Saga pattern for distributed transfers. Real-time fraud detection with Prometheus metrics.',
    mode: 'Event Sourcing + CQRS',
    link: 'https://github.com/khoahotran/event-driven-core-banking',
  },
  {
    title: 'SeensioGO',
    description:
      'NestJS services on Firebase Functions; Firestore + Algolia geo-search; caching layer; audit logging for transactions.',
    mode: 'Backend + search',
    link: 'https://apps.apple.com/app/seensiogo/id6474233078',
  },
  {
    title: 'Jujuja',
    description:
      'NestJS/Firebase backend with async quest jobs, Algolia for store discovery, Twilio integration; Angular/Ionic client.',
    mode: 'Async jobs + mobile',
    link: 'https://apps.apple.com/app/jujuja/id6553972212',
  },
  {
    title: 'QuantAlpha Lab (HFT)',
    description:
      'Go API + Angular frontend + Python async worker on Redis Streams. ML classifiers trained on VN30F2112 order-book data.',
    mode: 'ML + Async pipeline',
    link: 'https://github.com/khoahotran/hft',
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
  description:
    "I'm open to backend engineering roles, systems architecture discussions, and open-source collaboration.",
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
    {
      name: 'event-driven-core-banking',
      stars: null,
      role: 'Author',
      focus: 'Event sourcing + CQRS core banking in Go with Firestore, Sagas, and Prometheus',
      link: 'https://github.com/khoahotran/event-driven-core-banking',
    },
    {
      name: 'aegis',
      stars: null,
      role: 'Author',
      focus: 'Auth platform: gRPC microservices, GraphQL gateway, Kafka audit log, OTel tracing',
      link: 'https://github.com/khoahotran/aegis',
    },
    {
      name: 'ScrapeAndDown',
      stars: null,
      role: 'Author',
      focus: 'Go CLI tool with hexagonal architecture for YouTube scraping and downloading',
      link: 'https://github.com/khoahotran/ScrapeAndDown',
    },
  ],
  writing: [
    {
      title: 'Designing a Burst-Traffic Async Job Pipeline: The Jujuja Quest System',
      time: '10 min',
      takeaway: 'How queue-driven workers handle 1,500 concurrent users and why synchronous handlers fail under burst.',
    },
    {
      title: 'Atomic Financial Transactions in a NoSQL World: The J-Point Loyalty Engine',
      time: '8 min',
      takeaway: 'Building <1% error-rate virtual currency on Firestore with atomic transactions and balance reconciliation.',
    },
    {
      title: 'Event-Driven Architecture: The Outbox Pattern Deep Dive',
      time: '9 min',
      takeaway: 'Guarantee domain event delivery without distributed transactions using the transactional outbox.',
    },
  ],
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
