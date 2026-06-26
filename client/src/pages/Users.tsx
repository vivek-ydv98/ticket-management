import { useState } from "react";
import { useSession } from "../lib/auth-client";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Layout from "../components/Layout";
import { UserPlus } from "lucide-react";
import CreateUserForm from "../components/CreateUserForm";
import UsersTable from "../components/UsersTable";
import DeleteUserConfirmModal from "../components/DeleteUserConfirmModal";

import { Role } from "@/core/src/index";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string | Date;
}

export default function UsersPage() {
  console.error("UsersPage render started");
  const { data: session, isPending } = useSession();
  console.error("useSession returned:", { session, isPending });

  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (isPending) {
    console.error("Returning null because isPending is true");
    return null;
  }

  console.error("About to call useQuery");
  const {
    data: users = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      console.error("Inside queryFn");
      const response = await axios.get("/api/users", { withCredentials: true });
      return response.data;
    },
  });

  console.error("useQuery returned:", { users, isLoading, isError, error });

  const formattedError = error
    ? axios.isAxiosError(error)
      ? error.response
        ? error.response.data?.message || `Failed to fetch users: ${error.response.status}`
        : error.request
          ? "Network error: No response from server"
          : error.message
      : error instanceof Error
        ? error.message
        : "An unexpected error occurred"
    : null;

  const handleEdit = (user: User) => {
    setUserToEdit(user);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setUserToEdit(null);
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await axios.delete(`/api/users/${userToDelete.id}`, { withCredentials: true });
      setUserToDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (err: any) {
      console.error("Failed to delete user:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "An error occurred while deleting the user.";
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteClose = () => {
    if (isDeleting) return;
    setUserToDelete(null);
    setDeleteError(null);
  };

  return (
    <Layout>
      <main className="max-w-7xl mx-auto p-8 space-y-8 animate-fade-in">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              User Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              View and manage system users, their access levels, and roles.
            </p>
          </div>
          <Button
            onClick={() => {
              setUserToEdit(null);
              setIsOpen(true);
            }}
            className="bg-brand hover:bg-brand-hover text-white flex items-center gap-2 shadow-md shadow-brand/10 hover:shadow-brand/20 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>Create User</span>
          </Button>
        </div>

        {/* Error banner */}
        {formattedError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {formattedError}
          </div>
        )}

        {/* Users Table */}
        <UsersTable
          users={users}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />

        {/* Create/Edit User Modal */}
        <CreateUserForm isOpen={isOpen} onClose={handleClose} userToEdit={userToEdit} />

        {/* Delete Confirmation Modal */}
        <DeleteUserConfirmModal
          isOpen={!!userToDelete}
          onClose={handleDeleteClose}
          onConfirm={handleDeleteConfirm}
          userName={userToDelete?.name}
          isDeleting={isDeleting}
          error={deleteError}
        />
      </main>
    </Layout>
  );
}