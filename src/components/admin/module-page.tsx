import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminModule } from "@/lib/admin/modules";

const statusMap = {
  ready: { label: "API Ready", variant: "default" },
  partial: { label: "Partial", variant: "secondary" },
  placeholder: { label: "Placeholder", variant: "outline" },
} as const;

export function AdminModulePage({ module }: { module: AdminModule }) {
  const status = statusMap[module.status];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Badge variant={status.variant} className="rounded-full px-3 py-1">
          {status.label}
        </Badge>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{module.title}</h1>
          <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
            {module.summary}
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>현재 바로 연결 가능한 API</CardTitle>
            <CardDescription>
              현재 백엔드 계약만으로 바로 붙일 수 있는 항목입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {module.availableApis.length ? (
              <ul className="space-y-2 pl-5 text-sm">
                {module.availableApis.map((api) => (
                  <li key={api} className="list-disc font-mono">
                    {api}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                아직 연결 가능한 API가 없습니다.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>추가로 필요한 API</CardTitle>
            <CardDescription>
              follow-up 백엔드 계약이 필요한 항목입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {module.gapApis.length ? (
              <ul className="space-y-2 pl-5 text-sm">
                {module.gapApis.map((api) => (
                  <li key={api} className="list-disc font-mono">
                    {api}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                현재 문서 기준으로 추가 백엔드 API 없이 진행 가능합니다.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
