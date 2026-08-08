import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginPage } from "./features/auth/LoginPage";
import { OverviewPage } from "./features/overview/OverviewPage";
import { CoverageMapPage } from "./features/coverage-map/CoverageMapPage";
import { ReportsPage } from "./features/reports/ReportsPage";
import { RecommendationsPage } from "./features/recommendations/RecommendationsPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: "map", element: <CoverageMapPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "recommendations", element: <RecommendationsPage /> },
    ],
  },
]);
