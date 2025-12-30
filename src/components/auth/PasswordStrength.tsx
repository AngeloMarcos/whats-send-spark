import { useMemo } from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
}

interface Requirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: Requirement[] = [
  { label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { label: 'Letra maiúscula', test: (p) => /[A-Z]/.test(p) },
  { label: 'Número', test: (p) => /[0-9]/.test(p) },
  { label: 'Caractere especial', test: (p) => /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'`~]/.test(p) },
];

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { passed, strength, strengthLabel, strengthColor } = useMemo(() => {
    const passedReqs = requirements.filter(r => r.test(password));
    const passedCount = passedReqs.length;
    
    let label: string;
    let color: string;
    
    if (password.length === 0) {
      label = '';
      color = 'bg-muted';
    } else if (passedCount <= 1) {
      label = 'Fraca';
      color = 'bg-destructive';
    } else if (passedCount <= 2) {
      label = 'Razoável';
      color = 'bg-amber-500';
    } else if (passedCount <= 3) {
      label = 'Boa';
      color = 'bg-amber-400';
    } else {
      label = 'Forte';
      color = 'bg-green-500';
    }
    
    return {
      passed: passedReqs,
      strength: passedCount,
      strengthLabel: label,
      strengthColor: color,
    };
  }, [password]);

  if (password.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                level <= strength ? strengthColor : 'bg-muted'
              }`}
            />
          ))}
        </div>
        {strengthLabel && (
          <p className={`text-xs font-medium ${
            strength <= 1 ? 'text-destructive' : 
            strength <= 2 ? 'text-amber-600' :
            strength <= 3 ? 'text-amber-500' :
            'text-green-600'
          }`}>
            Força: {strengthLabel}
          </p>
        )}
      </div>

      {/* Requirements Checklist */}
      <ul className="grid grid-cols-2 gap-1.5">
        {requirements.map((req, index) => {
          const isPassed = req.test(password);
          return (
            <li 
              key={index}
              className={`flex items-center gap-1.5 text-xs ${
                isPassed ? 'text-green-600' : 'text-muted-foreground'
              }`}
            >
              {isPassed ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
              {req.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Export validation schema for use in forms
export const passwordRequirements = requirements;

export function validateStrongPassword(password: string): { valid: boolean; errors: string[] } {
  const errors = requirements
    .filter(r => !r.test(password))
    .map(r => r.label);
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
