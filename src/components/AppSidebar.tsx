import { useState, useEffect } from "react";
import { NavLink as RouterNavLink, useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  ChevronRight,
  LayoutDashboard,
  Settings as SettingsIcon,
  Users,
  Database,
  BarChart3,
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

interface Equipment {
  id: string;
  name: string;
  display_order: number;
}

interface Utility {
  id: string;
  name: string;
  display_order: number;
  equipment: Equipment[];
}

interface Facility {
  id: string;
  name: string;
  display_order: number;
  utilities: Utility[];
}

interface Line {
  id: string;
  name: string;
  display_order: number;
  facilities: Facility[];
}

const mainMenuItems = [
  { title: "ホーム", url: "/home", icon: LayoutDashboard },
  { title: "ユーザー管理", url: "/user-management", icon: Users },
  { title: "データ保守", url: "/data-maintenance", icon: Database },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const [lines, setLines] = useState<Line[]>([]);
  const [openLines, setOpenLines] = useState<Record<string, boolean>>({});
  const [openFacilities, setOpenFacilities] = useState<Record<string, boolean>>({});
  const [openUtilities, setOpenUtilities] = useState<Record<string, boolean>>({});

  // Get current selected item from URL
  const searchParams = new URLSearchParams(location.search);
  const selectedFacility = searchParams.get("facility");
  const selectedUtility = searchParams.get("utility");
  const selectedEquipment = searchParams.get("equipment");

  const isSelected = (type: 'facility' | 'utility' | 'equipment', id: string) => {
    if (type === 'facility') return selectedFacility === id;
    if (type === 'utility') return selectedUtility === id;
    return selectedEquipment === id;
  };

  useEffect(() => {
    loadLines();
  }, []);

  const loadLines = async () => {
    const { data: linesData } = await supabase
      .from("lines")
      .select("*")
      .eq("is_visible", true)
      .order("display_order");

    if (!linesData) return;

    const linesWithChildren = await Promise.all(
      linesData.map(async (line) => {
        const { data: facilitiesData } = await supabase
          .from("facilities")
          .select("*")
          .eq("line_id", line.id)
          .eq("is_visible", true)
          .order("display_order");

        const facilitiesWithUtilities = await Promise.all(
          (facilitiesData || []).map(async (facility) => {
            const { data: utilitiesData } = await supabase
              .from("utilities")
              .select("*")
              .eq("facility_id", facility.id)
              .eq("is_visible", true)
              .order("display_order");

            const utilitiesWithEquipment = await Promise.all(
              (utilitiesData || []).map(async (utility) => {
                const { data: equipmentData } = await supabase
                  .from("equipment")
                  .select("*")
                  .eq("utility_id", utility.id)
                  .eq("is_visible", true)
                  .order("display_order");

                return {
                  ...utility,
                  equipment: equipmentData || [],
                };
              })
            );

            return {
              ...facility,
              utilities: utilitiesWithEquipment,
            };
          })
        );

        return {
          ...line,
          facilities: facilitiesWithUtilities,
        };
      })
    );

    setLines(linesWithChildren);
  };

  const toggleLine = (id: string) => {
    setOpenLines((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleFacility = (id: string) => {
    setOpenFacilities((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleUtility = (id: string) => {
    setOpenUtilities((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNavigate = (type: 'facility' | 'utility' | 'equipment', id: string) => {
    navigate(`/dashboard?${type}=${id}`);
  };

  return (
    <Sidebar collapsible="icon" className={open ? "w-64" : "w-14"}>
      <SidebarContent className="overflow-x-hidden">
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

        {lines.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              グラフ表示
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {lines.map((line) => (
                  <Collapsible
                    key={line.id}
                    open={openLines[line.id]}
                    onOpenChange={() => toggleLine(line.id)}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="whitespace-nowrap overflow-hidden">
                          {open && <span className="truncate">{line.name}</span>}
                          {open && (
                            <ChevronRight
                              className={`ml-auto h-4 w-4 transition-transform ${
                                openLines[line.id] ? "rotate-90" : ""
                              }`}
                            />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="ml-2 pl-2 border-l border-sidebar-border">
                          {line.facilities.map((facility) => (
                            <Collapsible
                              key={facility.id}
                              open={openFacilities[facility.id]}
                              onOpenChange={() => toggleFacility(facility.id)}
                            >
                              <SidebarMenuSubItem>
                                <div className="flex items-center">
                                  <SidebarMenuSubButton 
                                    className={`flex-1 whitespace-nowrap overflow-hidden px-1 cursor-pointer hover:bg-sidebar-accent ${
                                      isSelected('facility', facility.id) ? 'text-primary font-medium' : ''
                                    }`}
                                    onClick={() => handleNavigate('facility', facility.id)}
                                  >
                                    <span className="truncate text-left">{facility.name}</span>
                                  </SidebarMenuSubButton>
                                  <CollapsibleTrigger asChild>
                                    <button className="p-1 hover:bg-sidebar-accent rounded">
                                      <ChevronRight
                                        className={`h-3 w-3 shrink-0 transition-transform ${
                                          openFacilities[facility.id] ? "rotate-90" : ""
                                        }`}
                                      />
                                    </button>
                                  </CollapsibleTrigger>
                                </div>
                                <CollapsibleContent>
                                  <SidebarMenuSub className="ml-2 pl-2 border-l border-sidebar-border">
                                    {facility.utilities.map((utility) => (
                                      <Collapsible
                                        key={utility.id}
                                        open={openUtilities[utility.id]}
                                        onOpenChange={() => toggleUtility(utility.id)}
                                      >
                                        <SidebarMenuSubItem>
                                          <div className="flex items-center">
                                            <SidebarMenuSubButton 
                                              className={`flex-1 whitespace-nowrap overflow-hidden px-1 cursor-pointer hover:bg-sidebar-accent ${
                                                isSelected('utility', utility.id) ? 'text-primary font-medium' : ''
                                              }`}
                                              onClick={() => handleNavigate('utility', utility.id)}
                                            >
                                              <span className="truncate text-left">{utility.name}</span>
                                            </SidebarMenuSubButton>
                                            {utility.equipment.length > 0 && (
                                              <CollapsibleTrigger asChild>
                                                <button className="p-1 hover:bg-sidebar-accent rounded">
                                                  <ChevronRight
                                                    className={`h-3 w-3 shrink-0 transition-transform ${
                                                      openUtilities[utility.id] ? "rotate-90" : ""
                                                    }`}
                                                  />
                                                </button>
                                              </CollapsibleTrigger>
                                            )}
                                          </div>
                                          {utility.equipment.length > 0 && (
                                            <CollapsibleContent>
                                              <SidebarMenuSub className="ml-2 pl-2 border-l border-sidebar-border">
                                                {utility.equipment.map((equip) => (
                                                  <SidebarMenuSubItem key={equip.id}>
                                                    <SidebarMenuSubButton
                                                      className={`px-1 whitespace-nowrap overflow-hidden cursor-pointer hover:bg-sidebar-accent ${
                                                        isSelected('equipment', equip.id) ? 'text-primary font-medium' : ''
                                                      }`}
                                                      onClick={() => handleNavigate('equipment', equip.id)}
                                                    >
                                                      <span className="truncate text-left w-full">{equip.name}</span>
                                                    </SidebarMenuSubButton>
                                                  </SidebarMenuSubItem>
                                                ))}
                                              </SidebarMenuSub>
                                            </CollapsibleContent>
                                          )}
                                        </SidebarMenuSubItem>
                                      </Collapsible>
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
