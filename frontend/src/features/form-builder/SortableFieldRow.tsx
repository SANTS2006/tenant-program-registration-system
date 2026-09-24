import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { metaFor } from "./fieldTypes";
import type { EditableField } from "./types";

export function SortableFieldRow({
  field,
  onEdit,
  onDelete,
}: {
  field: EditableField;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.fieldKey });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5 ${isDragging ? "opacity-50" : ""}`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Reorder field"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{field.label || "Untitled field"}</p>
          {field.required && (
            <Badge variant="outline" className="text-[10px]">
              Required
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {metaFor(field.type).label} &middot; {field.fieldKey}
        </p>
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={onEdit} aria-label="Edit field">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={onDelete} aria-label="Delete field">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
