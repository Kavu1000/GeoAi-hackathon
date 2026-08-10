import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { CoverageMapPage } from "./features/coverage-map/CoverageMapPage";
import { ReportCoveragePage } from "./features/report-coverage/ReportCoveragePage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <CoverageMapPage /> },
      { path: "report", element: <ReportCoveragePage /> },
    ],
  },
]);
