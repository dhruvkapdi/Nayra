import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/knowledge-base")({
  component: KnowledgeBaseRedirect,
});

function KnowledgeBaseRedirect() {
  const nav = useNavigate();
  useEffect(() => {
    nav({ to: "/" });
  }, [nav]);
  return null;
}
