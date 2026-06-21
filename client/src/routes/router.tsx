import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { HomePage } from "@/routes/HomePage";
import { LoginPage } from "@/routes/LoginPage";
import { GamesPage } from "@/routes/GamesPage";
import { GameDetailPage } from "@/routes/GameDetailPage";
import { TableDetailPage } from "@/routes/TableDetailPage";
import { ProfilesPage } from "@/routes/ProfilesPage";
import { StatsPage } from "@/routes/StatsPage";
import { AdminPage } from "@/routes/AdminPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "games", element: <GamesPage /> },
      { path: "games/:id", element: <GameDetailPage /> },
      { path: "tables/:id", element: <TableDetailPage /> },
      { path: "profiles", element: <ProfilesPage /> },
      { path: "stats", element: <StatsPage /> },
      { path: "admin", element: <AdminPage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
