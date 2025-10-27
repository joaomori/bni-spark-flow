import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Mail, Phone, Calendar } from "lucide-react";
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
}

interface LeadCardProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
}

const statusColors: Record<string, string> = {
  new: "bg-accent text-accent-foreground",
  contacted: "bg-primary text-primary-foreground",
  negotiating: "bg-warning text-warning-foreground",
  closed: "bg-success text-success-foreground",
  lost: "bg-destructive text-destructive-foreground",
};

const statusLabels: Record<string, string> = {
  new: "Novo",
  contacted: "Contatado",
  negotiating: "Em Negociação",
  closed: "Fechado",
  lost: "Perdido",
};

export function LeadCard({ lead, onEdit, onDelete }: LeadCardProps) {
  return (
    <Card className="shadow-card hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{lead.name}</CardTitle>
          <Badge className={statusColors[lead.status] || "bg-secondary"}>
            {statusLabels[lead.status] || lead.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
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
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(lead)}
          >
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(lead.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
