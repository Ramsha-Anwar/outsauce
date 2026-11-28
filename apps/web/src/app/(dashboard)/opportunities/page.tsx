'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw, Search } from 'lucide-react';

const formatDate = (dateString: string | null) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

interface Opportunity {
  id: string;
  source_key: string;
  title: string;
  company_name: string | null;
  location: string | null;
  status: string;
  published_at: string | null;
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  
  // Filters & Pagination
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('page_size', pageSize.toString());
      if (sourceFilter) params.set('source_key', sourceFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (searchQuery) params.set('q', searchQuery);

      const data = await apiClient<{ items: Opportunity[]; totalCount: number }>(
        `/api/opportunities?${params.toString()}`
      );
      setOpportunities(data.items);
      setTotalCount(data.totalCount);
    } catch {
      toast.error('Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  }, [page, sourceFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const handleSync = async (sourceKey: string) => {
    setSyncing(sourceKey);
    try {
      const res = await apiClient<{ itemsFetched: number }>('/api/opportunities/sync', {
        method: 'POST',
        body: JSON.stringify({ sourceKey, criteria: {} }),
      });
      toast.success(`Synced ${res.itemsFetched} new jobs from ${sourceKey}`);
      fetchOpportunities();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Opportunities</h1>
          <p className="text-muted-foreground">Discover jobs from multiple sources with full provenance.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => handleSync('himalayas')}
            disabled={!!syncing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing === 'himalayas' ? 'animate-spin' : ''}`} />
            Sync Himalayas
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleSync('skillzdunya')}
            disabled={!!syncing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing === 'skillzdunya' ? 'animate-spin' : ''}`} />
            Sync SkillzDunya
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search titles or companies..."
                className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              />
            </div>
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Sources</option>
              <option value="himalayas">Himalayas</option>
              <option value="skillzdunya">SkillzDunya</option>
            </select>
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="stale">Stale</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : opportunities.length === 0 ? (
            <div className="text-center py-12 border rounded-lg border-dashed">
              <h3 className="text-lg font-medium mb-1">No opportunities found</h3>
              <p className="text-muted-foreground text-sm mb-4">Try adjusting your filters or sync a source.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Published</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opportunities.map((opp) => (
                    <TableRow key={opp.id}>
                      <TableCell className="font-medium">
                        <Link href={`/opportunities/${opp.id}`} className="hover:underline hover:text-primary">
                          {opp.title}
                        </Link>
                      </TableCell>
                      <TableCell>{opp.company_name || '—'}</TableCell>
                      <TableCell>{opp.location || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {opp.source_key}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={opp.status === 'open' ? 'default' : opp.status === 'closed' ? 'destructive' : 'secondary'}
                        >
                          {opp.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(opp.published_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {!loading && totalCount > 0 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * pageSize >= totalCount}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}