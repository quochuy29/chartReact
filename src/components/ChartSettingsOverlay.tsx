import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type TabMode = "period" | "comparison" | "shop";
export type PeriodType = "day" | "week" | "month" | "year";
export type DisplayType = "cost" | "co2" | "cost_per_unit" | "co2_per_unit";

export interface ChartSettings {
  tabMode: TabMode;
  periodType: PeriodType;
  displayUnit: string;
  showTarget: boolean;
  date: Date;
  compareDate?: Date;
  shopDisplayType: DisplayType;
  axisSettings: {
    yLeftMin: string;
    yLeftMax: string;
    yLeftStepSize: string;
    yRightMin: string;
    yRightMax: string;
    yRightStepSize: string;
  };
}

interface ChartSettingsOverlayProps {
  graphNo: number;
  settings?: ChartSettings;
  onSettingsChange?: (settings: ChartSettings) => void;
}

const defaultSettings: ChartSettings = {
  tabMode: "period",
  periodType: "day",
  displayUnit: "kwh",
  showTarget: true,
  date: new Date(),
  compareDate: undefined,
  shopDisplayType: "cost",
  axisSettings: {
    yLeftMin: "0",
    yLeftMax: "",
    yLeftStepSize: "",
    yRightMin: "0",
    yRightMax: "",
    yRightStepSize: "",
  },
};

export const defaultChartSettings: ChartSettings = { ...defaultSettings };

export function ChartSettingsOverlay({ graphNo, settings: initialSettings, onSettingsChange }: ChartSettingsOverlayProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<ChartSettings>(initialSettings || defaultSettings);

  // Sync with external settings
  useState(() => {
    if (initialSettings) {
      setLocalSettings(initialSettings);
    }
  });

  const handleSave = () => {
    onSettingsChange?.(localSettings);
    setDialogOpen(false);
  };

  return (
    <>
      {/* Settings Button - appears on parent hover via group */}
      <div
        className={cn(
          "absolute top-2 right-2 z-10 transition-opacity duration-200",
          "opacity-0 group-hover:opacity-100"
        )}
      >
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background shadow-md"
          onClick={(e) => {
            e.stopPropagation();
            setDialogOpen(true);
          }}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Settings Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>グラフ #{graphNo} 設定</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Period Type Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">期間タイプ</Label>
              <Tabs
                value={localSettings.periodType}
                onValueChange={(v) => setLocalSettings((prev) => ({ ...prev, periodType: v as PeriodType }))}
              >
                <TabsList>
                  <TabsTrigger value="day">日</TabsTrigger>
                  <TabsTrigger value="week">週</TabsTrigger>
                  <TabsTrigger value="month">月</TabsTrigger>
                  <TabsTrigger value="year">年</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Date Picker */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">日付</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2 flex-1">
                      <CalendarIcon className="h-4 w-4" />
                      {localSettings.periodType === "year"
                        ? format(localSettings.date, "yyyy年")
                        : localSettings.periodType === "month"
                          ? format(localSettings.date, "yyyy/MM")
                          : format(localSettings.date, "yyyy/MM/dd")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={localSettings.date}
                      onSelect={(date) => date && setLocalSettings((prev) => ({ ...prev, date }))}
                      locale={ja}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2 flex-1">
                      <CalendarIcon className="h-4 w-4" />
                      {localSettings.compareDate ? (
                        localSettings.periodType === "year" ? (
                          format(localSettings.compareDate, "yyyy年")
                        ) : localSettings.periodType === "month" ? (
                          format(localSettings.compareDate, "yyyy/MM")
                        ) : (
                          format(localSettings.compareDate, "yyyy/MM/dd")
                        )
                      ) : (
                        <span className="text-muted-foreground">比較期間</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <div className="p-2 border-b flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocalSettings((prev) => ({ ...prev, compareDate: undefined }))}
                        disabled={!localSettings.compareDate}
                      >
                        クリア
                      </Button>
                    </div>
                    <Calendar
                      mode="single"
                      selected={localSettings.compareDate}
                      onSelect={(date) => setLocalSettings((prev) => ({ ...prev, compareDate: date }))}
                      locale={ja}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Show Target */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showTarget"
                checked={localSettings.showTarget}
                onCheckedChange={(checked) =>
                  setLocalSettings((prev) => ({ ...prev, showTarget: checked as boolean }))
                }
              />
              <Label htmlFor="showTarget">目標値を表示</Label>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleSave} className="bg-sky-500 hover:bg-sky-600">
                適用
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
