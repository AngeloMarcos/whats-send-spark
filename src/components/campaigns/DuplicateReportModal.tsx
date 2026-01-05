import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  UserCheck,
  Users,
  Copy,
  ChevronDown,
  ChevronUp,
  XCircle,
  CheckCircle2,
  History,
} from 'lucide-react';

export interface DuplicateReport {
  duplicatesInFile: string[];
  alreadySentContacts: Array<{
    phone: string;
    campaigns: Array<{ name: string; sentAt: string }>;
  }>;
  newContacts: number;
  totalContacts: number;
}

interface DuplicateReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: DuplicateReport;
  onRemoveDuplicates: () => void;
  onKeepAll: () => void;
}

export function DuplicateReportModal({
  open,
  onOpenChange,
  report,
  onRemoveDuplicates,
  onKeepAll,
}: DuplicateReportModalProps) {
  const [expandedInFile, setExpandedInFile] = useState(false);
  const [expandedSent, setExpandedSent] = useState(false);

  const totalDuplicates = report.duplicatesInFile.length + report.alreadySentContacts.length;
  const hasDuplicates = totalDuplicates > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasDuplicates ? (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Duplicatas Encontradas
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Nenhuma Duplicata
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Relatório de análise de contatos antes do envio
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <UserCheck className="h-5 w-5 text-emerald-500 mb-1" />
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {report.newContacts}
              </span>
              <span className="text-xs text-muted-foreground">Novos</span>
            </div>
            
            <div className="flex flex-col items-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Copy className="h-5 w-5 text-amber-500 mb-1" />
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {report.duplicatesInFile.length}
              </span>
              <span className="text-xs text-muted-foreground text-center">
                Duplicados no Arquivo
              </span>
            </div>
            
            <div className="flex flex-col items-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <History className="h-5 w-5 text-red-500 mb-1" />
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                {report.alreadySentContacts.length}
              </span>
              <span className="text-xs text-muted-foreground text-center">
                Já Enviados
              </span>
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total no arquivo:</span>
            </div>
            <Badge variant="secondary">{report.totalContacts}</Badge>
          </div>

          {/* Duplicates in File Details */}
          {report.duplicatesInFile.length > 0 && (
            <div>
              <Button 
                variant="ghost" 
                className="w-full justify-between"
                onClick={() => setExpandedInFile(!expandedInFile)}
              >
                <span className="flex items-center gap-2">
                  <Copy className="h-4 w-4 text-amber-500" />
                  Duplicados no Arquivo ({report.duplicatesInFile.length})
                </span>
                {expandedInFile ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              {expandedInFile && (
                <div>
                  <ScrollArea className="h-32 rounded-md border p-3">
                    <div className="space-y-1">
                      {report.duplicatesInFile.map((phone, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <XCircle className="h-3 w-3 text-amber-500" />
                          {phone}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground mt-2">
                    Estes números aparecem mais de uma vez no arquivo.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Already Sent Details */}
          {report.alreadySentContacts.length > 0 && (
            <div>
              <Button 
                variant="ghost" 
                className="w-full justify-between"
                onClick={() => setExpandedSent(!expandedSent)}
              >
                <span className="flex items-center gap-2">
                  <History className="h-4 w-4 text-red-500" />
                  Já Enviados Anteriormente ({report.alreadySentContacts.length})
                </span>
                {expandedSent ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              {expandedSent && (
                <div>
                  <ScrollArea className="h-40 rounded-md border p-3">
                    <div className="space-y-3">
                      {report.alreadySentContacts.map((contact, idx) => (
                        <div key={idx} className="border-b pb-2 last:border-0">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <XCircle className="h-3 w-3 text-red-500" />
                            {contact.phone}
                          </div>
                          <div className="ml-5 mt-1 space-y-0.5">
                            {contact.campaigns.map((campaign, cIdx) => (
                              <p key={cIdx} className="text-xs text-muted-foreground">
                                • {campaign.name} - {new Date(campaign.sentAt).toLocaleDateString('pt-BR')}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground mt-2">
                    Estes números já receberam mensagens em campanhas anteriores.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {hasDuplicates ? (
            <>
              <Button variant="outline" onClick={onKeepAll}>
                Manter Todos
              </Button>
              <Button onClick={onRemoveDuplicates}>
                Remover Duplicados ({totalDuplicates})
              </Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)}>
              Continuar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
