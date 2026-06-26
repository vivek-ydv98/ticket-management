import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createUserSchema, updateUserSchema, Role } from "@/core/src/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { X, Loader2, UserPlus, Pencil } from "lucide-react";

type CreateUserFormValues = z.infer<typeof createUserSchema>;

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string | Date;
}

interface CreateUserFormProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: User | null;
}

export default function CreateUserForm({ isOpen, onClose, userToEdit }: CreateUserFormProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(userToEdit ? updateUserSchema : createUserSchema) as Resolver<CreateUserFormValues>,
    defaultValues: { name: "", email: "", password: "" },
  });

  // Reset form values when isOpen or userToEdit changes
  useEffect(() => {
    if (isOpen) {
      reset({
        name: userToEdit?.name ?? "",
        email: userToEdit?.email ?? "",
        password: "",
      });
    }
  }, [isOpen, userToEdit, reset]);

  const onSubmit = async (data: CreateUserFormValues) => {
    try {
      if (userToEdit) {
        await axios.put(`/api/users/${userToEdit.id}`, data, { withCredentials: true });
      } else {
        await axios.post("/api/users", data, { withCredentials: true });
      }
      reset();
      onClose();
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (err: any) {
      console.error(userToEdit ? "Failed to update user:" : "Failed to create user:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (userToEdit ? "An error occurred while updating the user." : "An error occurred while creating the user.");
      setError("root", { message: msg });
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-border/40 bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/40 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/20">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center">
              {userToEdit ? (
                <Pencil className="h-4 w-4 text-brand" />
              ) : (
                <UserPlus className="h-4 w-4 text-brand" />
              )}
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {userToEdit ? "Edit User" : "Create New User"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {errors.root && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {errors.root.message}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm font-medium text-foreground">
              Full Name
            </Label>
            <Input
              id="name"
              placeholder="John Doe"
              {...register("name")}
              className="bg-muted/20 border-border/40 focus:border-brand/50 focus:ring-brand/20 transition-colors"
            />
            {errors.name && (
              <p className="text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              {...register("email")}
              className="bg-muted/20 border-border/40 focus:border-brand/50 focus:ring-brand/20 transition-colors"
            />
            {errors.email && (
              <p className="text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Password {userToEdit && <span className="text-muted-foreground font-normal text-xs">(Optional)</span>}
            </Label>
            <Input
              id="password"
              type="password"
              placeholder={userToEdit ? "Leave blank to keep unchanged" : "••••••••"}
              {...register("password")}
              className="bg-muted/20 border-border/40 focus:border-brand/50 focus:ring-brand/20 transition-colors"
            />
            {errors.password && (
              <p className="text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 border-border/40 hover:bg-muted/30 transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-brand hover:bg-brand-hover text-white shadow-md shadow-brand/10 hover:shadow-brand/20 transition-all duration-300"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {userToEdit ? "Saving…" : "Creating…"}
                </>
              ) : (
                <>
                  {userToEdit ? (
                    <Pencil className="h-4 w-4 mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  {userToEdit ? "Save Changes" : "Create User"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
