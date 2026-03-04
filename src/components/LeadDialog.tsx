import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { DeclineReasonDialog } from "@/components/DeclineReasonDialog";

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  next_contact_date: string | null;
  notes: string | null;
}

interface LeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
}

export function LeadDialog({ open, onOpenChange, lead }: LeadDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [pendingDeclineReason, setPendingDeclineReason] = useState<string | null>(null);
  const [pendingTargetTeamId, setPendingTargetTeamId] = useState<string | undefined>(undefined);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    company: "",
    specialty: "",
    invited_by: "",
    status: "new",
    next_contact_date: "",
    notes: "",
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name,
        phone: lead.phone || "",
        company: (lead as any).company || "",
        specialty: (lead as any).specialty || "",
        invited_by: (lead as any).invited_by || "",
        status: lead.status,
        next_contact_date: lead.next_contact_date || "",
        notes: lead.notes || "",
      });
    } else {
      setFormData({
        name: "",
        phone: "",
        company: "",
        specialty: "",
        invited_by: "",
        status: "new",
        next_contact_date: "",
        notes: "",
      });
    }
  }, [lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.name) {
      toast.error("Nome é obrigatório");
      return;
    }

    // Intercept declined status to ask for reason
    if (formData.status === "declined" && !pendingDeclineReason) {
      setShowDeclineDialog(true);
      return;
    }

    setLoading(true);

    try {
      // Check if phone number already exists in another lead
      if (formData.phone && formData.phone.trim()) {
        const query = supabase
          .from("leads")
          .select("id, name")
          .eq("phone", formData.phone.trim());

        // If editing, exclude the current lead from the check
        if (lead) {
          query.neq("id", lead.id);
        }

        const { data: existingLeads } = await query;

        if (existingLeads && existingLeads.length > 0) {
          toast.error(`Este número já está cadastrado para: ${existingLeads[0].name}`);
          setLoading(false);
          return;
        }
      }

      const leadData: any = {
        name: formData.name,
        phone: formData.phone || null,
        company: formData.company || null,
        specialty: formData.specialty || null,
        invited_by: formData.invited_by || null,
        status: formData.status,
        next_contact_date: formData.next_contact_date || null,
        notes: formData.notes || null,
      };

      if (formData.status === "declined" && pendingDeclineReason) {
        leadData.decline_reason = pendingDeclineReason;
      }

      // For new leads, get team/region from user profile
      if (!lead) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("team_id, region_id")
          .eq("id", user.id)
          .single();

        if (!profile?.team_id || !profile?.region_id) {
          toast.error("Usuário não está associado a uma equipe e região");
          setLoading(false);
          return;
        }

        leadData.team_id = profile.team_id;
        leadData.region_id = profile.region_id;
        leadData.created_by = user.id;
      }

      if (lead) {
        const { error } = await supabase
          .from("leads")
          .update(leadData)
          .eq("id", lead.id);

        if (error) throw error;
        toast.success("Lead atualizado com sucesso");
      } else {
        const { error } = await supabase.from("leads").insert([leadData]);

        if (error) throw error;
        toast.success("Lead criado com sucesso");
      }

      // If chair_conflict with target team, redirect the lead
      if (formData.status === "declined" && pendingDeclineReason === "chair_conflict" && pendingTargetTeamId) {
        const { data: targetTeam } = await supabase
          .from("teams")
          .select("region_id")
          .eq("id", pendingTargetTeamId)
          .single();

        if (targetTeam && lead) {
          await supabase.from("leads").update({
            status: "new",
            team_id: pendingTargetTeamId,
            region_id: targetTeam.region_id,
            decline_reason: "chair_conflict",
          }).eq("id", lead.id);
        }
      }

      // If declined with chair_conflict, create admin alert
      if (formData.status === "declined" && pendingDeclineReason === "chair_conflict") {
        await supabase.from("admin_alerts").insert([{
          lead_id: lead?.id || null,
          alert_type: "chair_conflict",
          message: `Conflito de Cadeira: Lead "${formData.name}" (Tel: ${formData.phone || "N/A"}) foi ${pendingTargetTeamId ? "redirecionado para outra equipe" : "declinado"} por conflito de cadeira.`,
          created_by: user.id,
        }]);
      }

      setPendingDeclineReason(null);
      setPendingTargetTeamId(undefined);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar lead");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? "Editar Lead" : "Novo Lead"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialty">Especialidade</Label>
              <Input
                id="specialty"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waiting_signature">Aguardando Assinatura</SelectItem>
                  <SelectItem value="declined">Aguardando Oportunidade</SelectItem>
                  <SelectItem value="waiting_return">Aguardando Retorno</SelectItem>
                  <SelectItem value="contacted">Contato Feito</SelectItem>
                  <SelectItem value="future_contact">Contato Futuro</SelectItem>
                  <SelectItem value="interview_scheduled">Entrevista Agendada</SelectItem>
                  <SelectItem value="interview_done">Entrevista Realizada</SelectItem>
                  <SelectItem value="closed">Finalizado Ganho</SelectItem>
                  <SelectItem value="lost">Finalizado Perdido</SelectItem>
                  <SelectItem value="new">Novo Contato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invited_by">Quem Convidou</Label>
              <Input
                id="invited_by"
                value={formData.invited_by}
                onChange={(e) => setFormData({ ...formData, invited_by: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="next_contact_date">Próximo Contato</Label>
              <Input
                id="next_contact_date"
                type="date"
                value={formData.next_contact_date}
                onChange={(e) =>
                  setFormData({ ...formData, next_contact_date: e.target.value })
                }
                disabled={loading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={loading}
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </form>

        <DeclineReasonDialog
          open={showDeclineDialog}
          onConfirm={(reason, targetTeamId) => {
            setPendingDeclineReason(reason);
            setPendingTargetTeamId(targetTeamId);
            setShowDeclineDialog(false);
            // Re-trigger submit
            setTimeout(() => {
              const form = document.querySelector('form');
              form?.requestSubmit();
            }, 0);
          }}
          onCancel={() => {
            setShowDeclineDialog(false);
            setFormData({ ...formData, status: lead?.status || "new" });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
