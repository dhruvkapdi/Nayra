import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsRedirect,
});

function AnalyticsRedirect() {
  const nav = useNavigate();
  useEffect(() => {
    nav({ to: "/" });
  }, [nav]);
  return null;
}
