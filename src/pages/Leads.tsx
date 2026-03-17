import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, LayoutGrid, Kanban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LeadDialog } from "@/components/LeadDialog";
import { LeadCard } from "@/components/LeadCard";
import { LeadKanban } from "@/components/LeadKanban";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  next_contact_date: string | null;
  notes: string | null;
  created_at: string;
  team_id: string;
  teams?: {
    name: string;
  };
}

interface Team {
  id: string;
  name: string;
}

const Leads = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("all");
  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchUserRole = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    setUserRole(data?.role || null);
  };

  const fetchTeams = async () => {
    const { data } = await supabase.from("teams").select("id, name").order("name");
    setTeams(data || []);
  };

  const fetchLeads = async () => {
    try {
      let query = supabase
        .from("leads")
        .select(`*, teams (name)`)
        .order("created_at", { ascending: false });

      if (selectedTeamId !== "all") {
        query = query.eq("team_id", selectedTeamId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLeads(data || []);
      setFilteredLeads(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar leads");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserRole();
      fetchTeams();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchLeads();
    }
  }, [user, selectedTeamId]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = leads.filter(
        (lead) =>
          lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.phone?.includes(searchQuery)
      );
      setFilteredLeads(filtered);
    } else {
      setFilteredLeads(leads);
    }
  }, [searchQuery, leads]);

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      toast.success("Lead excluído com sucesso");
      fetchLeads();
    } catch (error: any) {
      toast.error("Erro ao excluir lead");
      console.error(error);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setDialogOpen(false);
      setEditingLead(null);
      fetchLeads();
    }
  };

  const showTeamFilter = userRole === "global_admin" || userRole === "regional_admin";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground mt-2">Gerencie todos os seus leads</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Lead
        </Button>
      </div>

      <div className="flex gap-4">
        {showTeamFilter && (
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Filtrar por equipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as equipes</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar leads por nome ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="grid" className="w-full">
        <TabsList>
          <TabsTrigger value="grid" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Grade
          </TabsTrigger>
          <TabsTrigger value="kanban" className="gap-2">
            <Kanban className="h-4 w-4" />
            Kanban
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Carregando...</p>
                </CardContent>
              </Card>
            ) : filteredLeads.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery ? "Nenhum lead encontrado" : "Nenhum lead cadastrado"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} onEdit={handleEdit} onDelete={handleDelete} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="kanban" className="mt-6">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Carregando...</p>
              </CardContent>
            </Card>
          ) : filteredLeads.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  {searchQuery ? "Nenhum lead encontrado" : "Nenhum lead cadastrado"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <LeadKanban leads={filteredLeads} onLeadClick={handleEdit} onUpdate={fetchLeads} />
          )}
        </TabsContent>
      </Tabs>

      <LeadDialog open={dialogOpen} onOpenChange={handleDialogClose} lead={editingLead} />
    </div>
  );
};

export default Leads;
