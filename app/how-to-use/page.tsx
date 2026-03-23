import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CheckSquare, 
  Smartphone, 
  Calendar, 
  Trophy, 
  Users, 
  ArrowLeft,
  Info,
  ExternalLink,
  ShieldCheck,
  Bell
} from "lucide-react";
import Link from "next/link";

export default function HowToUsePage() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground shadow-lg">
              <CheckSquare className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">No Time</h1>
              <p className="text-muted-foreground">Guia Completo de Uso</p>
            </div>
          </div>
          <Button asChild variant="outline" className="w-fit">
            <Link href="/login">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Login
            </Link>
          </Button>
        </div>

        {/* 1. Início Rápido */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            1. Primeiros Passos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Criar Conta</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Acesse a página de registro, preencha seu nome, e-mail e senha. 
                Sua conta será criada instantaneamente e você terá acesso ao seu painel pessoal.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Segurança</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Seus dados são protegidos e você pode gerenciar os dispositivos que têm acesso 
                à sua conta na aba de Configurações.
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 2. PWA Installation */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-primary" />
            2. Instalar no Celular (PWA)
          </h2>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <h3 className="font-bold flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-[10px] text-primary">A</div>
                    Android (Chrome)
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Abra o site no Chrome.</li>
                    <li>Toque nos <span className="font-bold">três pontos</span> no canto superior.</li>
                    <li>Selecione <span className="font-bold">Instalar aplicativo</span>.</li>
                  </ol>
                </div>
                <div className="space-y-3">
                  <h3 className="font-bold flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-[10px] text-primary">i</div>
                    iOS (Safari)
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Abra o site no Safari.</li>
                    <li>Toque no botão <span className="font-bold">Compartilhar</span> (ícone de seta).</li>
                    <li>Selecione <span className="font-bold">Adicionar à Tela de Início</span>.</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 3. Academic Import */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            3. Importar Horário Acadêmico
          </h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Portal GOL / Católica (UCB)</CardTitle>
              <CardDescription>Transforme suas aulas em tarefas automáticas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Passo a Passo:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Faça login no portal acadêmico (GOL).</li>
                      <li>Acesse o link da API que mostramos no modal de importação.</li>
                      <li>Copie o código (JSON) que aparecer na tela.</li>
                      <li>No No Time, clique em <span className="font-bold">Importar Horário</span> e cole o código.</li>
                    </ol>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic text-center">
                O sistema identificará automaticamente os dias, horários, salas, blocos e prédios.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* 4. Gamification and Groups */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-primary" />
              4. Gamificação
            </h2>
            <Card className="h-full">
              <CardContent className="pt-6 text-sm text-muted-foreground space-y-3">
                <p>Ganhe pontos concluindo tarefas. Tarefas de alta prioridade rendem mais pontos!</p>
                <p>Acompanhe seu nível e compare seu desempenho no ranking global ou com seus amigos.</p>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              5. Grupos
            </h2>
            <Card className="h-full">
              <CardContent className="pt-6 text-sm text-muted-foreground space-y-3">
                <p>Crie grupos para projetos ou tarefas coletivas. Convide membros através de links de convite.</p>
                <p>Admins gerenciam as tarefas, enquanto membros recebem notificações e acompanham o progresso.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 6. Notifications */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            6. Notificações
          </h2>
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground space-y-4">
              <p>Ative as <span className="font-bold text-foreground">Notificações Push</span> nas Configurações para nunca esquecer uma tarefa.</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 border p-3 rounded-lg bg-muted/30">
                  <p className="font-bold text-foreground mb-1">Sons Personalizados</p>
                  Escolha tons diferentes para cada prioridade de tarefa.
                </div>
                <div className="flex-1 border p-3 rounded-lg bg-muted/30">
                  <p className="font-bold text-foreground mb-1">Lembretes Persistentes</p>
                  Configure o intervalo de reenvio para tarefas que ainda não foram concluídas.
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="pt-12 pb-8 text-center border-t">
          <p className="text-sm text-muted-foreground">
            © 2026 No Time - Organização Inteligente e Gamificada.
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <Button asChild variant="link" size="sm">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild variant="link" size="sm">
              <Link href="/register">Criar Conta</Link>
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
