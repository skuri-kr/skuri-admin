"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { ColorModeButton } from "@/components/ui/color-mode";
import { getAdminSections } from "@/lib/admin/modules";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

function getInitial(value?: string | null) {
  if (!value) {
    return "A";
  }

  return value.trim().charAt(0).toUpperCase();
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { loading, isAdminVerified, authError, signOutUser, memberProfile } =
    useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const sections = getAdminSections();

  useEffect(() => {
    if (!loading && !isAdminVerified) {
      router.replace("/login");
    }
  }, [isAdminVerified, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
          <p className="text-sm text-muted-foreground">
            관리자 권한을 확인하는 중입니다.
          </p>
        </div>
      </div>
    );
  }

  if (!isAdminVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20 px-6">
        <Card className="w-full max-w-lg rounded-3xl">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <ShieldCheck className="size-5" />
            </div>
            <CardTitle>관리자 접근이 필요합니다.</CardTitle>
            <CardDescription>
              {authError ?? "로그인 상태를 다시 확인해주세요."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => router.replace("/login")}>
              로그인 화면으로
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="gap-4 px-3 py-4">
          <div className="flex items-center gap-3 rounded-2xl border border-sidebar-border bg-sidebar-accent/40 px-3 py-3">
            <Avatar className="size-10 rounded-2xl">
              <AvatarImage src={memberProfile?.photoUrl ?? undefined} />
              <AvatarFallback className="rounded-2xl">
                {getInitial(memberProfile?.nickname ?? memberProfile?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/60">
                Skuri Admin
              </p>
              <p className="truncate text-sm font-medium">
                {memberProfile?.nickname || memberProfile?.email}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/70">
                운영 콘솔
              </p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {sections.map((section) => (
            <SidebarGroup key={section.title}>
              <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.modules.map((module) => {
                    const active = pathname === module.path;

                    return (
                      <SidebarMenuItem key={module.key}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={module.navigationLabel}
                        >
                          <Link href={module.path}>
                            <span>{module.navigationLabel}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="gap-2 border-t border-sidebar-border px-3 py-4">
          <div className="flex items-center gap-2">
            <ColorModeButton />
            <Button
              variant="outline"
              className="flex-1 justify-start gap-2 group-data-[collapsible=icon]:hidden"
              onClick={() => void signOutUser()}
            >
              <LogOut className="size-4" />
              로그아웃
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--muted))_0,_transparent_45%)]">
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b bg-background/90 px-5 py-4 backdrop-blur md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="hidden h-5 md:block" />
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Spring Admin API Console
              </p>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>관리자 작업 공간</BreadcrumbPage>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="truncate text-muted-foreground">
                      {pathname}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden rounded-full px-3 py-1 md:inline-flex">
              Authenticated Admin
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="md:hidden"
              onClick={() => void signOutUser()}
            >
              로그아웃
            </Button>
          </div>
        </header>

        <div className="px-5 py-6 md:px-8 md:py-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
