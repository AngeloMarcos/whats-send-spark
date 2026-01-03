import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FlaskConical, Plus, Star, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import type { TestContact } from '@/types/database';
import { formatPhoneForDisplay } from '@/lib/phoneValidation';

export function TestContactsSection() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<TestContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });

  const fetchContacts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('test_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts((data || []) as TestContact[]);
    } catch (error) {
      console.error('Error fetching test contacts:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os contatos de teste.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [user]);

  const handleAddContact = async () => {
    if (!user || !newContact.name.trim() || !newContact.phone.trim()) {
      toast({
        title: 'Dados incompletos',
        description: 'Preencha nome e telefone.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const isFirst = contacts.length === 0;
      
      const { error } = await supabase
        .from('test_contacts')
        .insert({
          user_id: user.id,
          name: newContact.name.trim(),
          phone: newContact.phone.trim(),
          is_default: isFirst,
        });

      if (error) throw error;

      toast({
        title: 'Contato adicionado',
        description: `${newContact.name} foi adicionado como contato de teste.`,
      });

      setNewContact({ name: '', phone: '' });
      setDialogOpen(false);
      fetchContacts();
    } catch (error) {
      console.error('Error adding test contact:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o contato.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (contactId: string) => {
    if (!user) return;

    try {
      // Remove default from all
      await supabase
        .from('test_contacts')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Set new default
      const { error } = await supabase
        .from('test_contacts')
        .update({ is_default: true })
        .eq('id', contactId);

      if (error) throw error;

      toast({
        title: 'Padrão atualizado',
        description: 'Contato definido como padrão para testes.',
      });

      fetchContacts();
    } catch (error) {
      console.error('Error setting default:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o contato padrão.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('test_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      toast({
        title: 'Contato removido',
        description: 'Contato de teste removido com sucesso.',
      });

      fetchContacts();
    } catch (error) {
      console.error('Error deleting test contact:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o contato.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          <CardTitle>Contatos de Teste</CardTitle>
        </div>
        <CardDescription>
          Cadastre números para receber mensagens em modo de teste. 
          As mensagens serão enviadas para o contato padrão (★) quando o modo de teste estiver ativo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : contacts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="w-[100px]">Padrão</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>{formatPhoneForDisplay(contact.phone)}</TableCell>
                  <TableCell>
                    {contact.is_default ? (
                      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Padrão
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(contact.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(contact.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum contato de teste cadastrado.</p>
            <p className="text-sm">Adicione um contato para testar suas campanhas.</p>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Contato de Teste
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Contato de Teste</DialogTitle>
              <DialogDescription>
                Adicione um número de telefone para receber mensagens de teste.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="Ex: Meu WhatsApp"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (com DDD)</Label>
                <Input
                  id="phone"
                  placeholder="Ex: 11999998888"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddContact} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
