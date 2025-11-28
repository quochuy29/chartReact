import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ControlPanel } from "@/components/dashboard/ControlPanel";
import { ChartArea } from "@/components/dashboard/ChartArea";
import { DataTableDialog } from "@/components/dashboard/DataTableDialog";
import { YAxisSettingsDialog } from "@/components/dashboard/YAxisSettingsDialog";
import { Button } from "@/components/ui/button";
import { Table2, Settings2 } from "lucide-react";

export type ViewMode = "daily" | "period" | "comparison" | "shop-comparison";
export type UnitType = "energy" | "cost" | "co2";

export interface SelectedNode {
  id: string;
  name: string;
  type: "factory" | "line" | "shop" | "equipment";
}

export const EnergyDashboard = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [unitType, setUnitType] = useState<UnitType>("energy");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showTarget, setShowTarget] = useState(true);
  const [selectedNode, setSelectedNode] = useState<SelectedNode>({
    id: "factory-1",
    name: "Factory 1",
    type: "factory",
  });
  const [dataTableOpen, setDataTableOpen] = useState(false);
  const [yAxisSettingsOpen, setYAxisSettingsOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar selectedNode={selectedNode} onSelectNode={setSelectedNode} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <ControlPanel
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          unitType={unitType}
          onUnitTypeChange={setUnitType}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          showTarget={showTarget}
          onShowTargetChange={setShowTarget}
        />

        <div className="flex-1 p-6 overflow-auto">
          <ChartArea
            viewMode={viewMode}
            unitType={unitType}
            selectedDate={selectedDate}
            showTarget={showTarget}
            selectedNode={selectedNode}
          />
        </div>

        <div className="absolute bottom-6 right-6 flex gap-3">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setDataTableOpen(true)}
            className="shadow-lg hover:shadow-xl transition-all"
          >
            <Table2 className="h-5 w-5 mr-2" />
            Data Table
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setYAxisSettingsOpen(true)}
            className="shadow-lg hover:shadow-xl transition-all"
          >
            <Settings2 className="h-5 w-5 mr-2" />
            Y-Axis Settings
          </Button>
        </div>
      </div>

      <DataTableDialog
        open={dataTableOpen}
        onOpenChange={setDataTableOpen}
        viewMode={viewMode}
        unitType={unitType}
        selectedDate={selectedDate}
        selectedNode={selectedNode}
      />

      <YAxisSettingsDialog
        open={yAxisSettingsOpen}
        onOpenChange={setYAxisSettingsOpen}
      />
    </div>
  );
};
