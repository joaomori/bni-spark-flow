import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { TrendingUp, Users, Activity, Target } from "lucide-react";

interface Stats {
  totalLeads: number;
  newLeads: number;
  contacted: number;
  negotiating: number;
  closed: number;
  lost: number;
  bySource: Array<{ name: string; value: number }>;
  byMonth: Array<{ month: string; leads: number }>;
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"];

const Reports = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalLeads: 0,
    newLeads: 0,
    contacted: 0,
    negotiating: 0,
    closed: 0,
    lost: 0,
    bySource: [],
    byMonth: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const { data: leads, error } = await supabase.from("leads").select("*");

      if (error) throw error;

      if (!leads) {
        setLoading(false);
        return;
      }

      // Status counts
      const newLeads = leads.filter((l) => l.status === "new").length;
      const contacted = leads.filter((l) => l.status === "contacted").length;
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
      const monthCount: Record<string, number> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
        monthCount[key] = 0;
      }

      leads.forEach((lead) => {
        const date = new Date(lead.created_at);
        const key = date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
        if (key in monthCount) {
          monthCount[key]++;
        }
      });

      const byMonth = Object.entries(monthCount).map(([month, leads]) => ({ month, leads }));

      setStats({
        totalLeads: leads.length,
        newLeads,
        contacted,
        negotiating,
        closed,
        lost,
        bySource,
        byMonth,
      });
    } catch (error: any) {
      toast.error("Erro ao carregar relatórios");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const statusData = [
    { name: "Novo", value: stats.newLeads, color: "#ef4444" },
    { name: "Contatado", value: stats.contacted, color: "#3b82f6" },
    { name: "Negociando", value: stats.negotiating, color: "#eab308" },
    { name: "Fechado", value: stats.closed, color: "#22c55e" },
    { name: "Perdido", value: stats.lost, color: "#6b7280" },
  ];

  const conversionRate = stats.totalLeads > 0 ? ((stats.closed / stats.totalLeads) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground mt-2">Análise completa de desempenho e métricas</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.totalLeads}</div>
            <p className="text-xs text-muted-foreground">Todos os períodos</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : `${conversionRate}%`}</div>
            <p className="text-xs text-muted-foreground">Leads fechados / Total</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Em Negociação</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.negotiating}</div>
            <p className="text-xs text-muted-foreground">Leads ativos</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fechados</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle>Leads por Status</CardTitle>
            <CardDescription>Distribuição de leads por fase do funil</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Leads por Origem</CardTitle>
            <CardDescription>Principais fontes de leads</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.bySource}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Evolução de Leads (Últimos 6 Meses)</CardTitle>
          <CardDescription>Tendência de novos leads ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.byMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="leads" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
