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
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const slides = [
  {
    title: "Bem-vindo ao No Time",
    description:
      "Sua produtividade nunca foi tão divertida. Organize sua vida acadêmica e pessoal em um só lugar.",
    icon: Rocket,
    color: "from-blue-500 to-cyan-400",
    image: "/images/onboarding-1.jpg",
  },
  {
    title: "Organize sua Rotina",
    description:
      "Crie tarefas, defina prioridades e nunca mais perca um prazo. Tudo sincronizado em tempo real.",
    icon: CheckSquare,
    color: "from-green-500 to-emerald-400",
    image: "/images/onboarding-2.jpg",
  },
  {
    title: "Gamificação Real",
    description:
      "Ganhe pontos por cada tarefa concluída, suba de nível e compita com seus amigos no ranking global.",
    icon: Trophy,
    color: "from-yellow-500 to-orange-400",
    image: "/images/onboarding-3.jpg",
  },
  {
    title: "Trabalho em Equipe",
    description:
      "Crie grupos, compartilhe tarefas e colabore com seus amigos de forma simples e eficiente.",
    icon: Users,
    color: "from-purple-500 to-pink-400",
    image: "/images/onboarding-4.jpg",
  },
  {
    title: "Importação Inteligente",
    description:
      "Importe seu horário da Católica (UCB) em segundos e transforme suas aulas em tarefas semanais.",
    icon: Calendar,
    color: "from-red-500 to-rose-400",
    image: "/images/onboarding-5.jpg",
  },
  {
    title: "Sempre com Você",
    description:
      "Instale o No Time como um PWA e tenha a experiência de um aplicativo nativo no seu celular.",
    icon: Smartphone,
    color: "from-indigo-500 to-violet-400",
    image: "/images/onboarding-6.jpg",
  },
];

export default function OnboardingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress >= 100) {
          handleNext();
          return 0;
        }
        return oldProgress + 0.6;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [currentSlide]);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
      setProgress(0);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
      setProgress(0);
    }
  };

  const SlideIcon = slides[currentSlide].icon;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-blue-950/50 to-purple-950/30 flex flex-col items-center overflow-hidden relative">
      {/* Ambient glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            initial={{
              x:
                Math.random() *
                (typeof window !== "undefined" ? window.innerWidth : 400),
              y:
                Math.random() *
                (typeof window !== "undefined" ? window.innerHeight : 800),
            }}
            animate={{
              y: [null, -20, 20],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              repeatType: "reverse",
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-lg flex flex-col h-full min-h-[100dvh] flex-1 relative z-10 p-6 md:p-8">
        {/* Progress Bars */}
        <div className="flex gap-1.5 w-full mb-6">
          {slides.map((_, index) => (
            <div
              key={index}
              className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm"
            >
              <motion.div
                className="h-full bg-gradient-to-r from-blue-400 to-purple-400"
                initial={{ width: 0 }}
                animate={{
                  width:
                    index === currentSlide
                      ? `${progress}%`
                      : index < currentSlide
                        ? "100%"
                        : "0%",
                }}
                transition={{ duration: 0.1, ease: "linear" }}
              />
            </div>
          ))}
        </div>

        {/* Content Container */}
        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -50) handleNext();
                if (info.offset.x > 50) handlePrev();
              }}
              className="space-y-6"
            >
              {/* Image with glow */}
              <div className="relative flex justify-center">
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-r opacity-30 blur-2xl scale-90",
                    slides[currentSlide].color,
                  )}
                />
                <div className="relative w-full aspect-[4/3] max-w-sm rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                  <Image
                    src={slides[currentSlide].image}
                    alt={slides[currentSlide].title}
                    fill
                    className="object-cover"
                    priority
                  />
                  {/* Image overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                </div>
              </div>

              {/* Icon badge */}
              <div className="flex justify-center -mt-8 relative z-10">
                <motion.div
                  className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl border border-white/20 bg-gradient-to-br",
                    slides[currentSlide].color,
                  )}
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ delay: 0.1, type: "spring" }}
                >
                  <SlideIcon className="w-7 h-7 text-white drop-shadow-lg" />
                </motion.div>
              </div>

              {/* Text Content */}
              <div className="text-center space-y-3 pt-2">
                <motion.h1
                  className="text-2xl md:text-3xl font-bold tracking-tight text-white text-balance"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  {slides[currentSlide].title}
                </motion.h1>
                <motion.p
                  className="text-base text-slate-300 leading-relaxed max-w-[300px] mx-auto text-pretty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {slides[currentSlide].description}
                </motion.p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Actions */}
        <div className="mt-6 space-y-4 w-full">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              disabled={currentSlide === 0}
              className="rounded-full h-12 w-12 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>

            <div className="flex items-center gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCurrentSlide(i);
                    setProgress(0);
                  }}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    i === currentSlide
                      ? "bg-white w-6"
                      : "bg-white/30 hover:bg-white/50",
                  )}
                />
              ))}
            </div>

            {currentSlide === slides.length - 1 ? (
              <Button
                asChild
                className="rounded-full px-6 h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-lg shadow-purple-500/25 hover:scale-105 transition-transform"
              >
                <Link href="/register">
                  Começar
                  <ChevronRight className="ml-1 w-4 h-4" />
                </Link>
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="rounded-full px-6 h-12 bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-sm"
              >
                Próximo
                <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="text-center pb-2">
            <Button
              asChild
              variant="link"
              className="text-slate-400 hover:text-white text-sm"
            >
              <Link href="/login">Já tenho uma conta</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
