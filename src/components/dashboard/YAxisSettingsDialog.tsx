import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface YAxisSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const YAxisSettingsDialog = ({ open, onOpenChange }: YAxisSettingsDialogProps) => {
  const { toast } = useToast();
  const [minValue, setMinValue] = useState("0");
  const [maxValue, setMaxValue] = useState("300");
  const [interval, setInterval] = useState("50");
  const [saveConfig, setSaveConfig] = useState(false);

  const handleApply = () => {
    toast({
      title: "Y-Axis Settings Applied",
      description: `Range: ${minValue} - ${maxValue}, Interval: ${interval}${saveConfig ? " (Saved)" : ""}`,
    });
    onOpenChange(false);
  };

  const handleReset = () => {
    setMinValue("0");
    setMaxValue("300");
    setInterval("50");
    setSaveConfig(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Y-Axis Scale Settings</DialogTitle>
          <DialogDescription>
            Configure the vertical axis range and intervals for better data visualization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="min-value">Minimum Value</Label>
            <Input
              id="min-value"
              type="number"
              value={minValue}
              onChange={(e) => setMinValue(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-value">Maximum Value</Label>
            <Input
              id="max-value"
              type="number"
              value={maxValue}
              onChange={(e) => setMaxValue(e.target.value)}
              placeholder="300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interval">Interval (Step)</Label>
            <Input
              id="interval"
              type="number"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              placeholder="50"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="save-config"
              checked={saveConfig}
              onCheckedChange={(checked) => setSaveConfig(checked as boolean)}
            />
            <Label htmlFor="save-config" className="cursor-pointer">
              Save this configuration for future sessions
            </Label>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <Button onClick={handleApply}>Apply Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
