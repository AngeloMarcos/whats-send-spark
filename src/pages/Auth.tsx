import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLoginRateLimit, formatRemainingTime } from '@/hooks/useLoginRateLimit';
import { useAuditLog } from '@/hooks/useAuditLog';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { PasswordStrength, validateStrongPassword } from '@/components/auth/PasswordStrength';
import { MessageSquare, Loader2, Eye, EyeOff, ShieldAlert, Mail } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Email inválido');

// Strong password schema
const strongPasswordSchema = z.string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Deve conter pelo menos 1 letra maiúscula')
  .regex(/[0-9]/, 'Deve conter pelo menos 1 número')
  .regex(/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'`~]/, 'Deve conter pelo menos 1 caractere especial');

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Rate limiting
  const { isBlocked, remainingTime, attemptsRemaining, recordAttempt } = useLoginRateLimit();
  
  // Audit logging
  const { logLogin } = useAuditLog();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validateForm = (isSignUp: boolean) => {
    try {
      emailSchema.parse(email);
      
      if (isSignUp) {
        // For signup, use strong password validation
        strongPasswordSchema.parse(password);
      } else {
        // For login, just check it's not empty
        if (password.length === 0) {
          throw new z.ZodError([{ 
            code: 'too_small', 
            minimum: 1, 
            type: 'string', 
            inclusive: true, 
            exact: false, 
            message: 'Senha é obrigatória', 
            path: ['password'] 
          }]);
        }
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      }
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check rate limit
    if (isBlocked) {
      toast({
        title: 'Muitas tentativas',
        description: `Aguarde ${formatRemainingTime(remainingTime)} antes de tentar novamente.`,
        variant: 'destructive',
      });
      return;
    }
    
    if (!validateForm(false)) return;

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      // Record failed attempt
      recordAttempt(false);
      logLogin(false, email);
      
      toast({
        title: 'Erro ao entrar',
        description: error.message === 'Invalid login credentials' 
          ? 'Email ou senha incorretos'
          : error.message,
        variant: 'destructive',
      });
    } else {
      // Record successful attempt
      recordAttempt(true);
      logLogin(true, email);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: 'Email necessário',
        description: 'Digite seu email para recuperar a senha',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Email enviado!',
        description: 'Verifique sua caixa de entrada para redefinir a senha.',
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(true)) return;

    // Additional password strength check
    const passwordValidation = validateStrongPassword(password);
    if (!passwordValidation.valid) {
      toast({
        title: 'Senha fraca',
        description: `Sua senha precisa: ${passwordValidation.errors.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(email, password, fullName);
    setIsLoading(false);

    if (error) {
      let message = error.message;
      if (error.message.includes('already registered')) {
        message = 'Este email já está cadastrado. Tente fazer login.';
      }
      toast({
        title: 'Erro ao cadastrar',
        description: message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Conta criada com sucesso!',
        description: 'Você já pode acessar o sistema.',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold">Disparo em Massa</CardTitle>
          </div>
          <CardDescription>
            Gerencie suas campanhas de WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Rate limit warning */}
          {isBlocked && (
            <Alert variant="destructive" className="mb-4">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                Muitas tentativas de login. Aguarde {formatRemainingTime(remainingTime)} para tentar novamente.
              </AlertDescription>
            </Alert>
          )}
          
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isBlocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isBlocked}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {!isBlocked && attemptsRemaining < 5 && attemptsRemaining > 0 && (
                    <p className="text-xs text-amber-600">
                      {attemptsRemaining} tentativa{attemptsRemaining !== 1 ? 's' : ''} restante{attemptsRemaining !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-sm text-muted-foreground h-auto"
                    onClick={handleForgotPassword}
                    disabled={isLoading}
                  >
                    <Mail className="mr-1 h-3 w-3" />
                    Esqueci minha senha
                  </Button>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || isBlocked}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {/* Password strength indicator */}
                  <PasswordStrength password={password} />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    'Cadastrar'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
