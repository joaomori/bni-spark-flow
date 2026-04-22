import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Calendar, GripVertical, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DeclineReasonDialog } from "@/components/DeclineReasonDialog";
import { useAuth } from "@/contexts/AuthContext";

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  next_contact_date: string | null;
  notes: string | null;
  company?: string;
  position?: string;
  teams?: {
    name: string;
  };
}

interface LeadKanbanProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onUpdate: () => void;
}

const statusColumns = [
  { id: "waiting_signature", label: "Aguardando Assinatura", color: "bg-warning" },
  { id: "waiting_form", label: "Aguardando Formulário", color: "bg-warning" },
  { id: "declined", label: "Aguardando Oportunidade", color: "bg-warning" },
  { id: "waiting_return", label: "Aguardando Retorno", color: "bg-muted" },
  { id: "contacted", label: "Contato Feito", color: "bg-primary" },
  { id: "future_contact", label: "Contato Futuro", color: "bg-secondary" },
  { id: "interview_scheduled", label: "Entrevista Agendada", color: "bg-warning" },
  { id: "interview_done", label: "Entrevista Realizada", color: "bg-success" },
  { id: "closed", label: "Finalizado Ganho", color: "bg-success" },
  { id: "lost", label: "Finalizado Perdido", color: "bg-destructive" },
  { id: "new", label: "Novo Contato", color: "bg-accent" },
];

export function LeadKanban({ leads, onLeadClick, onUpdate }: LeadKanbanProps) {
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [pendingDeclineLead, setPendingDeclineLead] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const activeLead = activeId ? leads.find((lead) => lead.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = active.id as string;
    const newStatus = over.id as string;

    // Check if we're dropping on a column
    const isColumn = statusColumns.some(col => col.id === newStatus);
    if (!isColumn) return;

    // Intercept declined status
    if (newStatus === "declined") {
      setPendingDeclineLead(leadId);
      setDeclineDialogOpen(true);
      return;
    }

    await updateLeadStatus(leadId, newStatus);
  };

  const updateLeadStatus = async (leadId: string, newStatus: string, declineReason?: string, targetTeamId?: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (declineReason) updateData.decline_reason = declineReason;

      // If chair_conflict with a target team, redirect the lead
      if (declineReason === "chair_conflict" && targetTeamId) {
        const { data: team } = await supabase
          .from("teams")
          .select("region_id")
          .eq("id", targetTeamId)
          .single();

        if (team) {
          updateData.status = "new";
          updateData.team_id = targetTeamId;
          updateData.region_id = team.region_id;
        }
      }

      const { error } = await supabase
        .from("leads")
        .update(updateData)
        .eq("id", leadId);

      if (error) throw error;

      // If chair_conflict, create admin alert
      if (declineReason === "chair_conflict" && user) {
        const lead = leads.find(l => l.id === leadId);
        await supabase.from("admin_alerts").insert([{
          lead_id: leadId,
          alert_type: "chair_conflict",
          message: `Conflito de Cadeira: Lead "${lead?.name || ""}" (Tel: ${lead?.phone || "N/A"}) foi redirecionado para outra equipe por conflito de cadeira.`,
          created_by: user.id,
        }]);
      }

      toast.success(declineReason === "chair_conflict" && targetTeamId
        ? "Lead redirecionado para outra equipe"
        : "Status do lead atualizado");
      onUpdate();
    } catch (error) {
      toast.error("Erro ao atualizar status do lead");
      console.error(error);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCorners}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statusColumns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            label={column.label}
            color={column.color}
            leads={leads.filter((lead) => lead.status === column.id)}
            onLeadClick={onLeadClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? <DraggableLeadCard lead={activeLead} isDragging /> : null}
      </DragOverlay>

      <DeclineReasonDialog
        open={declineDialogOpen}
        onConfirm={(reason, targetTeamId) => {
          setDeclineDialogOpen(false);
          if (pendingDeclineLead) {
            updateLeadStatus(pendingDeclineLead, "declined", reason, targetTeamId);
            setPendingDeclineLead(null);
          }
        }}
        onCancel={() => {
          setDeclineDialogOpen(false);
          setPendingDeclineLead(null);
        }}
      />
    </DndContext>
  );
}

interface KanbanColumnProps {
  id: string;
  label: string;
  color: string;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

function KanbanColumn({ id, label, color, leads, onLeadClick }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className="flex-shrink-0 w-80 bg-muted/50 rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{label}</h3>
        <Badge variant="secondary">{leads.length}</Badge>
      </div>
      <div className="space-y-3 min-h-[200px]">
        {leads.map((lead) => (
          <DraggableLeadCard
            key={lead.id}
            lead={lead}
            onClick={() => onLeadClick(lead)}
          />
        ))}
      </div>
    </div>
  );
}

interface DraggableLeadCardProps {
  lead: Lead;
  onClick?: () => void;
  isDragging?: boolean;
}

function DraggableLeadCard({ lead, onClick, isDragging = false }: DraggableLeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging: dragging } = useDraggable({
    id: lead.id,
  });

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.phone) {
      const cleanPhone = lead.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  };

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={`hover:shadow-lg transition-shadow ${
          dragging || isDragging ? "opacity-50" : ""
        }`}
      >
        <div {...listeners} {...attributes} className="cursor-move">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground mt-1" />
              <CardTitle className="text-sm flex-1">{lead.name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {lead.teams && (
              <div className="text-xs">
                <span className="text-muted-foreground">Equipe: </span>
                <span className="font-medium">{lead.teams.name}</span>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span className="text-xs">{lead.phone}</span>
              </div>
            )}
            {lead.company && (
              <div className="text-xs">
                <span className="text-muted-foreground">Empresa: </span>
                <span className="font-medium">{lead.company}</span>
              </div>
            )}
            {lead.next_contact_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span className="text-xs">
                  {format(new Date(lead.next_contact_date), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </span>
              </div>
            )}
          </CardContent>
        </div>
        <CardContent className="pt-0 pb-3">
          <div className="flex gap-2">
            {lead.phone && (
              <button
                className="flex-1 text-xs py-1.5 px-2 rounded-md bg-[#25D366] hover:bg-[#20BA5A] text-white transition-colors flex items-center justify-center gap-1"
                onClick={handleWhatsApp}
              >
                <MessageCircle className="h-3 w-3" />
                WhatsApp
              </button>
            )}
            <button
              className="text-xs py-1.5 px-3 rounded-md border hover:bg-accent transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                if (onClick) onClick();
              }}
            >
              Editar
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
