import { useState, useEffect } from "react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Factory,
  ChevronRight,
  LayoutDashboard,
  Calendar,
  Settings as SettingsIcon,
  Users,
  Database,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";

interface Process {
  id: string;
  name: string;
  display_order: number;
}

interface ProductionLine {
  id: string;
  name: string;
  display_order: number;
  processes: Process[];
}

interface FactoryItem {
  id: string;
  name: string;
  display_order: number;
  production_lines: ProductionLine[];
}

const mainMenuItems = [
  { title: "ダッシュボード", url: "/dashboard", icon: LayoutDashboard },
  { title: "生産計画設定", url: "/production-planning", icon: Calendar },
  { title: "ユーザー管理", url: "/user-management", icon: Users },
  { title: "メニュー設定", url: "/menu-settings", icon: SettingsIcon },
  { title: "データ保守", url: "/data-maintenance", icon: Database },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const [factories, setFactories] = useState<FactoryItem[]>([]);
  const [openFactories, setOpenFactories] = useState<Record<string, boolean>>({});
  const [openLines, setOpenLines] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadFactories();
  }, []);

  const loadFactories = async () => {
    const { data: factoriesData } = await supabase
      .from("factories")
      .select("*")
      .eq("is_visible", true)
      .order("display_order");

    if (!factoriesData) return;

    const factoriesWithLines = await Promise.all(
      factoriesData.map(async (factory) => {
        const { data: linesData } = await supabase
          .from("production_lines")
          .select("*")
          .eq("factory_id", factory.id)
          .eq("is_visible", true)
          .order("display_order");

        const linesWithProcesses = await Promise.all(
          (linesData || []).map(async (line) => {
            const { data: processesData } = await supabase
              .from("processes")
              .select("*")
              .eq("line_id", line.id)
              .eq("is_visible", true)
              .order("display_order");

            return {
              ...line,
              processes: processesData || [],
            };
          })
        );

        return {
          ...factory,
          production_lines: linesWithProcesses,
        };
      })
    );

    setFactories(factoriesWithLines);
  };

  const toggleFactory = (id: string) => {
    setOpenFactories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleLine = (id: string) => {
    setOpenLines((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Sidebar collapsible="icon" className={open ? "w-64" : "w-14"}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>メインメニュー</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} activeClassName="bg-sidebar-accent">
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {factories.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>工場</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {factories.map((factory) => (
                  <Collapsible
                    key={factory.id}
                    open={openFactories[factory.id]}
                    onOpenChange={() => toggleFactory(factory.id)}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <Factory className="h-4 w-4" />
                          {open && <span>{factory.name}</span>}
                          {open && (
                            <ChevronRight
                              className={`ml-auto h-4 w-4 transition-transform ${
                                openFactories[factory.id] ? "rotate-90" : ""
                              }`}
                            />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {factory.production_lines.map((line) => (
                            <Collapsible
                              key={line.id}
                              open={openLines[line.id]}
                              onOpenChange={() => toggleLine(line.id)}
                            >
                              <SidebarMenuSubItem>
                                <CollapsibleTrigger asChild>
                                  <SidebarMenuSubButton>
                                    {line.name}
                                    <ChevronRight
                                      className={`ml-auto h-3 w-3 transition-transform ${
                                        openLines[line.id] ? "rotate-90" : ""
                                      }`}
                                    />
                                  </SidebarMenuSubButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <SidebarMenuSub>
                                    {line.processes.map((process) => (
                                      <SidebarMenuSubItem key={process.id}>
                                        <SidebarMenuSubButton
                                          asChild
                                          className="pl-8"
                                        >
                                          <NavLink
                                            to={`/dashboard?process=${process.id}`}
                                            activeClassName="bg-sidebar-accent"
                                          >
                                            {process.name}
                                          </NavLink>
                                        </SidebarMenuSubButton>
                                      </SidebarMenuSubItem>
                                    ))}
                                  </SidebarMenuSub>
                                </CollapsibleContent>
                              </SidebarMenuSubItem>
                            </Collapsible>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
