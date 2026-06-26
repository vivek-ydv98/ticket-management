import { Shield, Mail, Calendar, UserCheck, Pencil, Trash2 } from "lucide-react";
import { Role } from "@/core/src/index";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string | Date;
}

interface UsersTableProps {
  users: User[];
  isLoading: boolean;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
}

function SkeletonRow({ showActions }: { showActions: boolean }) {
  return (
    <tr className="hover:bg-muted/10">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 w-32 rounded bg-muted animate-pulse" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 w-40 rounded bg-muted animate-pulse" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <div className="h-5 w-16 rounded bg-muted animate-pulse" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
      </td>
      {showActions && (
        <td className="px-6 py-4 whitespace-nowrap text-right">
          <div className="h-8 w-8 rounded bg-muted animate-pulse ml-auto" />
        </td>
      )}
    </tr>
  );
}

function TableHeader({ showActions }: { showActions: boolean }) {
  return (
    <thead className="bg-muted/30">
      <tr>
        {["Name", "Email", "Role", "Joined"].map((col) => (
          <th
            key={col}
            scope="col"
            className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider"
          >
            {col}
          </th>
        ))}
        {showActions && (
          <th
            scope="col"
            className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider"
          >
            Actions
          </th>
        )}
      </tr>
    </thead>
  );
}

export default function UsersTable({ users, isLoading, onEdit, onDelete }: UsersTableProps) {
  const showActions = !!onEdit || !!onDelete;

  return (
    <div className="overflow-hidden rounded-xl border border-border/40 bg-card/20 backdrop-blur-md shadow-lg shadow-black/10">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border/20">
          <TableHeader showActions={showActions} />
          <tbody className={`divide-y divide-border/10 ${isLoading ? "bg-card/10" : "bg-card/5"}`}>
            {isLoading ? (
              [1, 2, 3, 4, 5].map((_, i) => <SkeletonRow key={i} showActions={showActions} />)
            ) : (
              <>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-muted/30 transition-all duration-200 border-b border-border/10 last:border-b-0 group"
                  >
                    {/* Name */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground group-hover:text-brand transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-brand/10 flex items-center justify-center border border-brand/20 text-[10px] text-brand">
                          {user.name
                            ? user.name.split(" ").map((n) => n[0]).join("")
                            : "U"}
                        </div>
                        <span>{user.name}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 opacity-60" />
                        <span>{user.email}</span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2.5 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${user.role === Role.ADMIN
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}
                      >
                        {user.role === Role.ADMIN ? (
                          <Shield className="h-3 w-3" />
                        ) : (
                          <UserCheck className="h-3 w-3" />
                        )}
                        {user.role}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 opacity-60" />
                        <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    {showActions && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(user)}
                            className="text-muted-foreground hover:text-brand p-1.5 rounded-lg hover:bg-muted/40 transition-colors inline-flex items-center justify-center"
                            aria-label={`Edit ${user.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {onDelete && user.role !== Role.ADMIN && (
                          <button
                            onClick={() => onDelete(user)}
                            className="text-muted-foreground hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors inline-flex items-center justify-center"
                            aria-label={`Delete ${user.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}

                {users.length === 0 && (
                  <tr>
                    <td
                      className="px-6 py-8 text-center text-muted-foreground"
                      colSpan={showActions ? 5 : 4}
                    >
                      No users found
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
