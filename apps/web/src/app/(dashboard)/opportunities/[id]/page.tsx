'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ExternalLink, MapPin, Building2, Globe, Briefcase, Calendar } from 'lucide-react';

interface Opportunity {
  id: string;
  source_key: string;
  source_url: string;
  title: string;
  company_name: string | null;
  location: string | null;
  description_excerpt: string | null;
  work_mode: string;
  employment_type: string;
  seniority: string | null;
  categories: string[];
  remote_regions: string[];
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: string;
  status: string;
  published_at: string | null;
  deadline: string | null;
  apply_url: string | null;
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatSalary = (opp: Opportunity) => {
  if (opp.salary_min === null && opp.salary_max === null) return 'Not specified';
  
  const currency = opp.salary_currency || '';
  const period = opp.salary_period !== 'unknown' ? ` / ${opp.salary_period}` : '';
  
  if (opp.salary_min !== null && opp.salary_max !== null) {
    if (opp.salary_min === opp.salary_max) {
      return `${currency} ${opp.salary_min.toLocaleString()}${period}`;
    }
    return `${currency} ${opp.salary_min.toLocaleString()} – ${opp.salary_max.toLocaleString()}${period}`;
  }
  
  if (opp.salary_min !== null) return `${currency} ${opp.salary_min.toLocaleString()}+${period}`;
  if (opp.salary_max !== null) return `Up to ${currency} ${opp.salary_max.toLocaleString()}${period}`;
  return 'Not specified';
};

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOpportunity() {
      try {
        const data = await apiClient<Opportunity>(`/api/opportunities/${id}`);
        setOpportunity(data);
      } catch {
        toast.error('Failed to load opportunity details');
      } finally {
        setLoading(false);
      }
    }
    fetchOpportunity();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-2">Opportunity not found</h2>
        <Button variant="outline" onClick={() => router.push('/opportunities')}>
          Back to opportunities
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <Button 
        variant="ghost" 
        className="mb-4" 
        onClick={() => router.push('/opportunities')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to opportunities
      </Button>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="capitalize text-sm py-1">
            {opportunity.source_key}
          </Badge>
          <Badge 
            variant={opportunity.status === 'open' ? 'default' : opportunity.status === 'closed' ? 'destructive' : 'secondary'}
            className="text-sm py-1"
          >
            {opportunity.status.toUpperCase()}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Published {formatDate(opportunity.published_at)}
          </span>
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight">{opportunity.title}</h1>
        
        <div className="flex items-center gap-4 text-lg text-muted-foreground flex-wrap">
          {opportunity.company_name && (
            <span className="flex items-center gap-1">
              <Building2 className="h-4 w-4" /> {opportunity.company_name}
            </span>
          )}
          {opportunity.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {opportunity.location}
            </span>
          )}
          <span className="flex items-center gap-1 capitalize">
            <Globe className="h-4 w-4" /> {opportunity.work_mode}
          </span>
          <span className="flex items-center gap-1 capitalize">
            <Briefcase className="h-4 w-4" /> {opportunity.employment_type.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {opportunity.description_excerpt || 'No description provided by the source.'}
              </p>
            </CardContent>
          </Card>

          {opportunity.categories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Categories & Skills</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {opportunity.categories.map((cat) => (
                  <Badge key={cat} variant="secondary">
                    {cat}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Salary</h4>
                <p className="text-sm font-medium">{formatSalary(opportunity)}</p>
              </div>
              
              {opportunity.remote_regions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Eligible Regions</h4>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {opportunity.remote_regions.map((region) => (
                      <Badge key={region} variant="outline" className="text-xs">
                        {region}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {opportunity.deadline && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Deadline</h4>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {formatDate(opportunity.deadline)}
                  </p>
                </div>
              )}
              
              {opportunity.seniority && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Seniority</h4>
                  <p className="text-sm font-medium">{opportunity.seniority}</p>
                </div>
              )}
            </CardContent>
          </Card>

                   <div className="flex flex-col gap-3">
            {opportunity.apply_url && (
              <a
                href={opportunity.apply_url}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ className: 'w-full' })}
              >
                Apply Now <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            )}
            <a
              href={opportunity.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'outline', className: 'w-full' })}
            >
              View Original <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}