import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Copy, Check, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const statusLabels: Record<string, string> = {
  new: "Novo Contato",
  contacted: "Contato Feito",
  interview_scheduled: "Entrevista Agendada",
  interview_done: "Entrevista Realizada",
  waiting_return: "Aguardando Retorno",
  future_contact: "Contato Futuro",
  waiting_signature: "Aguardando Assinatura",
  closed: "Finalizado Ganho",
  lost: "Finalizado Perdido",
};

export default function WhatsAppReport() {
  const [reportText, setReportText] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [leadCount, setLeadCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchLeads() {
      setLoading(true);
      const fifteenDaysAgo = subDays(new Date(), 15).toISOString();
      const today = new Date();

      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .gte("created_at", fifteenDaysAgo)
        .not("status", "in", '("closed","lost")')
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setReportText("Erro ao carregar leads.");
        setLoading(false);
        return;
      }

      const leads = data || [];
      setLeadCount(leads.length);

      const startDate = format(subDays(today, 15), "dd/MM/yyyy", { locale: ptBR });
      const endDate = format(today, "dd/MM/yyyy", { locale: ptBR });

      let text = `📋 RELATÓRIO DE CANDIDATURAS PENDENTES\n`;
      text += `📅 Período: ${startDate} a ${endDate}\n`;
      text += `📊 Total: ${leads.length} candidato${leads.length !== 1 ? "s" : ""}\n`;

      leads.forEach((lead, i) => {
        text += `\n\n${i + 1}. Nome: ${lead.name}`;
        if (lead.phone) text += `\n   📱 Tel: ${lead.phone}`;
        if (lead.specialty) text += `\n   🏢 Atividade: ${lead.specialty}`;
        if (lead.invited_by) text += `\n   👤 Padrinho: ${lead.invited_by}`;
        text += `\n   📌 Status: ${statusLabels[lead.status] || lead.status}`;
        text += `\n   📅 Cadastro: ${format(new Date(lead.created_at), "dd/MM/yyyy", { locale: ptBR })}`;
      });

      if (leads.length === 0) {
        text += "\n\n✅ Nenhuma candidatura pendente no período.";
      }

      setReportText(text);
      setLoading(false);
    }

    fetchLeads();
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      toast({ title: "Copiado!", description: "Relatório copiado para a área de transferência." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Erro", description: "Não foi possível copiar o texto.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatório WhatsApp</h1>
        <p className="text-muted-foreground">
          Candidaturas pendentes dos últimos 15 dias — copie e envie no grupo
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Relatório para WhatsApp
              </CardTitle>
              <CardDescription>
                {loading ? "Carregando..." : `${leadCount} candidatura${leadCount !== 1 ? "s" : ""} pendente${leadCount !== 1 ? "s" : ""}`}
              </CardDescription>
            </div>
            <Button onClick={handleCopy} disabled={loading || !reportText}>
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Textarea
              readOnly
              value={reportText}
              className="min-h-[400px] font-mono text-sm"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
