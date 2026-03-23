"use client";

import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  CheckSquare,
  Trophy,
  Users,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  LayoutDashboard,
  CheckCircle2,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const slides = [
  {
    title: "Bem-vindo ao No Time",
    description:
      "Sua produtividade nunca foi tão divertida. Organize sua vida acadêmica e pessoal em um só lugar.",
    icon: Rocket,
    color: "bg-blue-500",
  },
  {
    title: "Organize sua Rotina",
    description:
      "Crie tarefas, defina prioridades e nunca mais perca um prazo. Tudo sincronizado em tempo real.",
    icon: CheckSquare,
    color: "bg-green-500",
  },
  {
    title: "Gamificação Real",
    description:
      "Ganhe pontos por cada tarefa concluída, suba de nível e compita com seus amigos no ranking global.",
    icon: Trophy,
    color: "bg-yellow-500",
  },
  {
    title: "Trabalho em Equipe",
    description:
      "Crie grupos, compartilhe tarefas e colabore com seus amigos de forma simples e eficiente.",
    icon: Users,
    color: "bg-purple-500",
  },
  {
    title: "Importação Inteligente",
    description:
      "Importe seu horário da Católica (UCB) em segundos e transforme suas aulas em tarefas semanais.",
    icon: Calendar,
    color: "bg-red-500",
  },
  {
    title: "Sempre com Você",
    description:
      "Instale o No Time como um PWA e tenha a experiência de um aplicativo nativo no seu celular.",
    icon: Smartphone,
    color: "bg-indigo-500",
  },
];

export default function FirstQrPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress >= 100) {
          handleNext();
          return 0;
        }
        return oldProgress + 0.5;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [currentSlide]);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
      setProgress(0);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
      setProgress(0);
    }
  };

  const SlideIcon = slides[currentSlide].icon;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden">
      <div className="w-full max-w-lg space-y-8 relative">
        {/* Progress Bars */}
        <div className="flex gap-1 w-full absolute top-0 left-0 -mt-12">
          {slides.map((_, index) => (
            <div
              key={index}
              className="h-1 flex-1 bg-muted rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-primary transition-all duration-100 ease-linear"
                style={{
                  width:
                    index === currentSlide
                      ? `${progress}%`
                      : index < currentSlide
                        ? "100%"
                        : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Content Container */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Visual Element */}
            <div className="flex justify-center">
              <div
                className={cn(
                  "w-24 h-24 md:w-32 md:h-32 rounded-3xl flex items-center justify-center shadow-2xl",
                  slides[currentSlide].color,
                )}
              >
                <SlideIcon className="w-12 h-12 md:w-16 md:h-16 text-white" />
              </div>
            </div>

            {/* Text Content */}
            <div className="text-center space-y-4 px-4">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                {slides[currentSlide].title}
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-sm mx-auto">
                {slides[currentSlide].description}
              </p>
            </div>

            {/* App Preview Card (Simulado) */}
            <Card className="border-muted bg-muted/30 overflow-hidden shadow-lg backdrop-blur-sm">
              <CardContent className="p-0">
                <div className="h-48 md:h-64 flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 relative group">
                  <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                    <LayoutDashboard className="w-32 h-32 text-primary" />
                  </div>
                  <div className="relative z-10 space-y-3 w-full px-6">
                    <div className="h-4 w-3/4 bg-primary/20 rounded-full animate-pulse" />
                    <div className="h-4 w-1/2 bg-primary/10 rounded-full animate-pulse delay-75" />
                    <div className="h-12 w-full bg-card rounded-xl border flex items-center px-4 gap-3 shadow-sm">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <div className="h-3 w-24 bg-muted rounded-full" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrev}
            disabled={currentSlide === 0}
            className="rounded-full"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          {currentSlide === slides.length - 1 ? (
            <Button
              asChild
              size="lg"
              className="px-8 rounded-full shadow-lg hover:shadow-primary/20 transition-all active:scale-95 bg-primary text-primary-foreground"
            >
              <Link href="/register">
                Começar Agora
                <ChevronRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="lg"
              onClick={handleNext}
              className="px-8 rounded-full shadow-md active:scale-95"
            >
              Próximo
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          )}

          <div className="w-10 h-10 flex items-center justify-center text-xs font-medium text-muted-foreground">
            {currentSlide + 1}/{slides.length}
          </div>
        </div>

        {/* Skip Button */}
        <div className="text-center pt-2">
          <Button
            asChild
            variant="link"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Link href="/login">Já tenho uma conta</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
