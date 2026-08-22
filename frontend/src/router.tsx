import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./components/layout/RootLayout";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { RequireAuth } from "./components/auth/RequireAuth";
import { RequireSuperAdmin } from "./components/auth/RequireSuperAdmin";
import { AdminLayout } from "./components/admin/AdminLayout";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { PostsPage } from "./pages/admin/PostsPage";
import { SubmissionsPage } from "./pages/admin/SubmissionsPage";
import { DonationsPage } from "./pages/admin/DonationsPage";
import { SettingsPage } from "./pages/admin/SettingsPage";
import { BranchesPage } from "./pages/admin/BranchesPage";
import { AccountsPage } from "./pages/admin/AccountsPage";
import { AuditPage } from "./pages/admin/AuditPage";

const BranchHubPage = lazy(() =>
  import("./pages/BranchHubPage").then((m) => ({ default: m.BranchHubPage })),
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "antennes/:branchId",
        element: (
          <Suspense fallback={null}>
            <BranchHubPage />
          </Suspense>
        ),
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  { path: "/login", element: <LoginPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  {
    path: "/admin",
    element: <RequireAuth />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "posts", element: <PostsPage /> },
          { path: "submissions", element: <SubmissionsPage /> },
          { path: "donations", element: <DonationsPage /> },
          { path: "settings", element: <SettingsPage /> },
          {
            element: <RequireSuperAdmin />,
            children: [
              { path: "branches", element: <BranchesPage /> },
              { path: "accounts", element: <AccountsPage /> },
              { path: "audit", element: <AuditPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
