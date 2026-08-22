import { create } from "zustand";

interface DonationUiState {
  isOpen: boolean;
  branchId?: number;
  branchName?: string;
  open: (branchId?: number, branchName?: string) => void;
  close: () => void;
}

export const useDonationUiStore = create<DonationUiState>((set) => ({
  isOpen: false,
  branchId: undefined,
  branchName: undefined,
  open: (branchId, branchName) => set({ isOpen: true, branchId, branchName }),
  close: () => set({ isOpen: false }),
}));
