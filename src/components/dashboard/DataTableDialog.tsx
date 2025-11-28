import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ViewMode, UnitType, SelectedNode } from "@/components/EnergyDashboard";

interface DataTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewMode: ViewMode;
  unitType: UnitType;
  selectedDate: Date;
  selectedNode: SelectedNode;
}

const generateTableData = (viewMode: ViewMode) => {
  if (viewMode === "daily") {
    return Array.from({ length: 25 }, (_, i) => {
      const hour = i + 5 > 24 ? i + 5 - 24 : i + 5;
      return {
        time: `${hour.toString().padStart(2, "0")}:00`,
        value: (150 + Math.random() * 100).toFixed(2),
        target: "180.00",
      };
    });
  }
  return Array.from({ length: 7 }, (_, i) => ({
    time: `Day ${i + 1}`,
    value: (3000 + Math.random() * 1000).toFixed(2),
    target: "3500.00",
  }));
};

export const DataTableDialog = ({
  open,
  onOpenChange,
  viewMode,
  unitType,
  selectedNode,
}: DataTableDialogProps) => {
  const data = generateTableData(viewMode);

  const getUnitLabel = () => {
    switch (unitType) {
      case "energy":
        return "kWh";
      case "cost":
        return "USD";
      case "co2":
        return "kg CO₂";
    }
  };

  const handleExportCSV = () => {
    const headers = ["Time", `Consumption (${getUnitLabel()})`, `Target (${getUnitLabel()})`];
    const csvContent = [
      headers.join(","),
      ...data.map((row) => `${row.time},${row.value},${row.target}`),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `energy-data-${selectedNode.name}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Data Table - {selectedNode.name}</DialogTitle>
          <DialogDescription>
            Detailed numerical data for {viewMode === "daily" ? "daily" : "period"} consumption
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end mb-4">
          <Button onClick={handleExportCSV} variant="default">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <ScrollArea className="h-[500px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Time</TableHead>
                <TableHead className="text-right">Consumption ({getUnitLabel()})</TableHead>
                <TableHead className="text-right">Target ({getUnitLabel()})</TableHead>
                <TableHead className="text-right">Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, idx) => {
                const variance = ((parseFloat(row.value) - parseFloat(row.target)) / parseFloat(row.target) * 100).toFixed(1);
                const isOverTarget = parseFloat(variance) > 0;
                return (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.time}</TableCell>
                    <TableCell className="text-right">{row.value}</TableCell>
                    <TableCell className="text-right">{row.target}</TableCell>
                    <TableCell className={`text-right font-medium ${isOverTarget ? "text-destructive" : "text-success"}`}>
                      {variance}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
