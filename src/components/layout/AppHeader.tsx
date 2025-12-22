import { SidebarTrigger } from '@/components/ui/sidebar';

interface AppHeaderProps {
  title: string;
  description?: string;
}

export function AppHeader({ title, description }: AppHeaderProps) {
  return (
    <header className="border-b border-border bg-card px-6 py-4">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden" />
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </header>
  );
}