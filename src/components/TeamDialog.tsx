import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Team {
  id: string;
  name: string;
  description: string | null;
  region_id: string;
}

interface TeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team?: Team | null;
}

export function TeamDialog({ open, onOpenChange, team }: TeamDialogProps) {
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    region_id: "",
  });

  useEffect(() => {
    const fetchRegions = async () => {
      const { data } = await supabase.from("regions").select("id, name").order("name");
      setRegions(data || []);
    };
    fetchRegions();
  }, []);

  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name,
        description: team.description || "",
        region_id: team.region_id,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        region_id: "",
      });
    }
  }, [team]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.region_id) {
      toast.error("Nome e região são obrigatórios");
      return;
    }

    setLoading(true);

    try {
      const teamData = {
        name: formData.name,
        description: formData.description || null,
        region_id: formData.region_id,
      };

      if (team) {
        const { error } = await supabase
          .from("teams")
          .update(teamData)
          .eq("id", team.id);

        if (error) throw error;
        toast.success("Equipe atualizada com sucesso");
      } else {
        const { error } = await supabase.from("teams").insert([teamData]);

        if (error) throw error;
        toast.success("Equipe criada com sucesso");
      }

      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar equipe");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{team ? "Editar Equipe" : "Nova Equipe"}</DialogTitle>
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
            <Label htmlFor="region">Região *</Label>
            <Select
              value={formData.region_id}
              onValueChange={(value) => setFormData({ ...formData, region_id: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma região" />
              </SelectTrigger>
              <SelectContent>
                {regions.map((region) => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
