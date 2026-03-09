"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { 
  HistoricalRoutePoint, 
  PlaybackSpeed, 
  RoutePlaybackState 
} from "@/types/monitoring";

/**
 * Opciones del hook de reproducción
 */
export interface UseRoutePlaybackOptions {
  /** Puntos de la ruta a reproducir */
  points: HistoricalRoutePoint[];
  /** Callback cuando cambia el punto actual */
  onPointChange?: (point: HistoricalRoutePoint, index: number) => void;
  /** Callback cuando termina la reproducción */
  onPlaybackComplete?: () => void;
  /** Velocidad inicial */
  initialSpeed?: PlaybackSpeed;
}

/**
 * Estado de reproducción
 */
export interface UseRoutePlaybackState {
  /** Estado completo de reproducción */
  playbackState: RoutePlaybackState;
  /** Si está reproduciendo */
  isPlaying: boolean;
  /** Si está pausado */
  isPaused: boolean;
  /** Índice del punto actual */
  currentIndex: number;
  /** Punto actual */
  currentPoint: HistoricalRoutePoint | null;
  /** Velocidad actual */
  speed: PlaybackSpeed;
  /** Progreso (0-100) */
  progress: number;
  /** Tiempo formateado del punto actual */
  currentTime: string;
  
  totalPoints: number;
}

/**
 * Acciones de reproducción
 */
export interface UseRoutePlaybackActions {
  /** Inicia la reproducción */
  play: () => void;
  /** Pausa la reproducción */
  pause: () => void;
  /** Detiene la reproducción */
  stop: () => void;
  /** Reinicia la reproducción */
  reset: () => void;
  /** Cambia la velocidad */
  setSpeed: (speed: PlaybackSpeed) => void;
  /** Salta a un índice específico */
  seekTo: (index: number) => void;
  /** Salta a un progreso específico (0-100) */
  seekToProgress: (progress: number) => void;
  /** Avanza un punto */
  stepForward: () => void;
  /** Retrocede un punto */
  stepBackward: () => void;
}

/**
 * Velocidades disponibles
 */
export const PLAYBACK_SPEEDS: PlaybackSpeed[] = [1, 2, 4, 8, 16, 32];

/**
 * Intervalo base en milisegundos
 */
const BASE_INTERVAL = 1000;

/**
 * Formatea timestamp a hora legible
 */
function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "--:--:--";
  }
}

/**
 * Hook para reproducción de rutas históricas
 * 
 */
export function useRoutePlayback(
  options: UseRoutePlaybackOptions
): UseRoutePlaybackState & UseRoutePlaybackActions {
  const {
    points,
    onPointChange,
    onPlaybackComplete,
    initialSpeed = 1,
  } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeedState] = useState<PlaybackSpeed>(initialSpeed);

  // Refs para callbacks
  const onPointChangeRef = useRef(onPointChange);
  const onPlaybackCompleteRef = useRef(onPlaybackComplete);

  // Actualizar refs en un effect
  useEffect(() => {
    onPointChangeRef.current = onPointChange;
    onPlaybackCompleteRef.current = onPlaybackComplete;
  }, [onPointChange, onPlaybackComplete]);

  // Ref para el intervalo
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Limpia el intervalo
   */
  const clearPlaybackInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Inicia la reproducción
   */
  const play = useCallback(() => {
    if (points.length === 0) return;
    
    // Si terminó, reiniciar
    if (currentIndex >= points.length - 1) {
      setCurrentIndex(0);
    }
    
    setIsPlaying(true);
    setIsPaused(false);
  }, [points.length, currentIndex]);

  /**
   * Pausa la reproducción
   */
  const pause = useCallback(() => {
    setIsPaused(true);
    setIsPlaying(false);
    clearPlaybackInterval();
  }, [clearPlaybackInterval]);

  /**
   * Detiene la reproducción
   */
  const stop = useCallback(() => {
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentIndex(0);
    clearPlaybackInterval();
  }, [clearPlaybackInterval]);

  /**
   * Reinicia la reproducción
   */
  const reset = useCallback(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
    setIsPaused(false);
    clearPlaybackInterval();
  }, [clearPlaybackInterval]);

  /**
   * Cambia la velocidad
   */
  const setSpeed = useCallback((newSpeed: PlaybackSpeed) => {
    setSpeedState(newSpeed);
  }, []);

  /**
   * Salta a un índice específico
   */
  const seekTo = useCallback((index: number) => {
    const validIndex = Math.max(0, Math.min(index, points.length - 1));
    setCurrentIndex(validIndex);
    
    const point = points[validIndex];
    if (point && onPointChangeRef.current) {
      onPointChangeRef.current(point, validIndex);
    }
  }, [points]);

  /**
   * Salta a un progreso específico (0-100)
   */
  const seekToProgress = useCallback((progress: number) => {
    const index = Math.floor((progress / 100) * (points.length - 1));
    seekTo(index);
  }, [points.length, seekTo]);

  /**
   * Avanza un punto
   */
  const stepForward = useCallback(() => {
    if (currentIndex < points.length - 1) {
      seekTo(currentIndex + 1);
    }
  }, [currentIndex, points.length, seekTo]);

  /**
   * Retrocede un punto
   */
  const stepBackward = useCallback(() => {
    if (currentIndex > 0) {
      seekTo(currentIndex - 1);
    }
  }, [currentIndex, seekTo]);

  /**
   * Efecto para manejar la reproducción
   */
  useEffect(() => {
    if (!isPlaying || isPaused || points.length === 0) {
      clearPlaybackInterval();
      return;
    }

    const interval = BASE_INTERVAL / speed;

    intervalRef.current = setInterval(() => {
      setCurrentIndex(prevIndex => {
        const nextIndex = prevIndex + 1;
        
        if (nextIndex >= points.length) {
          // Reproducción completada
          setIsPlaying(false);
          clearPlaybackInterval();
          if (onPlaybackCompleteRef.current) {
            onPlaybackCompleteRef.current();
          }
          return prevIndex;
        }

        // Notificar cambio de punto
        const point = points[nextIndex];
        if (point && onPointChangeRef.current) {
          onPointChangeRef.current(point, nextIndex);
        }

        return nextIndex;
      });
    }, interval);

    return () => clearPlaybackInterval();
  }, [isPlaying, isPaused, speed, points, clearPlaybackInterval]);

  /**
   * Notificar punto inicial cuando cambian los puntos
   */
  useEffect(() => {
    if (points.length > 0 && currentIndex < points.length) {
      const point = points[currentIndex];
      if (point && onPointChangeRef.current) {
        onPointChangeRef.current(point, currentIndex);
      }
    }
  }, [points, currentIndex]);

  // Derivar datos
  const currentPoint = useMemo(() => {
    if (points.length === 0 || currentIndex >= points.length) return null;
    return points[currentIndex];
  }, [points, currentIndex]);

  const progress = useMemo(() => {
    if (points.length <= 1) return 0;
    return Math.round((currentIndex / (points.length - 1)) * 100);
  }, [currentIndex, points.length]);

  const currentTime = useMemo(() => {
    if (!currentPoint) return "--:--:--";
    return formatTime(currentPoint.timestamp);
  }, [currentPoint]);

  const totalPoints = points.length;

  const playbackState: RoutePlaybackState = useMemo(() => ({
    isPlaying,
    isPaused,
    currentIndex,
    speed,
    progress,
    currentPoint,
  }), [isPlaying, isPaused, currentIndex, speed, progress, currentPoint]);

  return useMemo(() => ({
    playbackState,
    isPlaying,
    isPaused,
    currentIndex,
    currentPoint,
    speed,
    progress,
    currentTime,
    totalPoints,
    play,
    pause,
    stop,
    reset,
    setSpeed,
    seekTo,
    seekToProgress,
    stepForward,
    stepBackward,
  }), [
    playbackState,
    isPlaying,
    isPaused,
    currentIndex,
    currentPoint,
    speed,
    progress,
    currentTime,
    totalPoints,
    play,
    pause,
    stop,
    reset,
    setSpeed,
    seekTo,
    seekToProgress,
    stepForward,
    stepBackward,
  ]);
}
