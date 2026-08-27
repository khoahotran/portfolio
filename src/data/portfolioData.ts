export const heroData = {
  role: 'Backend & Distributed Systems Engineer',
  name: 'Trần Nguyễn Anh Khoa',
  tagline:
    'Building high-performance backend systems and event-driven architectures in Go and TypeScript.',
  location: 'Ho Chi Minh City, Vietnam',
  email: 'trannguyenanhkhoa0104@gmail.com',
  github: 'https://github.com/khoahotran',
  linkedin: 'https://linkedin.com/in/khoahotran',
  // Each stat is attributed to the system it was measured on (see
  // experienceData.impact below) rather than left as an unlabeled number —
  // otherwise "Latency 150-300ms" reads as decoration, not evidence.
  //
  // `route` is optional and only set for the 2 stats that have a dedicated
  // article deriving the number (see Hero.tsx, which renders the label as a
  // Link only when `route` is present). Transaction Consistency and API
  // Response are sourced only from experienceData.impact below, with no
  // article — they intentionally have no `route` and stay plain text rather
  // than link to a bare bullet point.
  stats: [
    { label: 'Store Lookup Latency', value: '150 - 300ms', route: '/research/algolia-geo-search-for-store-discovery' },
    { label: 'Quest Load (Peak)', value: '1.5k users/min', route: '/blog/building-jujuja-a-production-quest-system' },
    { label: 'Transaction Consistency', value: '< 1% error' },
    { label: 'API Response (Caching)', value: '↓ 20-30%' }
  ]
};

export const aboutData = {
  title: 'About Me',
  headline: 'Every claim on this site links to the reasoning behind it.',
  // paragraph2 splits shipped-at-work from built-solo on purpose. Previously it
  // read "production backend services at scale, Go microservices with gRPC and
  // Kafka, event-sourced financial systems..." as one list, which let a reader
  // assume the gRPC/event-sourcing work also shipped to production users. It
  // didn't — those are self-directed projects, and the cards say so via
  // `provenance`. See `.ai/portfolio-context.md` "Provenance Is Mandatory".
  paragraph1:
    "I'm a backend engineer focused on distributed systems, event-driven architectures, and high-performance services using Go and TypeScript. I care about correctness, observability, and operational simplicity.",
  paragraph2:
    'At work I ship production backend services on NestJS and Firebase, handling transaction consistency, caching, and geo-search. On my own time I build the harder architecture end to end — Go microservices on gRPC and Kafka, an event-sourced ledger with Saga transfers — and write up the trade-offs I had to accept.',
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

/**
 * Where a project actually came from. Rendered as a badge on every project card
 * so a reader never has to infer whether something shipped to real users, was
 * built solo, or was coursework — guessing wrong is what costs credibility.
 * See `.ai/portfolio-context.md` "Provenance Is Mandatory".
 *
 * This is deliberately a closed union rather than a free string: `scale` used to
 * carry provenance ("Independent Engineering Project") mixed with actual scale
 * ("Team of 5", "Daily quest load ~500-1,500 users/min"), so neither was
 * reliable. `scale` now means scale only.
 */
export type ProjectProvenance = 'professional' | 'self-directed' | 'academic' | 'coursework';

export interface Project {
  title: string;
  role: string;
  provenance: ProjectProvenance;
  scale: string;
  section: string;
  summary: string;
  metrics: string[];
  stack: string[];
  architecture: string[];
  links?: {
    deck?: string;
    github?: string;
    live?: string;
  };
  slug?: string;
}

export const caseStudiesData: Project[] = [
  // ── Experience (Professional) ────────────────────────────────────────────
  {
    title: 'SeensioGO',
    role: 'Full-stack Developer',
    provenance: 'professional',
    scale: 'Mobile client + admin dashboard',
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
    provenance: 'professional',
    scale: '~500-1,500 users/min at quest peak',
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
  // ── Flagship Case Studies ────────────────────────────────────────────────
  // The three deep-dive projects with their own content/projects/*.md page
  // (see .ai/flagship-projects.md's "Big Three") — kept in their own section,
  // distinct from `personal` below, so this label doesn't also cover
  // ScrapeAndDown, which has no deep-dive page.
  {
    title: 'Aegis',
    slug: 'aegis',
    role: 'Author — Backend Engineer',
    provenance: 'self-directed',
    scale: 'Solo build — 4 Go services',
    section: 'flagship',
    summary:
      'Modular, high-performance Auth & Authorization platform in Go. Separate Identity, Policy, and Gateway microservices connected via gRPC, with a GraphQL API gateway, Kafka-based audit logging, and OpenTelemetry tracing.',
    metrics: [
      'Argon2id password hashing',
      'Redis-backed rate limiting',
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
    slug: 'core-banking',
    role: 'Author — Backend Engineer',
    provenance: 'self-directed',
    scale: 'Solo build — Go + Firestore',
    section: 'flagship',
    summary:
      'Core banking system in Go using Event Sourcing and CQRS on Firestore. Includes distributed Saga transfers, real-time fraud detection with velocity rules, Prometheus metrics, and snapshotting every 100 events.',
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
      'Saga worker: event-driven compensation across Debit A → Credit B aggregates.',
      'Fraud engine: velocity rules trigger automatic account freeze.',
      'Prometheus /metrics endpoint for business + fraud observability.',
    ],
    links: {
      github: 'https://github.com/khoahotran/event-driven-core-banking',
    },
  },
  {
    title: 'PFM — Personal Finance Manager',
    slug: 'pfm',
    role: 'Author — Full-stack Engineer',
    provenance: 'self-directed',
    scale: 'Solo build — Go + React 19, spec-driven',
    section: 'flagship',
    summary:
      'An invite-only personal finance tracker built spec-first: every business rule traces from an SRS to an SDS to a passing integration test. React 19 Server Actions are the only client the Go API accepts — the browser never calls it directly.',
    metrics: [
      'Invite-only — no open registration',
      '212 backend integration tests (Testcontainers)',
      'Atomic wallet balance + transaction writes',
      'PBAC via JWT claims, enforced server-side only',
    ],
    stack: ['Go', 'Gin', 'React 19', 'Next.js (vinext)', 'PostgreSQL', 'Redis', 'Asynq', 'sqlc'],
    architecture: [
      'Server Actions are the only client the Go API accepts — no token ever reaches the browser.',
      'Package-by-Feature backend: one bounded context per module, enforced by import rules.',
      'Redis backs exactly two things: the Asynq email queue and the JWT logout denylist.',
      'Wallet balance and transaction writes are atomic; currency locks on first transaction.',
    ],
    links: {
      github: 'https://github.com/khoahotran/PFM',
    },
  },
  {
    title: 'QuantAlpha Lab (HFT)',
    slug: 'quant-alpha',
    role: 'Contributor — Backend + ML',
    provenance: 'academic',
    scale: 'University research platform',
    section: 'flagship',
    summary:
      'High-Frequency Trading research platform with decoupled Go API, Angular 18 frontend, and async Python worker backed by Redis Streams and PostgreSQL. Models trained on VN30F2112 Level-3 order-book data with rolling-window ML classifiers.',
    metrics: [
      'VN30F2112 order-book (2021-04-19 → 2021-12-16)',
      'Redis Streams for async job dispatch',
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
  // ── Personal Projects ────────────────────────────────────────────────────
  {
    title: 'ScrapeAndDown',
    role: 'Author — Backend Engineer',
    provenance: 'self-directed',
    scale: 'Solo CLI tool',
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
    provenance: 'coursework',
    scale: 'Team project',
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
    provenance: 'coursework',
    scale: 'Team of 7',
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
    provenance: 'coursework',
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
