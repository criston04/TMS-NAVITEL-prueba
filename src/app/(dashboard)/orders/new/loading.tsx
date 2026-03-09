import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PageWrapper } from '@/components/page-wrapper';

/**
 * Skeleton de carga para la página de nueva orden
 */
export default function NewOrderLoading() {
  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-56 mt-1" />
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`step-${i}`} className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="hidden sm:block">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-24 mt-1" />
              </div>
              {i < 3 && <Skeleton className="h-0.5 w-12 ml-2" />}
            </div>
          ))}
        </div>

        {/* Form cards */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-44" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
