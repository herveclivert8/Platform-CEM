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
import { ProjectsPage } from "./pages/admin/ProjectsPage";
import { SubmissionsPage } from "./pages/admin/SubmissionsPage";
import { DonationsPage } from "./pages/admin/DonationsPage";
import { SettingsPage } from "./pages/admin/SettingsPage";
import { BranchesPage } from "./pages/admin/BranchesPage";
import { BranchEditPage } from "./pages/admin/BranchEditPage";
import { MyBranchPage } from "./pages/admin/MyBranchPage";
import { AccountsPage } from "./pages/admin/AccountsPage";
import { AuditPage } from "./pages/admin/AuditPage";
import { SocialLinksPage } from "./pages/admin/SocialLinksPage";

const BranchesDirectoryPage = lazy(() =>
  import("./pages/BranchesDirectoryPage").then((m) => ({ default: m.BranchesDirectoryPage })),
);
const BranchHubPage = lazy(() =>
  import("./pages/BranchHubPage").then((m) => ({ default: m.BranchHubPage })),
);
const BranchPostsPage = lazy(() =>
  import("./pages/BranchPostsPage").then((m) => ({ default: m.BranchPostsPage })),
);
const PostDetailPage = lazy(() =>
  import("./pages/PostDetailPage").then((m) => ({ default: m.PostDetailPage })),
);
const ProjectsListPage = lazy(() =>
  import("./pages/ProjectsListPage").then((m) => ({ default: m.ProjectsListPage })),
);
const ProjectDetailPage = lazy(() =>
  import("./pages/ProjectDetailPage").then((m) => ({ default: m.ProjectDetailPage })),
);

const lazyPage = (element: React.ReactNode) => <Suspense fallback={null}>{element}</Suspense>;

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "antennes",
        element: (
          <Suspense fallback={null}>
            <BranchesDirectoryPage />
          </Suspense>
        ),
      },
      {
        path: "antennes/apercu/:branchId",
        element: (
          <Suspense fallback={null}>
            <BranchesDirectoryPage />
          </Suspense>
        ),
      },
      {
        path: "antennes/:branchId",
        element: (
          <Suspense fallback={null}>
            <BranchHubPage />
          </Suspense>
        ),
      },
      {
        path: "antennes/:branchId/actualites",
        element: (
          <Suspense fallback={null}>
            <BranchPostsPage />
          </Suspense>
        ),
      },
      {
        path: "antennes/:branchId/actualites/:postId",
        element: (
          <Suspense fallback={null}>
            <PostDetailPage />
          </Suspense>
        ),
      },
      // Keyed by phase: both lists share one component, so switching between them must reset its filters.
      { path: "realisations", element: lazyPage(<ProjectsListPage key="COMPLETED" phase="COMPLETED" />) },
      { path: "realisations/:projectId", element: lazyPage(<ProjectDetailPage phase="COMPLETED" />) },
      { path: "projets-en-cours", element: lazyPage(<ProjectsListPage key="ONGOING" phase="ONGOING" />) },
      { path: "projets-en-cours/:projectId", element: lazyPage(<ProjectDetailPage phase="ONGOING" />) },
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
          { path: "projects", element: <ProjectsPage /> },
          { path: "submissions", element: <SubmissionsPage /> },
          { path: "donations", element: <DonationsPage /> },
          { path: "settings", element: <SettingsPage /> },
          { path: "my-branch", element: <MyBranchPage /> },
          {
            element: <RequireSuperAdmin />,
            children: [
              { path: "branches", element: <BranchesPage /> },
              { path: "branches/:branchId", element: <BranchEditPage /> },
              { path: "accounts", element: <AccountsPage /> },
              { path: "audit", element: <AuditPage /> },
              { path: "social-links", element: <SocialLinksPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
