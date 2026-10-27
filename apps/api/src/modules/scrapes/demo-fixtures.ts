import type { CreateScrapeInput } from './dto/create-scrape.dto';

type ScrapeCriteria = CreateScrapeInput['criteria'];

export interface DemoScrapeResult {
  source: 'demo';
  source_url: null;
  title: string;
  description: string;
  company: string;
  location: string;
  salary_range: string;
  salary_min: number;
  salary_max: number;
  metadata: Record<string, unknown>;
}

const DEMO_FIXTURES: readonly DemoScrapeResult[] = [
  {
    source: 'demo',
    source_url: null,
    title: 'Sample: Backend Software Engineer',
    description:
      'Illustrative role requiring TypeScript, Node.js, PostgreSQL, and API design. This record is sample data and is not an open vacancy.',
    company: 'Sample Employer Alpha',
    location: 'Lahore, Pakistan',
    salary_range: 'PKR 160,000–240,000 / month',
    salary_min: 160_000,
    salary_max: 240_000,
    metadata: {
      data_origin: 'demo_fixture',
      remote: false,
      experience_level: 'mid',
      job_type: 'full-time',
      disclaimer: 'Illustrative sample only. This is not a live job listing.',
    },
  },
  {
    source: 'demo',
    source_url: null,
    title: 'Sample: Data Analyst',
    description:
      'Illustrative role involving SQL, Python, dashboards, and business reporting. This record is sample data and is not an open vacancy.',
    company: 'Sample Employer Beta',
    location: 'Karachi, Pakistan',
    salary_range: 'PKR 100,000–160,000 / month',
    salary_min: 100_000,
    salary_max: 160_000,
    metadata: {
      data_origin: 'demo_fixture',
      remote: false,
      experience_level: 'entry',
      job_type: 'full-time',
      disclaimer: 'Illustrative sample only. This is not a live job listing.',
    },
  },
  {
    source: 'demo',
    source_url: null,
    title: 'Sample: AI Engineer',
    description:
      'Illustrative role exploring Python, machine learning, retrieval, and language models. This record is sample data and is not an open vacancy.',
    company: 'Sample Employer Gamma',
    location: 'Islamabad, Pakistan',
    salary_range: 'PKR 220,000–320,000 / month',
    salary_min: 220_000,
    salary_max: 320_000,
    metadata: {
      data_origin: 'demo_fixture',
      remote: false,
      experience_level: 'senior',
      job_type: 'full-time',
      disclaimer: 'Illustrative sample only. This is not a live job listing.',
    },
  },
  {
    source: 'demo',
    source_url: null,
    title: 'Sample: Frontend React Developer',
    description:
      'Illustrative remote role using React, TypeScript, and accessible interface design. This record is sample data and is not an open vacancy.',
    company: 'Sample Employer Delta',
    location: 'Remote — Pakistan',
    salary_range: 'PKR 170,000–260,000 / month',
    salary_min: 170_000,
    salary_max: 260_000,
    metadata: {
      data_origin: 'demo_fixture',
      remote: true,
      experience_level: 'mid',
      job_type: 'full-time',
      disclaimer: 'Illustrative sample only. This is not a live job listing.',
    },
  },
  {
    source: 'demo',
    source_url: null,
    title: 'Sample: Marketing Specialist',
    description:
      'Illustrative role involving campaign planning, analytics, and content coordination. This record is sample data and is not an open vacancy.',
    company: 'Sample Employer Epsilon',
    location: 'Rawalpindi, Pakistan',
    salary_range: 'PKR 90,000–150,000 / month',
    salary_min: 90_000,
    salary_max: 150_000,
    metadata: {
      data_origin: 'demo_fixture',
      remote: false,
      experience_level: 'entry',
      job_type: 'full-time',
      disclaimer: 'Illustrative sample only. This is not a live job listing.',
    },
  },
];

export function getDemoFixtures(criteria: ScrapeCriteria): DemoScrapeResult[] {
  const keywords = (criteria.keywords ?? [])
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
  const location = criteria.location?.trim().toLowerCase();

  return DEMO_FIXTURES.filter((fixture) => {
    const searchableText = [
      fixture.title,
      fixture.description,
      fixture.company,
      fixture.location,
    ]
      .join(' ')
      .toLowerCase();

    if (keywords.length > 0 && !keywords.some((keyword) => searchableText.includes(keyword))) {
      return false;
    }

    if (location && !fixture.location.toLowerCase().includes(location)) {
      return false;
    }

    if (criteria.remote === true && fixture.metadata.remote !== true) {
      return false;
    }

    if (
      criteria.salary_min !== undefined &&
      fixture.salary_max < criteria.salary_min
    ) {
      return false;
    }

    if (
      criteria.salary_max !== undefined &&
      fixture.salary_min > criteria.salary_max
    ) {
      return false;
    }

    if (
      criteria.experience_level &&
      criteria.experience_level !== 'any' &&
      fixture.metadata.experience_level !== criteria.experience_level
    ) {
      return false;
    }

    if (
      criteria.job_type &&
      fixture.metadata.job_type !== criteria.job_type
    ) {
      return false;
    }

    return true;
  }).map((fixture) => ({
    ...fixture,
    metadata: { ...fixture.metadata },
  }));
}
