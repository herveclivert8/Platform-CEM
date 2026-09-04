import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useBranches } from "../hooks/useBranches";
import { Skeleton } from "../components/ui/Skeleton";
import { BranchDirectoryCard } from "../components/directory/BranchDirectoryCard";
import { BranchPreviewPanel } from "../components/directory/BranchPreviewPanel";
import { BranchSwitcherList } from "../components/directory/BranchSwitcherList";

export function BranchesDirectoryPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const selectedId = branchId ? Number(branchId) : undefined;

  if (selectedId !== undefined) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          to="/antennes"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à toutes les antennes
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          <BranchPreviewPanel branchId={selectedId} />
          <BranchSwitcherList currentBranchId={selectedId} />
        </div>
      </div>
    );
  }

  return <BranchDirectoryGrid />;
}

function BranchDirectoryGrid() {
  const { data, isLoading } = useBranches();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        Nos antennes
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Découvrez les antennes du CEM et leurs équipes sur le terrain.
      </p>

      {isLoading ? (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <p className="mt-10 text-sm text-slate-400">Aucune antenne pour le moment.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((branch) => (
            <BranchDirectoryCard key={branch.id} branch={branch} />
          ))}
        </div>
      )}
    </div>
  );
}
