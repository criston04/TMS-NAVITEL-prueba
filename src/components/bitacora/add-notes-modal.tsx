'use client';

/**
 * Modal para agregar notas de operador a un evento de bitácora.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StickyNote, Loader2, Truck } from 'lucide-react';
import type { BitacoraEntry } from '@/types/bitacora';

interface AddNotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: BitacoraEntry | null;
  onConfirm: (entryId: string, notes: string) => void;
}

export function AddNotesModal({
  open,
  onOpenChange,
  entry,
  onConfirm,
}: AddNotesModalProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOpen = (value: boolean) => {
    if (value && entry) {
      // Pre-cargar notas existentes al abrir
      setNotes(entry.operatorNotes || '');
    }
    if (!value) {
      setNotes('');
    }
    onOpenChange(value);
  };

  const handleSubmit = async () => {
    if (!entry || !notes.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    onConfirm(entry.id, notes.trim());
    setLoading(false);
    setNotes('');
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-primary" />
            Agregar notas
          </DialogTitle>
          <DialogDescription>
            Agregar notas del operador al evento{' '}
            <span className="font-semibold text-foreground">{entry.id}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Contexto del evento */}
        <div className="flex items-center gap-2 text-sm bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2 border">
          <Truck className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{entry.vehiclePlate}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground truncate">
            {entry.geofenceName || entry.address || 'Sin ubicación'}
          </span>
        </div>

        {/* Notas existentes */}
        {entry.operatorNotes && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">
              Notas anteriores
            </div>
            <div className="text-sm text-amber-800 dark:text-amber-300">
              {entry.operatorNotes}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="operator-notes">
            {entry.operatorNotes ? 'Actualizar notas' : 'Notas del operador'}
          </Label>
          <Textarea
            id="operator-notes"
            placeholder="Escriba sus observaciones sobre este evento..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="resize-none"
            autoFocus
          />
          <div className="text-xs text-muted-foreground text-right">
            {notes.length} / 500 caracteres
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !notes.trim()}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <StickyNote className="h-4 w-4 mr-1.5" />
                Guardar notas
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
