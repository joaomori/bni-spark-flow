import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

interface TeamWithRegion {
  id: string;
  name: string;
  region_name: string;
}

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teamId, setTeamId] = useState("");
  const [teams, setTeams] = useState<TeamWithRegion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const navigate = useNavigate();

  // noindex meta tag
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  // Load teams via edge function since user is not authenticated
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-teams-public");
        if (error) throw error;
        setTeams(data?.teams || []);
      } catch {
        toast.error("Erro ao carregar equipes");
      } finally {
        setLoadingTeams(false);
      }
    };
    loadTeams();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !teamId) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("register-member", {
        body: { full_name: fullName, email, password, team_id: teamId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Conta criada com sucesso! Faça login para continuar.");
      navigate("/auth");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  // Group teams by region
  const groupedTeams = teams.reduce<Record<string, TeamWithRegion[]>>((acc, team) => {
    if (!acc[team.region_name]) acc[team.region_name] = [];
    acc[team.region_name].push(team);
    return acc;
  }, {});

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Cadastro de Membro</CardTitle>
          <CardDescription>Crie sua conta para acessar o sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input
                id="fullName"
                placeholder="Seu nome completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team">Equipe</Label>
              {loadingTeams ? (
                <Input disabled placeholder="Carregando equipes..." />
              ) : (
                <Select value={teamId || undefined} onValueChange={setTeamId} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione sua equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(groupedTeams).map(([regionName, regionTeams]) => (
                      <SelectGroup key={regionName}>
                        <SelectLabel>{regionName}</SelectLabel>
                        {regionTeams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                "Cadastrar"
              )}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/auth" className="text-primary hover:underline">
              Faça login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
