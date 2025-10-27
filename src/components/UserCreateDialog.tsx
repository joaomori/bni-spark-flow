import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface UserCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleOptions = [
  { value: "member", label: "Membro" },
  { value: "team_admin", label: "Admin Equipe" },
  { value: "regional_admin", label: "Admin Regional" },
  { value: "global_admin", label: "Admin Global" },
];

export function UserCreateDialog({ open, onOpenChange }: UserCreateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [regionId, setRegionId] = useState<string>("");
  const [teamId, setTeamId] = useState<string>("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["member"]);
  const [regions, setRegions] = useState<Array<{ id: string; name: string }>>([]);
  const [teams, setTeams] = useState<Array<{ id: string; name: string; region_id: string }>>([]);
  const [filteredTeams, setFilteredTeams] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (open) {
      fetchRegionsAndTeams();
    }
  }, [open]);

  useEffect(() => {
    if (regionId) {
      const filtered = teams.filter((team) => team.region_id === regionId);
      setFilteredTeams(filtered);
      if (teamId && !filtered.find((t) => t.id === teamId)) {
        setTeamId("");
      }
    } else {
      setFilteredTeams([]);
      setTeamId("");
    }
  }, [regionId, teams, teamId]);

  const fetchRegionsAndTeams = async () => {
    try {
      const [regionsRes, teamsRes] = await Promise.all([
        supabase.from("regions").select("id, name").order("name"),
        supabase.from("teams").select("id, name, region_id").order("name"),
      ]);

      if (regionsRes.error) throw regionsRes.error;
      if (teamsRes.error) throw teamsRes.error;

      setRegions(regionsRes.data || []);
      setTeams(teamsRes.data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar regiões e equipes");
      console.error(error);
    }
  };

  const handleRoleToggle = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !fullName) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    if (!regionId || !teamId) {
      toast.error("Por favor, selecione região e equipe");
      return;
    }

    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Erro ao criar usuário");

      // Update profile with region and team
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ region_id: regionId, team_id: teamId })
        .eq("id", authData.user.id);

      if (profileError) throw profileError;

      // Insert roles
      if (selectedRoles.length > 0) {
        const { error: rolesError } = await supabase
          .from("user_roles")
          .insert(selectedRoles.map((role) => ({ 
            user_id: authData.user.id, 
            role: role as "member" | "team_admin" | "regional_admin" | "global_admin" 
          })));

        if (rolesError) throw rolesError;
      }

      toast.success("Usuário criado com sucesso!");
      setEmail("");
      setPassword("");
      setFullName("");
      setRegionId("");
      setTeamId("");
      setSelectedRoles(["member"]);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar usuário");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
          <DialogDescription>
            Crie um novo usuário no sistema. Após criar, você pode atribuir região, equipe e permissões.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="João Silva"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="joao@exemplo.com"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="region">Região</Label>
            <Select value={regionId} onValueChange={setRegionId} disabled={loading}>
              <SelectTrigger id="region">
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
            <Select value={teamId} onValueChange={setTeamId} disabled={loading || !regionId}>
              <SelectTrigger id="team">
                <SelectValue placeholder="Selecione uma equipe" />
              </SelectTrigger>
              <SelectContent>
                {filteredTeams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Funções</Label>
            <div className="space-y-2">
              {roleOptions.map((role) => (
                <div key={role.value} className="flex items-center gap-2">
                  <Checkbox
                    id={role.value}
                    checked={selectedRoles.includes(role.value)}
                    onCheckedChange={() => handleRoleToggle(role.value)}
                    disabled={loading}
                  />
                  <Label htmlFor={role.value} className="cursor-pointer">
                    {role.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
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
                  Criando...
                </>
              ) : (
                "Criar Usuário"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
