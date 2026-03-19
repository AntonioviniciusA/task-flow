"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldAlert,
  ArrowLeft,
  Loader2,
  Lock,
  Users,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

function GroupJoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [groupInfo, setGroupInfo] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Token de convite não fornecido.");
      setIsLoading(false);
      return;
    }

    async function fetchGroup() {
      try {
        const res = await fetch(`/api/groups/join?token=${token}`);
        const data = await res.json();

        if (res.ok) {
          setGroupInfo(data.data);
        } else {
          setError(data.error || "Link de convite inválido ou expirado.");
        }
      } catch (err) {
        setError("Erro ao carregar informações do grupo.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchGroup();
  }, [token]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      toast.error("Por favor, digite a senha do grupo.");
      return;
    }

    setIsJoining(true);
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteToken: token,
          password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Bem-vindo ao grupo ${groupInfo?.name}!`);
        router.push("/dashboard");
      } else {
        toast.error(data.error || "Erro ao entrar no grupo.");
      }
    } catch (err) {
      toast.error("Erro na conexão com o servidor.");
    } finally {
      setIsJoining(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">
          Validando convite...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-md mx-auto border-destructive/20 bg-destructive/5 mt-12">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertCircle className="w-5 h-5" />
            <CardTitle>Erro no Convite</CardTitle>
          </div>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12 px-4">
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
            <Users className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Convite para Grupo
          </CardTitle>
          <CardDescription>
            Você foi convidado para entrar no grupo:
            <span className="block mt-1 font-bold text-foreground text-lg italic">
              "{groupInfo?.name}"
            </span>
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleJoin}>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Senha de Acesso
                </label>
              </div>
              <Input
                type="password"
                placeholder="Digite a senha do grupo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground">
                Peça a senha ao administrador que enviou o convite.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full h-11 text-base"
              disabled={isJoining}
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar no Grupo"
              )}
            </Button>
            <Button
              asChild
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground"
            >
              <Link href="/dashboard">Cancelar</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function GroupJoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <GroupJoinContent />
    </Suspense>
  );
}
