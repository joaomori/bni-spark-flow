import { useState } from "react";
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

const declineReasons = [
  { value: "chair_conflict", label: "Conflito de Cadeira" },
  { value: "no_interest", label: "Sem Interesse" },
  { value: "unavailable", label: "Indisponibilidade" },
  { value: "other", label: "Outro" },
];

interface DeclineReasonDialogProps {
  open: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function DeclineReasonDialog({ open, onConfirm, onCancel }: DeclineReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [otherText, setOtherText] = useState("");

  const handleConfirm = () => {
    const finalReason = reason === "other" ? otherText : reason;
    if (!finalReason) return;
    onConfirm(finalReason);
    setReason("");
    setOtherText("");
  };

  const handleCancel = () => {
    setReason("");
    setOtherText("");
    onCancel();
  };

  const isValid = reason && (reason !== "other" || otherText.trim().length > 0);

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
