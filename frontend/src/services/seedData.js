export const INITIAL_CATEGORIES = [
  { id: 1, name: 'Technology & Coding', slug: 'technology-coding', description: 'Software engineering, AI, algorithms, and system design.' },
  { id: 2, name: 'Business & Leadership', slug: 'business-leadership', description: 'Management, venture strategy, innovation, and economics.' },
  { id: 3, name: 'Science & Engineering', slug: 'science-engineering', description: 'Quantum physics, biology, mathematics, and aerospace.' },
  { id: 4, name: 'Design & Architecture', slug: 'design-architecture', description: 'UI/UX design systems, typography, and structural art.' },
  { id: 5, name: 'Philosophy & Essays', slug: 'philosophy-essays', description: 'Critical thinking, ethics, and contemporary thought.' }
];

export const INITIAL_DOCUMENTS = [
  {
    id: 1,
    title: 'Building Enterprise Applications with Spring Boot & Oracle',
    author: 'Dr. Sarah Vance',
    description: 'A comprehensive guide to building resilient, cloud-native microservices backed by enterprise Oracle database clusters and modern web architectures.',
    categoryId: 1,
    categoryName: 'Technology & Coding',
    categorySlug: 'technology-coding',
    fileName: 'spring-boot-oracle-guide.pdf',
    originalFilename: 'spring-boot-oracle-guide.pdf',
    fileSize: 3472,
    fileType: 'application/pdf',
    coverImagePath: '',
    pageCount: 4,
    language: 'English',
    publishedYear: 2025,
    isFeatured: true,
    isPublished: true,
    viewCount: 142,
    downloadCount: 38,
    uploadedByUsername: 'Sourav',
    createdAt: '09-09-2026 15:28:40',
    updatedAt: '09-09-2026 15:28:40',
    pages: [
      {
        pageNumber: 1,
        title: 'Chapter 1: Modern Cloud-Native Architectures',
        content: `In the contemporary landscape of high-concurrency systems, enterprise engineering teams require robust, fault-tolerant foundations. Spring Boot 3 paired with enterprise Oracle Database clusters represents one of the most battle-tested pairings in mission-critical applications.\n\nKey architectural pillars covered in this volume:\n1. Non-blocking I/O and reactive connection pools.\n2. Byte-range chunked media and PDF streaming mechanisms.\n3. Zero-loss transaction guarantees with Oracle ACID semantics.\n4. Stateless JWT authorization filter chains for microservice ecosystems.`
      },
      {
        pageNumber: 2,
        title: 'Chapter 2: Byte-Range PDF & Document Streaming',
        content: `Standard file download mechanics require transferring the entire binary payload before a client can render the first page. By implementing HTTP 206 Partial Content range requests, our application streams precisely the byte chunks required for the immediate viewport.\n\nBenefits of chunked byte-range delivery:\n• Sub-second initial document rendering on mobile networks.\n• Reduced memory footprint on the API server.\n• Random access to arbitrary pages without linear reading penalties.`
      },
      {
        pageNumber: 3,
        title: 'Chapter 3: Resilient Data Models & Schema Design',
        content: `Data integrity is paramount. Using JPA entity mappings with Oracle sequences (e.g. SEQ_DOCUMENT_ID, SEQ_USER_ID), every record benefits from index-optimized lookups and clean foreign key relational constraints.\n\nDatabase schema optimizations:\n• B-Tree indexing on document titles and category foreign keys.\n• Automatic audit timestamp triggers for compliance tracking.\n• Isolated reading history tables tracking per-user progress.`
      },
      {
        pageNumber: 4,
        title: 'Chapter 4: Deployment & Cloud Observability',
        content: `Continuous deployment pipelines automate multi-stage Docker builds, stripping compilation tooling to leave lightweight, secure JRE runtime containers.\n\nConclusion:\nBy adhering to modular decoupled design principles, the Scribd digital library architecture scales horizontally while guaranteeing seamless reader experiences across all screen form factors.`
      }
    ]
  },
  {
    id: 2,
    title: "The Innovator's Architecture: Scaling High-Impact Teams",
    author: 'Marcus Thorne',
    description: 'Strategic patterns for scaling engineering organizations, cultivating high-performance culture, and driving sustainable business velocity.',
    categoryId: 2,
    categoryName: 'Business & Leadership',
    categorySlug: 'business-leadership',
    fileName: 'innovators-architecture.pdf',
    originalFilename: 'innovators-architecture.pdf',
    fileSize: 2770,
    fileType: 'application/pdf',
    coverImagePath: '',
    pageCount: 3,
    language: 'English',
    publishedYear: 2024,
    isFeatured: true,
    isPublished: true,
    viewCount: 98,
    downloadCount: 24,
    uploadedByUsername: 'Sourav',
    createdAt: '09-09-2026 15:28:40',
    updatedAt: '09-09-2026 15:28:40',
    pages: [
      {
        pageNumber: 1,
        title: 'Introduction: The Velocity Paradox',
        content: `Why do organizations slow down as they grow? The paradox of engineering velocity lies in coordination friction, implicit dependencies, and cognitive overload. High-impact teams solve this not by adding more management, but by structuring clear interface boundaries between autonomous squads.`
      },
      {
        pageNumber: 2,
        title: 'Framework: Empowered Autonomous Squads',
        content: `Autonomous teams need context, not control. Provide clear outcome-oriented metrics (OKRs) rather than prescribed task lists. When engineers have direct ownership over customer outcomes, decision velocity increases by 300%.`
      },
      {
        pageNumber: 3,
        title: 'Execution: Building Sustainable Momentum',
        content: `Sustainable pace prevents burnout and technical debt accumulation. The best leaders institutionalize continuous refactoring, automated testing harnesses, and rapid feedback loops into everyday engineering culture.`
      }
    ]
  },
  {
    id: 3,
    title: 'Foundations of Quantum Computing & Information Theory',
    author: 'Elena Rostova, Ph.D.',
    description: 'An accessible yet rigorous exploration of quantum mechanics, qubits, entanglement, quantum algorithms, and future computing horizons.',
    categoryId: 3,
    categoryName: 'Science & Engineering',
    categorySlug: 'science-engineering',
    fileName: 'quantum-computing-foundations.pdf',
    originalFilename: 'quantum-computing-foundations.pdf',
    fileSize: 4215,
    fileType: 'application/pdf',
    coverImagePath: '',
    pageCount: 3,
    language: 'English',
    publishedYear: 2026,
    isFeatured: false,
    isPublished: true,
    viewCount: 65,
    downloadCount: 19,
    uploadedByUsername: 'Sourav',
    createdAt: '09-09-2026 15:28:40',
    updatedAt: '09-09-2026 15:28:40',
    pages: [
      {
        pageNumber: 1,
        title: 'Principles: Qubits and Superposition',
        content: `Classical computation operates on binary states (0 or 1). Quantum computing exploits the quantum mechanical phenomenon of superposition, allowing quantum states |ψ⟩ = α|0⟩ + β|1⟩ to exist simultaneously across complex vector spaces.`
      },
      {
        pageNumber: 2,
        title: 'Entanglement: Non-Local Quantum Correlation',
        content: `When pairs of particles interact physically and become entangled, the quantum state of each particle cannot be described independently. This enables exponential state compression and revolutionary quantum communication protocols.`
      },
      {
        pageNumber: 3,
        title: 'Algorithms: Shor and Grover Accelerations',
        content: `Quantum algorithms solve specific computational classes exponentially faster than any classical Turing machine. Shor’s algorithm for prime factorization and Grover’s algorithm for unstructured search are transforming cybersecurity and cryptographic science.`
      }
    ]
  }
];
