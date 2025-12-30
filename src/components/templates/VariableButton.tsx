import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface VariableButtonProps {
  variable: {
    key: string;
    label: string;
    icon: string;
    description: string;
  };
  onClick: (variable: string) => void;
}

export function VariableButton({ variable, onClick }: VariableButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onClick(variable.key)}
          className="h-8 text-xs transition-all hover:scale-105 hover:border-primary"
        >
          <span className="mr-1">{variable.icon}</span>
          {`{{${variable.key}}}`}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{variable.label}</p>
        <p className="text-xs text-muted-foreground">{variable.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
