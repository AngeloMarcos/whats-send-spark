import { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

interface MultiTagInputProps {
  label: string;
  description?: string;
  placeholder?: string;
  value: string[];
  onChange: (value: string[]) => void;
  optional?: boolean;
}

export function MultiTagInput({
  label,
  description,
  placeholder = "Digite e pressione Enter...",
  value,
  onChange,
  optional = true,
}: MultiTagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmedValue = inputValue.trim();
      if (trimmedValue && !value.includes(trimmedValue)) {
        onChange([...value, trimmedValue]);
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">{label}</Label>
        {optional && <Badge variant="secondary" className="text-xs">Opcional</Badge>}
      </div>
      
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      
      <div className="flex flex-wrap items-center gap-2 p-2 border rounded-md min-h-[42px] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        {value.map((tag, index) => (
          <Badge 
            key={index} 
            variant="secondary" 
            className="pl-2 pr-1 py-0.5 gap-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="ml-1 hover:bg-destructive/20 rounded p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          type="text"
          placeholder={value.length === 0 ? placeholder : ""}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-[120px] border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
    </div>
  );
}
