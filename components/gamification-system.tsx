"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check,
  Medal,
  Star,
  Target,
  Trophy,
  UserPlus,
  Users as UsersIcon,
  X,
  MoreVertical,
  UserX,
  ShieldAlert,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function GamificationSystem() {
  const [email, setEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const { data: friendsData, mutate: mutateFriends } = useSWR(
    "/api/friends",
    fetcher,
  );
  const { data: rankingData, mutate: mutateRanking } = useSWR(
    "/api/ranking?mode=global",
    fetcher,
  );
  const { data: friendsRankingData, mutate: mutateFriendsRanking } = useSWR(
    "/api/ranking?mode=friends",
    fetcher,
  );

  async function handleAddFriend(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setIsAdding(true);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Solicitação enviada!");
        setEmail("");
        mutateFriends();
      } else {
        toast.error(data.error || "Erro ao adicionar amigo");
      }
    } catch {
      toast.error("Erro na conexão");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleFriendAction(
    friendId: string,
    action: "accept" | "reject" | "block" | "unblock" | "delete",
  ) {
    if (action === "delete" && !confirm("Tem certeza que deseja excluir este amigo?")) return;
    if (action === "block" && !confirm("Tem certeza que deseja bloquear este amigo?")) return;

    try {
      const res = await fetch("/api/friends", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId, action }),
      });
      if (res.ok) {
        const messages: Record<string, string> = {
          accept: "Amizade aceita!",
          reject: "Solicitação removida",
          block: "Amigo bloqueado",
          unblock: "Amigo desbloqueado",
          delete: "Amizade removida",
        };
        toast.success(messages[action] || "Sucesso!");
        mutateFriends();
        mutateFriendsRanking();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erro ao processar");
      }
    } catch {
      toast.error("Erro ao processar");
    }
  }

  const friends = friendsData?.data?.friends ?? [];
  const pendingRequests = friendsData?.data?.pendingRequests ?? [];
  const globalRanking = rankingData?.data ?? [];
  const friendsRanking = friendsRankingData?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ranking Section */}
        <Card className="md:col-span-2 overflow-hidden border-primary/20">
          <CardHeader className="bg-primary/5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Ranking de Produtividade
                </CardTitle>
                <CardDescription>
                  Quem está dominando as tarefas?
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="global" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-12 px-4 gap-4">
                <TabsTrigger
                  value="global"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12"
                >
                  Global
                </TabsTrigger>
                <TabsTrigger
                  value="friends"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12"
                >
                  Amigos
                </TabsTrigger>
              </TabsList>
              <TabsContent value="global" className="p-4 m-0">
                <RankingList users={globalRanking} />
              </TabsContent>
              <TabsContent value="friends" className="p-4 m-0">
                <RankingList users={friendsRanking} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Friends Section */}
        <div className="space-y-6">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <UsersIcon className="w-4 h-4" />
                Amigos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleAddFriend} className="flex gap-2">
                <Input
                  placeholder="Email do amigo"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-sm"
                />
                <Button
                  size="sm"
                  type="submit"
                  disabled={isAdding}
                  className="h-9"
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              </form>

              {pendingRequests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                    Solicitações
                  </p>
                  {pendingRequests.map((req: any) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/10"
                    >
                      <span className="text-xs font-medium truncate max-w-[120px]">
                        {req.name}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-success hover:bg-success/10"
                          onClick={() => handleFriendAction(req.id, "accept")}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => handleFriendAction(req.id, "reject")}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                  Seus Amigos
                </p>
                {friends.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4 italic">
                    Nenhum amigo ainda
                  </p>
                ) : (
                  friends.map((friend: any) => (
                    <div
                      key={friend.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {friend.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate flex items-center gap-2">
                          {friend.name}
                          {friend.friendship_status === "blocked" && (
                            <Badge variant="destructive" className="text-[8px] h-3.5 px-1">
                              Bloqueado
                            </Badge>
                          )}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="text-[8px] h-3.5 px-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                          >
                            Lvl {friend.level || 1}
                          </Badge>
                          <span className="text-[9px] text-muted-foreground">
                            {friend.points || 0} pts
                          </span>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {friend.friendship_status === "blocked" ? (
                            <DropdownMenuItem onClick={() => handleFriendAction(friend.id, "unblock")}>
                              <Check className="h-4 w-4 mr-2" />
                              Desbloquear
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleFriendAction(friend.id, "block")} className="text-destructive">
                              <ShieldAlert className="h-4 w-4 mr-2" />
                              Bloquear
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleFriendAction(friend.id, "delete")} className="text-destructive">
                            <UserX className="h-4 w-4 mr-2" />
                            Excluir Amigo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                Como ganhar pontos?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center text-success shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-bold">Concluir Tarefas</p>
                  <p className="text-[10px] text-muted-foreground">
                    Baixa: 10pts | Média: 25pts | Alta: 50pts
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-bold">Subir de Nível</p>
                  <p className="text-[10px] text-muted-foreground">
                    Cada 1000 pontos você sobe de nível!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RankingList({ users }: { users: any[] }) {
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <UsersIcon className="w-12 h-12 mb-4 opacity-10" />
        <p className="text-sm">Ninguém no ranking ainda</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((user, index) => {
        const isTop3 = index < 3;
        const Medals = [
          <Medal key="1" className="w-5 h-5 text-yellow-500" />,
          <Medal key="2" className="w-5 h-5 text-slate-400" />,
          <Medal key="3" className="w-5 h-5 text-amber-700" />,
        ];

        return (
          <div
            key={user.id}
            className={cn(
              "flex items-center gap-4 p-3 rounded-xl transition-all border",
              index === 0
                ? "bg-yellow-500/5 border-yellow-500/20"
                : "bg-card border-transparent hover:border-muted-foreground/10",
            )}
          >
            <div className="w-8 flex justify-center font-bold text-lg">
              {isTop3 ? (
                Medals[index]
              ) : (
                <span className="text-muted-foreground text-sm">
                  #{index + 1}
                </span>
              )}
            </div>
            <Avatar
              className={cn(
                "h-10 w-10 border-2",
                isTop3 ? "border-yellow-500/20" : "border-transparent",
              )}
            >
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {user.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{user.name}</p>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 border-primary/20 bg-primary/5"
                >
                  Lvl {user.level || 1}
                </Badge>
                <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${((user.points || 0) % 1000) / 10}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="font-black text-primary text-lg leading-none">
                {user.points || 0}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                Pontos
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
