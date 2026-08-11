import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { CoverageMapPage } from "./features/coverage-map/CoverageMapPage";
import { RecordPage } from "./features/record/RecordPage";
import { SpeedTestPage } from "./features/speed-test/SpeedTestPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <CoverageMapPage /> },
      { path: "record", element: <RecordPage /> },
      { path: "speedtest", element: <SpeedTestPage /> },
    ],
  },
]);
