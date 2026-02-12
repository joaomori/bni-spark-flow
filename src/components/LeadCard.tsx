import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Mail, Phone, Calendar, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  next_contact_date: string | null;
  source: string | null;
  notes: string | null;
  teams?: {
    name: string;
  };
}

interface LeadCardProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
}

const statusColors: Record<string, string> = {
  new: "bg-accent text-accent-foreground",
  contacted: "bg-primary text-primary-foreground",
  interview_scheduled: "bg-warning text-warning-foreground",
  interview_done: "bg-success text-success-foreground",
  scheduled_interview: "bg-warning text-warning-foreground",
  waiting_return: "bg-muted text-muted-foreground",
  future_contact: "bg-secondary text-secondary-foreground",
  waiting_signature: "bg-warning text-warning-foreground",
  negotiating: "bg-warning text-warning-foreground",
  closed: "bg-success text-success-foreground",
  lost: "bg-destructive text-destructive-foreground",
};

const statusLabels: Record<string, string> = {
  new: "Novo Contato",
  contacted: "Contato Feito",
  interview_scheduled: "Entrevista Agendada",
  interview_done: "Entrevista Realizada",
  scheduled_interview: "Marcou Entrevista",
  waiting_return: "Aguardando Retorno",
  future_contact: "Contato Futuro",
  waiting_signature: "Aguardando Assinatura",
  negotiating: "Em Negociação",
  closed: "Finalizado Ganho",
  lost: "Finalizado Perdido",
};

export function LeadCard({ lead, onEdit, onDelete }: LeadCardProps) {
  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.phone) {
      // Remove non-numeric characters from phone
      const cleanPhone = lead.phone.replace(/\D/g, '');
      // Open WhatsApp with the phone number
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  };

  return (
    <Card 
      className="shadow-card hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onEdit(lead)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{lead.name}</CardTitle>
          <Badge className={statusColors[lead.status] || "bg-secondary"}>
            {statusLabels[lead.status] || lead.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {lead.teams && (
          <div className="text-sm">
            <span className="text-muted-foreground">Equipe: </span>
            <span className="font-medium">{lead.teams.name}</span>
          </div>
        )}
        {lead.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        {lead.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>{lead.phone}</span>
          </div>
        )}
        {(lead as any).company && (
          <div className="text-sm">
            <span className="text-muted-foreground">Empresa: </span>
            <span className="font-medium">{(lead as any).company}</span>
          </div>
        )}
        {(lead as any).specialty && (
          <div className="text-sm">
            <span className="text-muted-foreground">Especialidade: </span>
            <span className="font-medium">{(lead as any).specialty}</span>
          </div>
        )}
        {lead.next_contact_date && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(lead.next_contact_date), "dd/MM/yyyy", {
                locale: ptBR,
              })}
            </span>
          </div>
        )}
        {lead.source && (
          <div className="text-sm">
            <span className="text-muted-foreground">Origem: </span>
            <span className="font-medium">{lead.source}</span>
          </div>
        )}
        <div className="flex gap-2 pt-2">
          {lead.phone && (
            <Button
              variant="default"
              size="sm"
              className="flex-1 bg-[#25D366] hover:bg-[#20BA5A] text-white"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              WhatsApp
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className={lead.phone ? "" : "flex-1"}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(lead);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(lead.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
