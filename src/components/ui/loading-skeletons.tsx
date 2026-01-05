import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";

// Skeleton for card items (lists, templates)
export function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4 mt-2" />
      </CardContent>
    </Card>
  );
}

// Skeleton for campaign form
export function SkeletonCampaignForm() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-11 w-full" />
      </CardContent>
    </Card>
  );
}

// Skeleton for preview/status cards
export function SkeletonPreviewCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-32 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

// Skeleton for table rows (campaign history)
export function SkeletonTableRows({ rows = 3 }: { rows?: number }) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
          <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
          <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

// Skeleton for settings cards
export function SkeletonSettingsCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-10 w-40" />
      </CardContent>
    </Card>
  );
}

// Skeleton for tabs
export function SkeletonTabs() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SkeletonCampaignForm />
        </div>
        <div className="space-y-6">
          <SkeletonPreviewCard />
          <SkeletonPreviewCard />
        </div>
      </div>
    </div>
  );
}

// Skeleton for CampaignSchedulePreview
export function SkeletonSchedulePreview() {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-40" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Grid de 4 estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center p-3 bg-background rounded-lg border">
              <Skeleton className="h-5 w-5 rounded mb-1" />
              <Skeleton className="h-8 w-12 my-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>

        {/* Detalhes */}
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>

        {/* Barra de progresso */}
        <div className="pt-2">
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="flex justify-between mt-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
