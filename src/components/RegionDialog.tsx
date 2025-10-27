import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Region {
  id: string;
  name: string;
  description: string | null;
}

interface RegionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  region?: Region | null;
}

export function RegionDialog({ open, onOpenChange, region }: RegionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    if (region) {
      setFormData({
        name: region.name,
        description: region.description || "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
      });
    }
  }, [region]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Nome é obrigatório");
      return;
    }

    setLoading(true);

    try {
      const regionData = {
        name: formData.name,
        description: formData.description || null,
      };

      if (region) {
        const { error } = await supabase
          .from("regions")
          .update(regionData)
          .eq("id", region.id);

        if (error) throw error;
        toast.success("Região atualizada com sucesso");
      } else {
        const { error } = await supabase.from("regions").insert([regionData]);

        if (error) throw error;
        toast.success("Região criada com sucesso");
      }

      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar região");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{region ? "Editar Região" : "Nova Região"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={loading}
              rows={3}
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
      </DialogContent>
    </Dialog>
  );
}
