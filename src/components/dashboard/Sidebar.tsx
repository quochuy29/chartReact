import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Factory, TrendingUp, Package, Zap, ChevronRight, ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SelectedNode } from "@/components/EnergyDashboard";

interface TreeNode {
  id: string;
  name: string;
  type: "factory" | "line" | "shop" | "equipment";
  children?: TreeNode[];
}

const mockTreeData: TreeNode[] = [
  {
    id: "factory-1",
    name: "Factory 1 - Main Production",
    type: "factory",
    children: [
      {
        id: "line-1",
        name: "Line 1 - Assembly",
        type: "line",
        children: [
          {
            id: "shop-1",
            name: "Shop A - Welding",
            type: "shop",
            children: [
              { id: "eq-1", name: "Welder Unit 01", type: "equipment" },
              { id: "eq-2", name: "Welder Unit 02", type: "equipment" },
              { id: "eq-3", name: "Transformer T-001", type: "equipment" },
            ],
          },
          {
            id: "shop-2",
            name: "Shop B - Painting",
            type: "shop",
            children: [
              { id: "eq-4", name: "Paint Booth 01", type: "equipment" },
              { id: "eq-5", name: "Paint Booth 02", type: "equipment" },
            ],
          },
        ],
      },
      {
        id: "line-2",
        name: "Line 2 - Finishing",
        type: "line",
        children: [
          {
            id: "shop-3",
            name: "Shop C - Quality Check",
            type: "shop",
            children: [
              { id: "eq-6", name: "Testing Unit 01", type: "equipment" },
              { id: "eq-7", name: "Conveyor Motor M-001", type: "equipment" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "factory-2",
    name: "Factory 2 - Processing",
    type: "factory",
    children: [
      {
        id: "line-3",
        name: "Line 3 - Material Processing",
        type: "line",
        children: [
          {
            id: "shop-4",
            name: "Shop D - Cutting",
            type: "shop",
            children: [
              { id: "eq-8", name: "CNC Machine 01", type: "equipment" },
              { id: "eq-9", name: "CNC Machine 02", type: "equipment" },
            ],
          },
        ],
      },
    ],
  },
];

interface TreeNodeComponentProps {
  node: TreeNode;
  level: number;
  selectedNode: SelectedNode;
  onSelectNode: (node: SelectedNode) => void;
}

const TreeNodeComponent = ({ node, level, selectedNode, onSelectNode }: TreeNodeComponentProps) => {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNode.id === node.id;

  const getIcon = () => {
    switch (node.type) {
      case "factory":
        return <Factory className="h-4 w-4" />;
      case "line":
        return <TrendingUp className="h-4 w-4" />;
      case "shop":
        return <Package className="h-4 w-4" />;
      case "equipment":
        return <Zap className="h-4 w-4" />;
    }
  };

  return (
    <div>
      <div
        className={`
          flex items-center gap-2 px-3 py-2 cursor-pointer transition-all rounded-md
          ${isSelected ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent text-sidebar-foreground"}
        `}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          onSelectNode({ id: node.id, name: node.name, type: node.type });
        }}
      >
        {hasChildren && (
          <span className="flex-shrink-0">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        )}
        {!hasChildren && <span className="w-4" />}
        {getIcon()}
        <span className="text-sm font-medium truncate">{node.name}</span>
      </div>
      {hasChildren && expanded && (
        <div className="mt-1">
          {node.children!.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              selectedNode={selectedNode}
              onSelectNode={onSelectNode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface SidebarProps {
  selectedNode: SelectedNode;
  onSelectNode: (node: SelectedNode) => void;
}

export const Sidebar = ({ selectedNode, onSelectNode }: SidebarProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-sidebar-foreground mb-4">Energy Monitor</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/60" />
          <Input
            placeholder="Search equipment or tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {mockTreeData.map((node) => (
            <TreeNodeComponent
              key={node.id}
              node={node}
              level={0}
              selectedNode={selectedNode}
              onSelectNode={onSelectNode}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
