import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  team_id: string | null;
  region_id: string | null;
  user_roles: Array<{ role: string }>;
}

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserProfile | null;
}

const roleOptions = [
  { value: "member", label: "Membro" },
  { value: "team_admin", label: "Admin Equipe" },
  { value: "regional_admin", label: "Admin Regional" },
  { value: "global_admin", label: "Admin Global" },
];

export function UserEditDialog({ open, onOpenChange, user }: UserEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState<Array<{ id: string; name: string }>>([]);
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    team_id: "",
    region_id: "",
    roles: [] as string[],
  });

  useEffect(() => {
    const fetchData = async () => {
      const [regionsRes, teamsRes] = await Promise.all([
        supabase.from("regions").select("id, name").order("name"),
        supabase.from("teams").select("id, name").order("name"),
      ]);
      setRegions(regionsRes.data || []);
      setTeams(teamsRes.data || []);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        team_id: user.team_id || "",
        region_id: user.region_id || "",
        roles: user.user_roles.map((r) => r.role),
      });
    }
  }, [user]);

  const handleRoleToggle = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          team_id: formData.team_id || null,
          region_id: formData.region_id || null,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Delete existing roles
      await supabase.from("user_roles").delete().eq("user_id", user.id);

      // Insert new roles
      if (formData.roles.length > 0) {
        const rolesToInsert = formData.roles.map((role) => ({
          user_id: user.id,
          role: role as "member" | "team_admin" | "regional_admin" | "global_admin",
        }));
        const { error: rolesError } = await supabase
          .from("user_roles")
          .insert(rolesToInsert);

        if (rolesError) throw rolesError;
      }

      toast.success("Usuário atualizado com sucesso");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar usuário");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Nome</p>
            <p className="text-sm text-muted-foreground">{user.full_name}</p>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">E-mail</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="region">Região</Label>
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
            <Label htmlFor="team">Equipe</Label>
            <Select
              value={formData.team_id}
              onValueChange={(value) => setFormData({ ...formData, team_id: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma equipe" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Permissões</Label>
            <div className="space-y-2">
              {roleOptions.map((role) => (
                <div key={role.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={role.value}
                    checked={formData.roles.includes(role.value)}
                    onCheckedChange={() => handleRoleToggle(role.value)}
                    disabled={loading}
                  />
                  <label
                    htmlFor={role.value}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {role.label}
                  </label>
                </div>
              ))}
            </div>
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
