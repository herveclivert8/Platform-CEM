import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { RootLayout } from "./components/layout/RootLayout";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { MemberSpacePage } from "./pages/MemberSpacePage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { RequireAuth } from "./components/auth/RequireAuth";
import { RequireSuperAdmin } from "./components/auth/RequireSuperAdmin";
import { AdminLayout } from "./components/admin/AdminLayout";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { PostsPage } from "./pages/admin/PostsPage";
import { ProjectsPage } from "./pages/admin/ProjectsPage";
import { ReportsPage } from "./pages/admin/ReportsPage";
import { SubscribersPage } from "./pages/admin/SubscribersPage";
import { SubmissionsPage } from "./pages/admin/SubmissionsPage";
import { DonationsPage } from "./pages/admin/DonationsPage";
import { SettingsPage } from "./pages/admin/SettingsPage";
import { BranchesPage } from "./pages/admin/BranchesPage";
import { BranchEditPage } from "./pages/admin/BranchEditPage";
import { MyBranchPage } from "./pages/admin/MyBranchPage";
import { AccountsPage } from "./pages/admin/AccountsPage";
import { AuditPage } from "./pages/admin/AuditPage";
import { SocialLinksPage } from "./pages/admin/SocialLinksPage";
import { HomePageSettingsPage } from "./pages/admin/HomePageSettingsPage";
import { PaymentInfoPage } from "./pages/admin/PaymentInfoPage";
import { MembersPage } from "./pages/admin/MembersPage";
import { SocialPublishingPage } from "./pages/admin/SocialPublishingPage";
import { PhotoPage } from "./components/layout/PhotoPage";

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
const TransparencyPage = lazy(() =>
  import("./pages/TransparencyPage").then((m) => ({ default: m.TransparencyPage })),
);
const NewsletterStatusPage = lazy(() =>
  import("./pages/NewsletterStatusPage").then((m) => ({ default: m.NewsletterStatusPage })),
);
const AboutPage = lazy(() => import("./pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const ProjectsListPage = lazy(() =>
  import("./pages/ProjectsListPage").then((m) => ({ default: m.ProjectsListPage })),
);
const ProjectDetailPage = lazy(() =>
  import("./pages/ProjectDetailPage").then((m) => ({ default: m.ProjectDetailPage })),
);
const PrivacyPage = lazy(() => import("./pages/PrivacyPage").then((m) => ({ default: m.PrivacyPage })));
const BadgeVerificationPage = lazy(() =>
  import("./pages/BadgeVerificationPage").then((m) => ({ default: m.BadgeVerificationPage })),
);

const lazyPage =(element: React.ReactNode) => <Suspense fallback={null}>{element}</Suspense>;

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
            <PhotoPage>
              <BranchesDirectoryPage />
            </PhotoPage>
          </Suspense>
        ),
      },
      {
        path: "antennes/apercu/:branchId",
        element: (
          <Suspense fallback={null}>
            <PhotoPage>
              <BranchesDirectoryPage />
            </PhotoPage>
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
      { path: "cem-international", element: <Navigate to="/antennes" replace /> },
      { path: "transparence", element: lazyPage(<TransparencyPage />) },
      { path: "qui-sommes-nous", element: lazyPage(<PhotoPage><AboutPage /></PhotoPage>) },
      { path: "newsletter/confirmation", element: lazyPage(<NewsletterStatusPage key="confirm" action="confirm" />) },
      { path: "newsletter/desinscription", element: lazyPage(<NewsletterStatusPage key="unsubscribe" action="unsubscribe" />) },
      { path: "realisations", element: lazyPage(<PhotoPage><ProjectsListPage key="COMPLETED" phase="COMPLETED" /></PhotoPage>) },
      { path: "realisations/:projectId", element: lazyPage(<ProjectDetailPage phase="COMPLETED" />) },
      { path: "projets-en-cours", element: lazyPage(<PhotoPage><ProjectsListPage key="ONGOING" phase="ONGOING" /></PhotoPage>) },
      { path: "projets-en-cours/:projectId", element: lazyPage(<ProjectDetailPage phase="ONGOING" />) },
      { path: "confidentialite", element: lazyPage(<PhotoPage><PrivacyPage /></PhotoPage>) },
      // Opened by scanning a badge QR code
      { path: "verifier/:token", element: lazyPage(<BadgeVerificationPage />) },
      {
        path: "espace-membre",
        element: <RequireAuth area="member" />,
        children: [{ index: true, element: <MemberSpacePage /> }],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  { path: "/login", element: <LoginPage /> },
  { path: "/inscription", element: <RegisterPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/change-password", element: <ChangePasswordPage /> },
  {
    path: "/admin",
    element: <RequireAuth area="admin" />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "posts", element: <PostsPage /> },
          { path: "projects", element: <ProjectsPage /> },
          { path: "reports", element: <ReportsPage /> },
          { path: "submissions", element: <SubmissionsPage /> },
          { path: "donations", element: <DonationsPage /> },
          { path: "members", element: <MembersPage /> },
          { path: "settings", element: <SettingsPage /> },
          { path: "my-branch", element: <MyBranchPage /> },
          {
            element: <RequireSuperAdmin />,
            children: [
              { path: "branches", element: <BranchesPage /> },
              { path: "branches/:branchId", element: <BranchEditPage /> },
              { path: "accounts", element: <AccountsPage /> },
              { path: "audit", element: <AuditPage /> },
              { path: "home-page", element: <HomePageSettingsPage /> },
              { path: "home-hero", element: <Navigate to="/admin/home-page" replace /> },
              { path: "social-links", element: <SocialLinksPage /> },
              { path: "social-publishing", element: <SocialPublishingPage /> },
              { path: "subscribers", element: <SubscribersPage /> },
              { path: "payment-info", element: <PaymentInfoPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
