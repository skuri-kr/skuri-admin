"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: string | number;
  description: string;
}

export function MetricCard({
  label,
  value,
  description,
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-muted-foreground">
        {description}
      </CardContent>
    </Card>
  );
}
