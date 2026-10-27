-- A demo hunt is a distinct mode, never a mixture of demo and live sources.
ALTER TABLE public.scrape_jobs
    ADD CONSTRAINT scrape_jobs_demo_source_is_exclusive
    CHECK (
        NOT ('demo'::public.scrape_source = ANY(sources))
        OR sources = ARRAY['demo'::public.scrape_source]
    );

-- Demo rows must remain visibly identified and cannot claim a source URL.
ALTER TABLE public.scrape_results
    ADD CONSTRAINT scrape_results_demo_provenance
    CHECK (
        source <> 'demo'::public.scrape_source
        OR (
            source_url IS NULL
            AND metadata ->> 'data_origin' = 'demo_fixture'
        )
    );

ALTER TABLE public.leads
    ADD CONSTRAINT leads_demo_provenance
    CHECK (
        source IS DISTINCT FROM 'demo'::public.scrape_source
        OR metadata ->> 'data_origin' = 'demo_fixture'
    );
