import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginPage } from "./features/auth/LoginPage";
import { OverviewPage } from "./features/overview/OverviewPage";
import { CoverageMapPage } from "./features/coverage-map/CoverageMapPage";
import { ReportsPage } from "./features/reports/ReportsPage";
import { RecommendationsPage } from "./features/recommendations/RecommendationsPage";
import { TowersPage } from "./features/towers/TowersPage";
import { ForecastPage } from "./features/forecast/ForecastPage";
import { UsersPage } from "./features/users/UsersPage";

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
      { path: "towers", element: <TowersPage /> },
      { path: "forecast", element: <ForecastPage /> },
      { path: "users", element: <UsersPage /> },
    ],
  },
]);
