import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, AlertCircle, Calendar, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addDays, isWithinInterval, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Dashboard = () => {
  const { user } = useAuth();
  const [userName, setUserName] = useState("");
  const [upcomingContacts, setUpcomingContacts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    interviewScheduled: 0,
    interviewDone: 0,
    scheduledInterview: 0,
    waitingReturn: 0,
    futureContact: 0,
    waitingSignature: 0,
    negotiating: 0,
    closed: 0,
    lost: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchStats();
      fetchUpcomingContacts();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    
    if (data) {
      setUserName(data.full_name);
    }
  };

  const fetchUpcomingContacts = async () => {
    if (!user) return;

    const today = new Date();
    const nextWeek = addDays(today, 7);

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .not("next_contact_date", "is", null)
      .order("next_contact_date");

    if (!error && data) {
      const upcoming = data.filter((lead) => {
        if (!lead.next_contact_date) return false;
        const contactDate = new Date(lead.next_contact_date);
        return isWithinInterval(contactDate, { start: today, end: nextWeek });
      });
      setUpcomingContacts(upcoming);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: leads, error } = await supabase.from("leads").select("status");

      if (error) throw error;

      if (!leads) {
        setLoading(false);
        return;
      }

      const stats = {
        total: leads.length,
        new: leads.filter((l) => l.status === "new").length,
        contacted: leads.filter((l) => l.status === "contacted").length,
        interviewScheduled: leads.filter((l) => l.status === "interview_scheduled").length,
        interviewDone: leads.filter((l) => l.status === "interview_done").length,
        scheduledInterview: leads.filter((l) => l.status === "scheduled_interview").length,
        waitingReturn: leads.filter((l) => l.status === "waiting_return").length,
        futureContact: leads.filter((l) => l.status === "future_contact").length,
        waitingSignature: leads.filter((l) => l.status === "waiting_signature").length,
        negotiating: leads.filter((l) => l.status === "negotiating").length,
        closed: leads.filter((l) => l.status === "closed").length,
        lost: leads.filter((l) => l.status === "lost").length,
      };

      setStats(stats);
    } catch (error: any) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const conversionRate = stats.total > 0 ? ((stats.closed / stats.total) * 100).toFixed(0) : 0;

  const statusDistribution = [
    { name: "Novo Contato", value: stats.new, percentage: ((stats.new / stats.total) * 100).toFixed(1) },
    { name: "Contato Feito", value: stats.contacted, percentage: ((stats.contacted / stats.total) * 100).toFixed(1) },
    { name: "Entrevista Agendada", value: stats.interviewScheduled, percentage: ((stats.interviewScheduled / stats.total) * 100).toFixed(1) },
    { name: "Entrevista Realizada", value: stats.interviewDone, percentage: ((stats.interviewDone / stats.total) * 100).toFixed(1) },
    { name: "Aguardando Retorno", value: stats.waitingReturn, percentage: ((stats.waitingReturn / stats.total) * 100).toFixed(1) },
    { name: "Contato Futuro", value: stats.futureContact, percentage: ((stats.futureContact / stats.total) * 100).toFixed(1) },
    { name: "Aguardando Assinatura", value: stats.waitingSignature, percentage: ((stats.waitingSignature / stats.total) * 100).toFixed(1) },
    { name: "Em Negociação", value: stats.negotiating, percentage: ((stats.negotiating / stats.total) * 100).toFixed(1) },
    { name: "Finalizado Ganho", value: stats.closed, percentage: ((stats.closed / stats.total) * 100).toFixed(1) },
    { name: "Finalizado Perdido", value: stats.lost, percentage: ((stats.lost / stats.total) * 100).toFixed(1) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Olá, {userName}!</h1>
        <p className="text-muted-foreground mt-2">
          Bem-vindo(a) ao seu dashboard de gerenciamento de leads.
        </p>
      </div>

      {/* Próximos Contatos */}
      <Card className="shadow-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Calendar className="h-5 w-5" />
            Próximos Contatos (7 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingContacts.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhum contato agendado para os próximos 7 dias.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {upcomingContacts.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {lead.next_contact_date && format(new Date(lead.next_contact_date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grade de Métricas */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card className="shadow-card border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? "..." : stats.total}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Novo Contato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? "..." : stats.new}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contato Feito</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? "..." : stats.contacted}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Entrevista Agendada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? "..." : stats.interviewScheduled}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Entrevista Realizada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? "..." : stats.interviewDone}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Marcou Entrevista</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? "..." : stats.scheduledInterview}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aguardando Retorno</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? "..." : stats.waitingReturn}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contato Futuro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? "..." : stats.futureContact}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aguardando Assinatura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? "..." : stats.waitingSignature}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Negociação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? "..." : stats.negotiating}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-l-4 border-l-success">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-success" />
              Finalizado Ganho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{loading ? "..." : stats.closed}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-l-4 border-l-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <XCircle className="h-4 w-4 text-destructive" />
              Finalizado Perdido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{loading ? "..." : stats.lost}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-l-4 border-l-accent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-accent" />
              Taxa de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{loading ? "..." : `${conversionRate}%`}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="distribution" className="space-y-4">
        <TabsList>
          <TabsTrigger value="distribution">Distribuição</TabsTrigger>
          <TabsTrigger value="performance">Desempenho</TabsTrigger>
          <TabsTrigger value="recent">Leads Recentes</TabsTrigger>
        </TabsList>

        <TabsContent value="distribution">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground mb-4">
                  Distribuição por Status (Simulação)
                </div>
                {statusDistribution.map((item) => (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{item.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="font-medium">{item.value}</span>
                        <span className="text-muted-foreground">{item.percentage}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card className="shadow-card">
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                Gráficos de desempenho serão exibidos aqui
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card className="shadow-card">
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                Leads recentes serão listados aqui
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
