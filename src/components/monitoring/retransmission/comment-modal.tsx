"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Loader2 } from "lucide-react";

interface CommentModalProps {
  /** Si el modal está abierto */
  isOpen: boolean;
  /** Callback al cerrar */
  onClose: () => void;
  /** Callback al guardar */
  onSave: (comment: string) => Promise<void>;
  /** Comentario inicial */
  initialComment?: string;
  /** Placa del vehículo */
  vehiclePlate: string;
}

const MAX_CHARACTERS = 500;

/**
 * Modal para editar comentarios de retransmisión
 */
export function CommentModal({
  isOpen,
  onClose,
  onSave,
  initialComment = "",
  vehiclePlate,
}: CommentModalProps) {
  const [comment, setComment] = useState(initialComment);
  const [isSaving, setIsSaving] = useState(false);

  // Resetear comentario cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setComment(initialComment);
    }
  }, [isOpen, initialComment]);

  const charactersRemaining = MAX_CHARACTERS - comment.length;
  const isOverLimit = charactersRemaining < 0;

  const handleSave = async () => {
    if (isOverLimit) return;
    
    setIsSaving(true);
    try {
      await onSave(comment.trim());
      onClose();
    } catch (error) {
      console.error("Error saving comment:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setComment("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comentario - {vehiclePlate}
          </DialogTitle>
          <DialogDescription>
            Agrega o edita el comentario para este registro de retransmisión.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Escribe un comentario sobre el estado de retransmisión..."
            rows={5}
            className="resize-none"
          />
          
          <div className="flex items-center justify-between text-sm">
            <span className={isOverLimit ? "text-destructive" : "text-muted-foreground"}>
              {charactersRemaining} caracteres restantes
            </span>
            {comment.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-muted-foreground"
              >
                Limpiar
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isOverLimit}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
