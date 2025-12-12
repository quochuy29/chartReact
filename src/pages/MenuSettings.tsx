import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Eye, EyeOff, ChevronRight, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TreeNode {
  id: string;
  name: string;
  type: "line" | "facility" | "utility" | "equipment";
  isVisible: boolean;
  children?: TreeNode[];
}

const MenuSettings = () => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadTreeData();
  }, []);

  const loadTreeData = async () => {
    const { data: lines } = await supabase
      .from("lines")
      .select("*")
      .order("display_order");

    if (!lines) return;

    const tree: TreeNode[] = await Promise.all(
      lines.map(async (line) => {
        const { data: facilities } = await supabase
          .from("facilities")
          .select("*")
          .eq("line_id", line.id)
          .order("display_order");

        const facilitiesWithChildren = await Promise.all(
          (facilities || []).map(async (facility) => {
            const { data: utilities } = await supabase
              .from("utilities")
              .select("*")
              .eq("facility_id", facility.id)
              .order("display_order");

            const utilitiesWithEquipment = await Promise.all(
              (utilities || []).map(async (utility) => {
                const { data: equipment } = await supabase
                  .from("equipment")
                  .select("*")
                  .eq("utility_id", utility.id)
                  .order("display_order");

                return {
                  id: utility.id,
                  name: utility.name,
                  type: "utility" as const,
                  isVisible: utility.is_visible,
                  children: (equipment || []).map((equip) => ({
                    id: equip.id,
                    name: equip.name,
                    type: "equipment" as const,
                    isVisible: equip.is_visible,
                  })),
                };
              })
            );

            return {
              id: facility.id,
              name: facility.name,
              type: "facility" as const,
              isVisible: facility.is_visible,
              children: utilitiesWithEquipment,
            };
          })
        );

        return {
          id: line.id,
          name: line.name,
          type: "line" as const,
          isVisible: line.is_visible,
          children: facilitiesWithChildren,
        };
      })
    );

    setTreeData(tree);
  };

  const getTableName = (type: TreeNode["type"]) => {
    switch (type) {
      case "line": return "lines";
      case "facility": return "facilities";
      case "utility": return "utilities";
      case "equipment": return "equipment";
    }
  };

  const toggleVisibility = async (node: TreeNode) => {
    const table = getTableName(node.type);

    const { error } = await supabase
      .from(table)
      .update({ is_visible: !node.isVisible })
      .eq("id", node.id);

    if (error) {
      toast.error("更新エラー", { description: error.message });
    } else {
      loadTreeData();
      toast.success("更新しました");
    }
  };

  const startEdit = (node: TreeNode) => {
    setEditingId(node.id);
    setEditName(node.name);
  };

  const saveEdit = async (node: TreeNode) => {
    if (!editName.trim()) return;

    const table = getTableName(node.type);

    const { error } = await supabase
      .from(table)
      .update({ name: editName })
      .eq("id", node.id);

    if (error) {
      toast.error("更新エラー", { description: error.message });
    } else {
      setEditingId(null);
      loadTreeData();
      toast.success("更新しました");
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const allIds: Record<string, boolean> = {};
    const collectIds = (nodes: TreeNode[]) => {
      nodes.forEach((node) => {
        allIds[node.id] = true;
        if (node.children) collectIds(node.children);
      });
    };
    collectIds(treeData);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes({});
  };

  const getTypeLabel = (type: TreeNode["type"]) => {
    switch (type) {
      case "line": return "ライン";
      case "facility": return "設備";
      case "utility": return "ユーティリティ";
      case "equipment": return "機器";
    }
  };

  const renderTree = (nodes: TreeNode[], depth = 0) => {
    return (
      <div className={depth > 0 ? "ml-6 border-l border-border pl-2" : ""}>
        {nodes.map((node) => {
          const hasChildren = node.children && node.children.length > 0;
          const isExpanded = expandedNodes[node.id];

          return (
            <Collapsible
              key={node.id}
              open={isExpanded}
              onOpenChange={() => hasChildren && toggleExpand(node.id)}
            >
              <div className="my-1">
                <div className="flex items-center gap-2 p-2 rounded hover:bg-muted group">
                  {hasChildren ? (
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  ) : (
                    <div className="w-6" />
                  )}
                  
                  <Checkbox
                    checked={node.isVisible}
                    onCheckedChange={() => toggleVisibility(node)}
                  />
                  
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {getTypeLabel(node.type)}
                  </span>
                  
                  {editingId === node.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 h-8"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(node);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <Button size="sm" onClick={() => saveEdit(node)}>
                        OK
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                      >
                        キャンセル
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 font-medium">{node.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => startEdit(node)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        編集
                      </Button>
                      <span className={`text-xs ${node.isVisible ? "text-green-600" : "text-muted-foreground"}`}>
                        {node.isVisible ? (
                          <span className="flex items-center">
                            <Eye className="h-3 w-3 mr-1" />
                            表示
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <EyeOff className="h-3 w-3 mr-1" />
                            非表示
                          </span>
                        )}
                      </span>
                    </>
                  )}
                </div>
                {hasChildren && (
                  <CollapsibleContent>
                    {renderTree(node.children!, depth + 1)}
                  </CollapsibleContent>
                )}
              </div>
            </Collapsible>
          );
        })}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">メニュー構成設定</h1>
          <p className="text-muted-foreground mt-1">
            ライン → 設備 → ユーティリティ → 機器
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>現在のツリー構成</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button variant="outline" onClick={expandAll}>
                  全て展開
                </Button>
                <Button variant="outline" onClick={collapseAll}>
                  全て折りたたむ
                </Button>
              </div>
              {treeData.length > 0 ? (
                renderTree(treeData)
              ) : (
                <p className="text-muted-foreground py-8 text-center">
                  データがありません
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MenuSettings;
