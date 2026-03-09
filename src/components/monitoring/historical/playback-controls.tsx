"use client";

import { cn } from "@/lib/utils";
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLAYBACK_SPEEDS, type UseRoutePlaybackState, type UseRoutePlaybackActions } from "@/hooks/monitoring/use-route-playback";
import type { PlaybackSpeed } from "@/types/monitoring";

interface PlaybackControlsProps {
  /** Estado de reproducción */
  state: UseRoutePlaybackState;
  /** Acciones de reproducción */
  actions: UseRoutePlaybackActions;
  /** Modo compacto (para mostrar sobre el mapa) */
  compact?: boolean;
  /** Clase adicional */
  className?: string;
}

/**
 * Controles de reproducción para ruta histórica
 */
export function PlaybackControls({
  state,
  actions,
  compact = false,
  className,
}: PlaybackControlsProps) {
  const {
    isPlaying,
    isPaused,
    currentIndex,
    speed,
    progress,
    currentTime,
    totalPoints,
  } = state;

  const {
    play,
    pause,
    stop,
    reset,
    setSpeed,
    seekToProgress,
    stepForward,
    stepBackward,
  } = actions;

  // Modo compacto para el mapa
  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 rounded-full border bg-background/95 px-3 py-2 shadow-xl backdrop-blur-md",
        className
      )}>
        {/* Reset */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={reset}
          title="Reiniciar"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>

        {/* Step back */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={stepBackward}
          disabled={currentIndex <= 0}
          title="Punto anterior"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </Button>

        {/* Play/Pause */}
        <Button
          variant="default"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={isPlaying ? pause : play}
          title={isPlaying ? "Pausar" : "Reproducir"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </Button>

        {/* Step forward */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={stepForward}
          disabled={currentIndex >= totalPoints - 1}
          title="Siguiente punto"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </Button>

        {/* Stop */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={stop}
          title="Detener"
        >
          <Square className="h-3.5 w-3.5" />
        </Button>

        {/* Separador */}
        <div className="h-6 w-px bg-border" />

        {/* Slider de progreso */}
        <div className="w-32">
          <Slider
            value={[progress]}
            onValueChange={([value]) => seekToProgress(value)}
            max={100}
            step={0.1}
            className="cursor-pointer"
          />
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          <span className="font-medium">{currentIndex + 1}</span>
          <span className="text-muted-foreground/70">/{totalPoints}</span>
        </div>

        {/* Separador */}
        <div className="h-6 w-px bg-border" />

        {/* Velocidad */}
        <Select
          value={speed.toString()}
          onValueChange={(value) => setSpeed(parseInt(value) as PlaybackSpeed)}
        >
          <SelectTrigger className="h-8 w-16 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLAYBACK_SPEEDS.map((s) => (
              <SelectItem key={s} value={s.toString()}>
                {s}x
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Barra de progreso */}
      <div className="space-y-2">
        <Slider
          value={[progress]}
          onValueChange={([value]) => seekToProgress(value)}
          max={100}
          step={0.1}
          className="cursor-pointer"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{currentTime}</span>
          <span>
            Punto {currentIndex + 1} de {totalPoints}
          </span>
        </div>
      </div>

      {/* Botones de control */}
      <div className="flex items-center justify-center gap-2">
        {/* Reset */}
        <Button
          variant="ghost"
          size="icon"
          onClick={reset}
          title="Reiniciar"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        {/* Step back */}
        <Button
          variant="ghost"
          size="icon"
          onClick={stepBackward}
          disabled={currentIndex <= 0}
          title="Punto anterior"
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        {/* Stop */}
        <Button
          variant="ghost"
          size="icon"
          onClick={stop}
          title="Detener"
        >
          <Square className="h-4 w-4" />
        </Button>

        {/* Play/Pause */}
        <Button
          variant="default"
          size="icon"
          className="h-12 w-12"
          onClick={isPlaying ? pause : play}
          title={isPlaying ? "Pausar" : "Reproducir"}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </Button>

        {/* Step forward */}
        <Button
          variant="ghost"
          size="icon"
          onClick={stepForward}
          disabled={currentIndex >= totalPoints - 1}
          title="Siguiente punto"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Selector de velocidad */}
      <div className="flex items-center justify-center gap-3">
        <span className="text-sm text-muted-foreground">Velocidad:</span>
        <Select
          value={speed.toString()}
          onValueChange={(value) => setSpeed(parseInt(value) as PlaybackSpeed)}
        >
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLAYBACK_SPEEDS.map((s) => (
              <SelectItem key={s} value={s.toString()}>
                {s}x
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Estado */}
      <div className="text-center text-xs text-muted-foreground">
        {isPlaying && "Reproduciendo..."}
        {isPaused && "En pausa"}
        {!isPlaying && !isPaused && currentIndex === 0 && "Listo para reproducir"}
        {!isPlaying && !isPaused && currentIndex > 0 && currentIndex < totalPoints - 1 && "Detenido"}
        {!isPlaying && !isPaused && currentIndex === totalPoints - 1 && "Reproducción completada"}
      </div>
    </div>
  );
}
