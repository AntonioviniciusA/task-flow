import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  CheckSquare,
  Bell,
  Smartphone,
  Wifi,
  ArrowRight,
  Check,
} from 'lucide-react'

export default function HomePage() {
  const features = [
    {
      icon: CheckSquare,
      title: 'Gerencie Tarefas',
      description: 'Crie, organize e acompanhe suas tarefas com facilidade',
    },
    {
      icon: Bell,
      title: 'Notificações Push',
      description: 'Receba lembretes mesmo com o navegador fechado',
    },
    {
      icon: Smartphone,
      title: 'PWA Nativo',
      description: 'Instale no seu dispositivo como um app nativo',
    },
    {
      icon: Wifi,
      title: 'Funciona Offline',
      description: 'Acesse suas tarefas mesmo sem internet',
    },
  ]

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-2xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground">
                <CheckSquare className="w-8 h-8" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
              Gerencie suas tarefas de forma inteligente
            </h1>
            <p className="text-lg text-muted-foreground mb-8 text-pretty">
              Um aplicativo PWA completo para gerenciamento de tarefas com
              notificações push e suporte offline
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link href="/register">
                  Começar Agora
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">Já tenho conta</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Benefits */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">
            Por que usar nosso gerenciador?
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              'Notificações push em todos os dispositivos',
              'Funciona offline no seu celular',
              'Interface simples e intuitiva',
              'Sincronização automática',
              'Priorização de tarefas',
              'Histórico de notificações',
            ].map((benefit) => (
              <div
                key={benefit}
                className="flex items-center gap-3 p-4 rounded-lg bg-muted/50"
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-success/20 text-success shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-foreground">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="container mx-auto px-4 py-16">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Pronto para começar?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Crie sua conta gratuitamente e comece a organizar suas tarefas hoje
            </p>
            <Button asChild size="lg">
              <Link href="/register">Criar Conta Grátis</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Gerenciador de Tarefas PWA</p>
        </div>
      </footer>
    </main>
  )
}
