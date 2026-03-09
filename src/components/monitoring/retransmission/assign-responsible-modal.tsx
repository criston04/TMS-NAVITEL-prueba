"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { UserPlus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AssignResponsibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (assignedTo: string, notes: string) => void;
  vehiclePlate: string;
  currentAssignee?: string;
}

const OPERATORS = [
  "Carlos Mendoza",
  "Ana García",
  "Luis Rodríguez",
  "María Torres",
  "Pedro Castillo",
  "Julia Rivera",
];

/**
 * Modal para asignar responsable a un caso de retransmisión
 */
export function AssignResponsibleModal({
  isOpen,
  onClose,
  onAssign,
  vehiclePlate,
  currentAssignee,
}: AssignResponsibleModalProps) {
  const [selectedOperator, setSelectedOperator] = useState(currentAssignee || "");
  const [notes, setNotes] = useState("");

  const handleAssign = () => {
    if (!selectedOperator) return;
    onAssign(selectedOperator, notes);
    setNotes("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="z-[10001] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Asignar responsable
          </DialogTitle>
          <DialogDescription>
            Asigna un operador para dar seguimiento al caso de {vehiclePlate}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Operador responsable</Label>
            <Select value={selectedOperator} onValueChange={setSelectedOperator}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar operador" />
              </SelectTrigger>
              <SelectContent className="z-[10002]">
                {OPERATORS.map((op) => (
                  <SelectItem key={op} value={op}>
                    <span className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5" />
                      {op}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Contactar al proveedor GPS para verificar el equipo..."
              rows={3}
              maxLength={500}
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {notes.length}/500
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleAssign} disabled={!selectedOperator}>
            Asignar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
