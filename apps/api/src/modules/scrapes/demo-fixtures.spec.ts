import { createScrapeSchema } from './dto/create-scrape.dto';
import { getDemoFixtures } from './demo-fixtures';

const criteria = { keywords: ['engineer'] };

describe('demo fixture hunts', () => {
  it('returns only stable, explicitly labeled sample records', () => {
    const results = getDemoFixtures(criteria);

    expect(results.length).toBeGreaterThan(0);
    expect(results).toEqual(getDemoFixtures(criteria));
    expect(
      results.every(
        (result) =>
          result.source === 'demo' &&
          result.source_url === null &&
          result.metadata.data_origin === 'demo_fixture' &&
          typeof result.metadata.disclaimer === 'string',
      ),
    ).toBe(true);
  });

  it('applies search, location, remote, and salary criteria', () => {
    const results = getDemoFixtures({
      keywords: ['react'],
      location: 'Pakistan',
      remote: true,
      salary_min: 150_000,
      salary_max: 300_000,
    });

    expect(results).toHaveLength(1);
    expect(results[0].title).toContain('React');
  });

  it('returns no results when the criteria do not match a fixture', () => {
    expect(getDemoFixtures({ keywords: ['marine biologist'] })).toEqual([]);
  });

  it('does not allow demo listings to be mixed with live sources', () => {
    const base = {
      name: 'Sample hunt',
      criteria,
    };

    expect(
      createScrapeSchema.safeParse({ ...base, sources: ['demo'] }).success,
    ).toBe(true);
    expect(
      createScrapeSchema.safeParse({
        ...base,
        sources: ['demo', 'linkedin'],
      }).success,
    ).toBe(false);
  });
});
