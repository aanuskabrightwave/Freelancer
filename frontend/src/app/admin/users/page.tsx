"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface UserItem {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

interface UsersResponse {
  total: number;
  page: number;
  page_size: number;
  items: UserItem[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Suspension modal states
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [suspendReason, setSuspendReason] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        page_size: "10",
      };
      if (search) params.search = search;
      if (role) params.role = role;
      if (statusFilter) params.status_filter = statusFilter;

      const res = await api.get<UsersResponse>("/admin/users", { params });
      setUsers(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || "Failed to load platform users database.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, [page, role, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const triggerSuspend = (user: UserItem) => {
    setSelectedUser(user);
    setSuspendReason("");
  };

  const handleSuspendSubmit = async () => {
    if (!selectedUser || !suspendReason.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/admin/users/${selectedUser.id}/suspend`, { reason: suspendReason });
      // Update local state
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, is_active: false } : u));
      setSelectedUser(null);
    } catch (err: any) {
      alert(err.message || "Failed to suspend user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = async (userId: number) => {
    if (!confirm("Are you sure you want to reactivate this user account?")) return;
    try {
      await api.post(`/admin/users/${userId}/reactivate`, {});
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: true } : u));
    } catch (err: any) {
      alert(err.message || "Failed to reactivate user.");
    }
  };

  return (
    <div className="p-8 space-y-6 bg-background min-h-screen text-text-main">
      {/* Header */}
      <div className="border-b border-border-custom pb-6">
        <h1 className="text-3xl font-extrabold text-text-main">Users Moderation</h1>
        <p className="text-text-sub text-sm mt-1">Suspend, reactivate, and audit all clients and freelancer accounts.</p>
      </div>

      {/* Filters Form */}
      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-surface p-4 border border-border-custom rounded-xl">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-sub font-bold uppercase">Search</label>
          <input
            type="text"
            placeholder="Name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-background border border-border-custom text-text-main text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-sub font-bold uppercase">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="bg-background border border-border-custom text-text-main text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="">All Roles</option>
            <option value="CLIENT">Client</option>
            <option value="FREELANCER">Freelancer</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-sub font-bold uppercase">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background border border-border-custom text-text-main text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="SUSPENDED">Suspended Only</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-text-main font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </form>

      {/* Users Database Table */}
      {loading ? (
        <div className="py-20 text-center text-text-sub">Loading user database registry...</div>
      ) : error ? (
        <div className="bg-red-950/20 border border-red-900 text-red-400 p-4 rounded-xl">{error}</div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 text-text-muted">No users match the search parameters.</div>
      ) : (
        <div className="bg-surface border border-border-custom rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background border-b border-border-custom text-xs font-bold text-text-sub uppercase">
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Registered At</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom text-sm text-text-sub">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-surface transition-colors">
                    <td className="p-4 font-semibold text-text-main">{user.full_name}</td>
                    <td className="p-4">{user.email}</td>
                    <td className="p-4 font-mono text-text-sub">{user.phone}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        user.role === "ADMIN" ? "bg-red-950/50 border border-red-800 text-red-400" :
                        user.role === "FREELANCER" ? "bg-purple-950/50 border border-purple-800 text-purple-400" :
                        "bg-blue-950/50 border border-blue-800 text-blue-400"
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      {user.is_active ? (
                        <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Active
                        </span>
                      ) : (
                        <span className="text-red-400 flex items-center gap-1.5 font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400"></span> Suspended
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-text-sub text-xs">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      {user.is_active ? (
                        <button
                          onClick={() => triggerSuspend(user)}
                          className="bg-red-950 hover:bg-red-900 border border-red-800 text-red-400 font-semibold px-3 py-1 rounded text-xs transition-colors"
                        >
                          Suspend Account
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(user.id)}
                          className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 font-semibold px-3 py-1 rounded text-xs transition-colors"
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Simple Pagination */}
          <div className="bg-background border-t border-border-custom p-4 flex justify-between items-center text-xs text-text-sub">
            <span>Showing {users.length} of {total} records</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="bg-surface border border-border-custom text-text-sub px-3 py-1.5 rounded hover:bg-surface-elevated disabled:opacity-50 disabled:hover:bg-surface transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page * 10 >= total}
                onClick={() => setPage(page + 1)}
                className="bg-surface border border-border-custom text-text-sub px-3 py-1.5 rounded hover:bg-surface-elevated disabled:opacity-50 disabled:hover:bg-surface transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspension Modal Dialog */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border-custom w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-text-main">Suspend Account</h3>
              <p className="text-xs text-text-sub mt-1">
                You are about to suspend <strong className="text-text-main">{selectedUser.full_name}</strong> ({selectedUser.email}).
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-text-sub font-bold uppercase">Suspension Reason</label>
              <textarea
                rows={4}
                placeholder="Detail the breach of terms or client reports..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="bg-background border border-border-custom text-text-main text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 focus:outline-none placeholder-text-muted"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={submitting}
                onClick={() => setSelectedUser(null)}
                className="bg-background border border-border-custom hover:bg-surface-elevated text-text-sub px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={submitting || !suspendReason.trim()}
                onClick={handleSuspendSubmit}
                className="bg-red-600 hover:bg-red-700 text-text-main font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50 transition-colors"
              >
                {submitting ? "Suspending..." : "Confirm Suspension"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
