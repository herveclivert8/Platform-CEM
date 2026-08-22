import { create } from "zustand";

/** For Super Admin only: which branch's data the back-office is currently scoped to. "all" = every branch. */
interface AdminScopeState {
  selectedBranchId: number | "all";
  setSelectedBranchId: (branchId: number | "all") => void;
}

export const useAdminScopeStore = create<AdminScopeState>((set) => ({
  selectedBranchId: "all",
  setSelectedBranchId: (branchId) => set({ selectedBranchId: branchId }),
}));
