import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateProgram } from "./hooks";
import { ApiError } from "@/lib/api";
import { Plus } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  shortDescription: z.string().max(500).optional(),
  description: z.string().max(20000).optional(),
});

type FormValues = z.infer<typeof schema>;

export function ProgramCreateDialog() {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const createProgram = useCreateProgram();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      const program = await createProgram.mutateAsync(values);
      toast.success("Program created");
      setOpen(false);
      reset();
      navigate(`/admin/programs/${program.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create program");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          New Program
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new program</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Program name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shortDescription">Short description</Label>
            <Input id="shortDescription" placeholder="Shown on cards and listings" {...register("shortDescription")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Full description</Label>
            <Textarea id="description" rows={4} {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createProgram.isPending}>
              {createProgram.isPending ? "Creating..." : "Create program"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
