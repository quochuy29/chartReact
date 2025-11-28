import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ViewMode, UnitType } from "@/components/EnergyDashboard";

interface ControlPanelProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  unitType: UnitType;
  onUnitTypeChange: (type: UnitType) => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  showTarget: boolean;
  onShowTargetChange: (show: boolean) => void;
}

export const ControlPanel = ({
  viewMode,
  onViewModeChange,
  unitType,
  onUnitTypeChange,
  selectedDate,
  onDateChange,
  showTarget,
  onShowTargetChange,
}: ControlPanelProps) => {
  return (
    <div className="border-b border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-6">
        {/* View Mode Tabs */}
        <div>
          <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="daily">Daily Report</TabsTrigger>
              <TabsTrigger value="period">Period Report</TabsTrigger>
              <TabsTrigger value="comparison">Comparison</TabsTrigger>
              <TabsTrigger value="shop-comparison">Shop Comparison</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Date Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-64 justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && onDateChange(date)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {/* Unit Type Toggle */}
        <div className="flex gap-2">
          <Button
            variant={unitType === "energy" ? "default" : "outline"}
            onClick={() => onUnitTypeChange("energy")}
            size="sm"
          >
            Energy (kWh)
          </Button>
          <Button
            variant={unitType === "cost" ? "default" : "outline"}
            onClick={() => onUnitTypeChange("cost")}
            size="sm"
          >
            Cost (USD)
          </Button>
          <Button
            variant={unitType === "co2" ? "default" : "outline"}
            onClick={() => onUnitTypeChange("co2")}
            size="sm"
          >
            CO₂ (kg)
          </Button>
        </div>

        {/* Show Target */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-target"
            checked={showTarget}
            onCheckedChange={onShowTargetChange}
          />
          <Label htmlFor="show-target" className="cursor-pointer">
            Show Target Line
          </Label>
        </div>
      </div>
    </div>
  );
};
