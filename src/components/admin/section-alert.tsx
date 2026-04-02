"use client";

import { AlertCircle } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface SectionAlertProps {
  title: string;
  description: string;
  variant?: "destructive" | "default";
}

export function SectionAlert({
  title,
  description,
  variant = "destructive",
}: SectionAlertProps) {
  return (
    <Alert variant={variant}>
      <AlertCircle className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
