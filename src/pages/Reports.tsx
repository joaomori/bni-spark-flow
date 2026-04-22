import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, FunnelChart, Funnel, LabelList } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { TrendingUp, Users, Activity, Target, Filter, Calendar, Award, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Stats {
  totalLeads: number;
  newLeads: number;
  contacted: number;
  interviewScheduled: number;
  interviewDone: number;
  waitingReturn: number;
  futureContact: number;
  waitingSignature: number;
  waitingForm: number;
  negotiating: number;
  closed: number;
  lost: number;
  bySource: Array<{ name: string; value: number }>;
  byMonth: Array<{ month: string; leads: number; closed: number; lost: number }>;
  byTeam: Array<{ team: string; total: number; closed: number; conversion: number }>;
  byRegion: Array<{ region: string; total: number; closed: number; conversion: number }>;
}

interface TeamPerformance {
  id: string;
  name: string;
  total: number;
  closed: number;
  lost: number;
  inProgress: number;
  conversionRate: number;
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"];

const Reports = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalLeads: 0,
    newLeads: 0,
    contacted: 0,
    interviewScheduled: 0,
    interviewDone: 0,
    waitingReturn: 0,
    futureContact: 0,
    waitingSignature: 0,
    negotiating: 0,
    closed: 0,
    lost: 0,
    bySource: [],
    byMonth: [],
    byTeam: [],
    byRegion: [],
  });
  const [loading, setLoading] = useState(true);
  const [regions, setRegions] = useState<Array<{ id: string; name: string }>>([]);
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance[]>([]);

  useEffect(() => {
    if (user) {
      fetchRegions();
      fetchTeams();
      fetchStats();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchTeamPerformance();
    }
  }, [selectedRegion, selectedTeam, selectedPeriod]);

  const fetchRegions = async () => {
    try {
      const { data, error } = await supabase
        .from("regions")
        .select("id, name")
        .order("name");
      
      if (error) throw error;
      setRegions(data || []);
    } catch (error) {
      console.error("Erro ao carregar regiões:", error);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .order("name");
      
      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error("Erro ao carregar equipes:", error);
    }
  };

  const fetchTeamPerformance = async () => {
    try {
      let query = supabase
        .from("leads")
        .select(`
          *,
          teams (
            id,
            name
          )
        `);

      if (selectedRegion !== "all") {
        query = query.eq("region_id", selectedRegion);
      }

      // Apply period filter
      if (selectedPeriod !== "all") {
        const days = parseInt(selectedPeriod);
        const date = new Date();
        date.setDate(date.getDate() - days);
        query = query.gte("created_at", date.toISOString());
      }

      const { data: leads } = await query;

      if (!leads) return;

      const teamStats: Record<string, TeamPerformance> = {};

      leads.forEach((lead: any) => {
        const teamId = lead.teams?.id || "unknown";
        const teamName = lead.teams?.name || "Sem equipe";

        if (!teamStats[teamId]) {
          teamStats[teamId] = {
            id: teamId,
            name: teamName,
            total: 0,
            closed: 0,
            lost: 0,
            inProgress: 0,
            conversionRate: 0,
          };
        }

        teamStats[teamId].total++;
        if (lead.status === "closed") teamStats[teamId].closed++;
        if (lead.status === "lost") teamStats[teamId].lost++;
        if (!["closed", "lost"].includes(lead.status)) teamStats[teamId].inProgress++;
      });

      const performance = Object.values(teamStats).map((team) => ({
        ...team,
        conversionRate: team.total > 0 ? (team.closed / team.total) * 100 : 0,
      }));

      performance.sort((a, b) => b.conversionRate - a.conversionRate);
      setTeamPerformance(performance);
    } catch (error) {
      console.error("Erro ao carregar performance das equipes:", error);
    }
  };

  const fetchStats = async () => {
    try {
      let query = supabase.from("leads").select(`
        *,
        teams (name),
        regions (name)
      `);

      // Apply filters
      if (selectedRegion !== "all") {
        query = query.eq("region_id", selectedRegion);
      }
      if (selectedTeam !== "all") {
        query = query.eq("team_id", selectedTeam);
      }

      // Apply period filter
      if (selectedPeriod !== "all") {
        const days = parseInt(selectedPeriod);
        const date = new Date();
        date.setDate(date.getDate() - days);
        query = query.gte("created_at", date.toISOString());
      }

      const { data: leads, error } = await query;

      if (error) throw error;

      if (!leads) {
        setLoading(false);
        return;
      }

      // Status counts
      const newLeads = leads.filter((l) => l.status === "new").length;
      const contacted = leads.filter((l) => l.status === "contacted").length;
      const interviewScheduled = leads.filter((l) => l.status === "interview_scheduled").length;
      const interviewDone = leads.filter((l) => l.status === "interview_done").length;
      const waitingReturn = leads.filter((l) => l.status === "waiting_return").length;
      const futureContact = leads.filter((l) => l.status === "future_contact").length;
      const waitingSignature = leads.filter((l) => l.status === "waiting_signature").length;
      const negotiating = leads.filter((l) => l.status === "negotiating").length;
      const closed = leads.filter((l) => l.status === "closed").length;
      const lost = leads.filter((l) => l.status === "lost").length;

      // By source
      const sourceCount: Record<string, number> = {};
      leads.forEach((lead) => {
        const source = lead.source || "Sem origem";
        sourceCount[source] = (sourceCount[source] || 0) + 1;
      });
      const bySource = Object.entries(sourceCount).map(([name, value]) => ({ name, value }));

      // By month (last 6 months)
      const monthCount: Record<string, { leads: number; closed: number; lost: number }> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
        monthCount[key] = { leads: 0, closed: 0, lost: 0 };
      }

      leads.forEach((lead: any) => {
        const date = new Date(lead.created_at);
        const key = date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
        if (key in monthCount) {
          monthCount[key].leads++;
          if (lead.status === "closed") monthCount[key].closed++;
          if (lead.status === "lost") monthCount[key].lost++;
        }
      });

      const byMonth = Object.entries(monthCount).map(([month, data]) => ({ month, ...data }));

      // By team
      const teamCount: Record<string, { total: number; closed: number }> = {};
      leads.forEach((lead: any) => {
        const teamName = lead.teams?.name || "Sem equipe";
        if (!teamCount[teamName]) {
          teamCount[teamName] = { total: 0, closed: 0 };
        }
        teamCount[teamName].total++;
        if (lead.status === "closed") teamCount[teamName].closed++;
      });

      const byTeam = Object.entries(teamCount).map(([team, data]) => ({
        team,
        ...data,
        conversion: data.total > 0 ? (data.closed / data.total) * 100 : 0,
      }));

      // By region
      const regionCount: Record<string, { total: number; closed: number }> = {};
      leads.forEach((lead: any) => {
        const regionName = lead.regions?.name || "Sem região";
        if (!regionCount[regionName]) {
          regionCount[regionName] = { total: 0, closed: 0 };
        }
        regionCount[regionName].total++;
        if (lead.status === "closed") regionCount[regionName].closed++;
      });

      const byRegion = Object.entries(regionCount).map(([region, data]) => ({
        region,
        ...data,
        conversion: data.total > 0 ? (data.closed / data.total) * 100 : 0,
      }));

      setStats({
        totalLeads: leads.length,
        newLeads,
        contacted,
        interviewScheduled,
        interviewDone,
        waitingReturn,
        futureContact,
        waitingSignature,
        negotiating,
        closed,
        lost,
        bySource,
        byMonth,
        byTeam,
        byRegion,
      });
    } catch (error: any) {
      toast.error("Erro ao carregar relatórios");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const statusData = [
    { name: "Novo Contato", value: stats.newLeads, color: "#ef4444" },
    { name: "Contato Feito", value: stats.contacted, color: "#3b82f6" },
    { name: "Entrevista Agendada", value: stats.interviewScheduled, color: "#eab308" },
    { name: "Entrevista Realizada", value: stats.interviewDone, color: "#22c55e" },
    { name: "Aguardando Retorno", value: stats.waitingReturn, color: "#6b7280" },
    { name: "Contato Futuro", value: stats.futureContact, color: "#8b5cf6" },
    { name: "Aguardando Assinatura", value: stats.waitingSignature, color: "#f97316" },
    { name: "Em Negociação", value: stats.negotiating, color: "#eab308" },
    { name: "Finalizado Ganho", value: stats.closed, color: "#22c55e" },
    { name: "Finalizado Perdido", value: stats.lost, color: "#ef4444" },
  ];

  const conversionRate = stats.totalLeads > 0 ? ((stats.closed / stats.totalLeads) * 100).toFixed(1) : 0;
  const lossRate = stats.totalLeads > 0 ? ((stats.lost / stats.totalLeads) * 100).toFixed(1) : 0;
  const inProgress = stats.negotiating + stats.interviewScheduled + stats.waitingReturn;

  const funnelData = [
    { name: "Total Leads", value: stats.totalLeads, fill: "#3b82f6" },
    { name: "Contatados", value: stats.contacted + stats.interviewScheduled + stats.interviewDone + stats.negotiating + stats.closed, fill: "#8b5cf6" },
    { name: "Entrevistas", value: stats.interviewScheduled + stats.interviewDone + stats.negotiating + stats.closed, fill: "#eab308" },
    { name: "Negociação", value: stats.negotiating + stats.closed, fill: "#f97316" },
    { name: "Fechados", value: stats.closed, fill: "#22c55e" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground mt-2">Análise completa de desempenho e métricas</p>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Todo período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo período</SelectItem>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="180">Últimos 6 meses</SelectItem>
                  <SelectItem value="365">Último ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Região</label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as regiões" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as regiões</SelectItem>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Equipe</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as equipes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as equipes</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.totalLeads}</div>
            <p className="text-xs text-muted-foreground">No período selecionado</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <Target className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{loading ? "..." : `${conversionRate}%`}</div>
            <p className="text-xs text-muted-foreground">Leads fechados</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Perda</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{loading ? "..." : `${lossRate}%`}</div>
            <p className="text-xs text-muted-foreground">Leads perdidos</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Em Progresso</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{loading ? "..." : inProgress}</div>
            <p className="text-xs text-muted-foreground">Leads ativos</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fechados</CardTitle>
            <Award className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{loading ? "..." : stats.closed}</div>
            <p className="text-xs text-muted-foreground">Negócios ganhos</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Funil de Vendas</CardTitle>
            <CardDescription>Progressão dos leads no processo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <FunnelChart>
                <Tooltip />
                <Funnel dataKey="value" data={funnelData} isAnimationActive>
                  <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Leads por Origem</CardTitle>
            <CardDescription>Principais fontes de leads</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={stats.bySource}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Evolução de Leads (Últimos 6 Meses)</CardTitle>
          <CardDescription>Tendência de leads, fechamentos e perdas ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={stats.byMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="leads" stroke="hsl(var(--primary))" strokeWidth={2} name="Total Leads" />
              <Line type="monotone" dataKey="closed" stroke="#22c55e" strokeWidth={2} name="Fechados" />
              <Line type="monotone" dataKey="lost" stroke="#ef4444" strokeWidth={2} name="Perdidos" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Tables */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Performance por Equipe</CardTitle>
            <CardDescription>Ranking de equipes por taxa de conversão</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipe</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Fechados</TableHead>
                  <TableHead className="text-center">Em Andamento</TableHead>
                  <TableHead className="text-right">Conversão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamPerformance.length > 0 ? (
                  teamPerformance.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell className="text-center">{team.total}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="default" className="bg-success">{team.closed}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{team.inProgress}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {team.conversionRate.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum dado disponível
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Leads por Status</CardTitle>
            <CardDescription>Distribuição de leads por fase</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData.filter(s => s.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
