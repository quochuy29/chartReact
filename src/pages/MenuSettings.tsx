import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Eye, EyeOff } from "lucide-react";

interface TreeNode {
  id: string;
  name: string;
  type: "factory" | "line" | "process";
  isVisible: boolean;
  children?: TreeNode[];
}

const MenuSettings = () => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    loadTreeData();
  }, []);

  const loadTreeData = async () => {
    const { data: factories } = await supabase
      .from("factories")
      .select("*")
      .order("display_order");

    if (!factories) return;

    const tree: TreeNode[] = await Promise.all(
      factories.map(async (factory) => {
        const { data: lines } = await supabase
          .from("production_lines")
          .select("*")
          .eq("factory_id", factory.id)
          .order("display_order");

        const linesWithProcesses = await Promise.all(
          (lines || []).map(async (line) => {
            const { data: processes } = await supabase
              .from("processes")
              .select("*")
              .eq("line_id", line.id)
              .order("display_order");

            return {
              id: line.id,
              name: line.name,
              type: "line" as const,
              isVisible: line.is_visible,
              children: (processes || []).map((process) => ({
                id: process.id,
                name: process.name,
                type: "process" as const,
                isVisible: process.is_visible,
              })),
            };
          })
        );

        return {
          id: factory.id,
          name: factory.name,
          type: "factory" as const,
          isVisible: factory.is_visible,
          children: linesWithProcesses,
        };
      })
    );

    setTreeData(tree);
  };

  const toggleVisibility = async (node: TreeNode) => {
    const table =
      node.type === "factory"
        ? "factories"
        : node.type === "line"
        ? "production_lines"
        : "processes";

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

    const table =
      node.type === "factory"
        ? "factories"
        : node.type === "line"
        ? "production_lines"
        : "processes";

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

  const renderTree = (nodes: TreeNode[], depth = 0) => {
    return (
      <div className={depth > 0 ? "ml-8" : ""}>
        {nodes.map((node) => (
          <div key={node.id} className="my-2">
            <div className="flex items-center gap-2 p-2 rounded hover:bg-muted">
              <Checkbox
                checked={node.isVisible}
                onCheckedChange={() => toggleVisibility(node)}
              />
              {editingId === node.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1"
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
                  <span className="flex-1">{node.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit(node)}
                  >
                    <Pencil className="h-4 w-4" />
                    編集
                  </Button>
                  <Button size="sm" variant="ghost">
                    {node.isVisible ? (
                      <>
                        <Eye className="h-4 w-4 mr-1" />
                        表示
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4 mr-1" />
                        非表示
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
            {node.children && renderTree(node.children, depth + 1)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">メニュー構成設定</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>現在のツリー構成:</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button variant="outline">全て展開</Button>
                <Button variant="outline">全て折りたたむ</Button>
              </div>
              {renderTree(treeData)}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MenuSettings;
