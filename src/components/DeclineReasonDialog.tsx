import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const declineReasons = [
  { value: "chair_conflict", label: "Conflito de Cadeira" },
  { value: "no_interest", label: "Sem Interesse" },
  { value: "unavailable", label: "Indisponibilidade" },
  { value: "other", label: "Outro" },
];

interface Team {
  id: string;
  name: string;
  region_id: string;
  region_name?: string;
}

interface DeclineReasonDialogProps {
  open: boolean;
  onConfirm: (reason: string, targetTeamId?: string) => void;
  onCancel: () => void;
}

export function DeclineReasonDialog({ open, onConfirm, onCancel }: DeclineReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [otherText, setOtherText] = useState("");
  const [targetTeamId, setTargetTeamId] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  useEffect(() => {
    if (reason === "chair_conflict" && teams.length === 0) {
      fetchTeams();
    }
  }, [reason]);

  const fetchTeams = async () => {
    setLoadingTeams(true);
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, region_id, regions(name)")
        .order("name");

      if (error) throw error;

      setTeams(
        (data || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          region_id: t.region_id,
          region_name: t.regions?.name || "Sem região",
        }))
      );
    } catch (err) {
      console.error("Erro ao buscar equipes:", err);
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleConfirm = () => {
    const finalReason = reason === "other" ? otherText : reason;
    if (!finalReason) return;
    onConfirm(finalReason, reason === "chair_conflict" ? targetTeamId || undefined : undefined);
    setReason("");
    setOtherText("");
    setTargetTeamId("");
  };

  const handleCancel = () => {
    setReason("");
    setOtherText("");
    setTargetTeamId("");
    onCancel();
  };

  const isValid =
    reason &&
    (reason !== "other" || otherText.trim().length > 0) &&
    (reason !== "chair_conflict" || targetTeamId);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Motivo do Declínio</DialogTitle>
          <DialogDescription>
            Selecione o motivo pelo qual este lead foi declinado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um motivo..." />
              </SelectTrigger>
              <SelectContent>
                {declineReasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {reason === "chair_conflict" && (
            <div className="space-y-2">
              <Label>Redirecionar para qual equipe?</Label>
              <Select value={targetTeamId} onValueChange={setTargetTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingTeams ? "Carregando..." : "Selecione a equipe destino..."} />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.region_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {reason === "other" && (
            <div className="space-y-2">
              <Label>Descreva o motivo</Label>
              <Textarea
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="Descreva o motivo do declínio..."
                rows={3}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
