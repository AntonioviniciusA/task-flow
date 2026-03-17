'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { CheckSquare, Mail, Lock, User } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres')
      setIsLoading(false)
      return
    }

    if (!termsAccepted) {
      setError('Você deve aceitar os Termos de Uso para continuar')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao criar conta')
        return
      }

      // Auto login after registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Conta criada, mas falhou ao fazer login automaticamente')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError('Erro ao criar conta. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground">
              <CheckSquare className="w-6 h-6" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Criar Conta</CardTitle>
          <CardDescription>
            Crie sua conta para começar a gerenciar suas tarefas
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Nome</FieldLabel>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Senha</FieldLabel>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">Confirmar Senha</FieldLabel>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </Field>

              <div className="flex items-center space-x-2 py-2">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                  disabled={isLoading}
                />
                <div className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  <label htmlFor="terms" className="mr-1 cursor-pointer">
                    Li e aceito os
                  </label>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="text-primary hover:underline font-semibold"
                      >
                        Termos de Uso
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Termos de Uso e Isenção de Responsabilidade</DialogTitle>
                        <DialogDescription>
                          Leia atentamente antes de prosseguir.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 text-sm text-muted-foreground">
                        <p>
                          Este aplicativo ("Task Flow" ou "No Time") encontra-se em estágio de
                          desenvolvimento (versão Beta/Antecipada). Ao utilizar este serviço, você
                          concorda que:
                        </p>
                        <ol className="list-decimal pl-5 space-y-2">
                          <li>
                            <strong>Software em Desenvolvimento:</strong> O software é fornecido "como
                            está", sem garantias de qualquer tipo, expressas ou implícitas,
                            incluindo, mas não se limitando a, garantias de comercialização ou
                            adequação a um propósito específico.
                          </li>
                          <li>
                            <strong>Isenção de Responsabilidade:</strong> Os desenvolvedores não se
                            responsabilizam por eventuais perdas de dados, falhas no sistema,
                            interrupções de serviço, erros de cálculo ou quaisquer danos diretos,
                            indiretos, incidentais ou consequenciais decorrentes do uso ou da
                            incapacidade de usar o aplicativo.
                          </li>
                          <li>
                            <strong>Alterações no Serviço:</strong> Funcionalidades podem ser
                            alteradas, adicionadas, suspensas ou removidas a qualquer momento sem
                            aviso prévio, como parte do processo de desenvolvimento e melhoria
                            contínua.
                          </li>
                          <li>
                            <strong>Dados e Privacidade:</strong> Seus dados são armazenados com
                            medidas de segurança padrão, mas recomendamos não utilizar o aplicativo
                            para armazenar informações críticas, financeiras ou altamente sensíveis
                            durante esta fase de testes.
                          </li>
                        </ol>
                        <p>
                          Ao marcar a caixa de seleção e prosseguir com o cadastro, você declara
                          estar ciente destas condições e isenta os desenvolvedores de qualquer
                          responsabilidade sobre o uso da plataforma.
                        </p>
                      </div>
                      <div className="flex justify-end pt-4">
                        <Button
                          type="button"
                          onClick={() => {
                            setTermsAccepted(true)
                          }}
                        >
                          Entendi e Aceito
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {error && (
                <FieldError className="text-destructive text-sm">
                  {error}
                </FieldError>
              )}
            </FieldGroup>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner className="mr-2" />
                  Criando conta...
                </>
              ) : (
                'Criar Conta'
              )}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Já tem uma conta?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Entrar
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
