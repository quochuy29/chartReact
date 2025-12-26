import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SensorOption {
  id: string;
  display_label: string;
  level: 1 | 2 | 3 | 4;
  line: string;
  facility: string;
  utility: string;
  equipment: string;
  disabled?: boolean;
}

interface GraphConfig {
  graph_no: number;
  sensor: {
    line: string;
    utility: string;
    equipment_type: string;
    equipment_name: string;
    display_label: string;
  } | null;
  graph_type: string;
}

interface HomeSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const GRAPH_TYPES = ["使用量推移", "コスト", "CO₂排出量", "台当たりコスト", "台当たりCO₂排出量"];

const GRAPH_COUNT = 4;

export function HomeSettingsModal({ open, onOpenChange, onSaved }: HomeSettingsModalProps) {
  const [sensorOptions, setSensorOptions] = useState<SensorOption[]>([]);
  const [graphConfigs, setGraphConfigs] = useState<GraphConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openSensorDropdowns, setOpenSensorDropdowns] = useState<Record<number, boolean>>({});

  // Initialize empty graph configs
  const initializeEmptyConfigs = (): GraphConfig[] => {
    return Array.from({ length: GRAPH_COUNT }, (_, i) => ({
      graph_no: i + 1,
      sensor: null,
      graph_type: "",
    }));
  };

  // Load sensor options from database
  const loadSensorOptions = async () => {
    const { data: linesData } = await supabase.from("lines").select("*").eq("is_visible", true).order("display_order");

    if (!linesData) return;

    const options: SensorOption[] = [];

    for (const line of linesData) {
      // Level 1: ライン (disabled header)
      options.push({
        id: `L1-${line.id}`,
        display_label: line.name,
        level: 1,
        line: line.name,
        facility: "",
        utility: "",
        equipment: "",
        disabled: true,
      });

      const { data: facilitiesData } = await supabase
        .from("facilities")
        .select("*")
        .eq("line_id", line.id)
        .eq("is_visible", true)
        .order("display_order");

      for (const facility of facilitiesData || []) {
        // Level 2: ライン > ユーティリティ
        options.push({
          id: `L2-${line.id}-${facility.id}`,
          display_label: `${line.name} > ${facility.name}`,
          level: 2,
          line: line.name,
          facility: facility.name,
          utility: "",
          equipment: "",
        });

        const { data: utilitiesData } = await supabase
          .from("utilities")
          .select("*")
          .eq("facility_id", facility.id)
          .eq("is_visible", true)
          .order("display_order");

        for (const utility of utilitiesData || []) {
          // Level 3: ライン > ユーティリティ > 設備種
          options.push({
            id: `L3-${line.id}-${facility.id}-${utility.id}`,
            display_label: `${line.name} > ${facility.name} > ${utility.name}`,
            level: 3,
            line: line.name,
            facility: facility.name,
            utility: utility.name,
            equipment: "",
          });

          const { data: equipmentData } = await supabase
            .from("equipment")
            .select("*")
            .eq("utility_id", utility.id)
            .eq("is_visible", true)
            .order("display_order");

          for (const equip of equipmentData || []) {
            // Level 4: ライン > ユーティリティ > 設備種 > 設備名
            options.push({
              id: `L4-${line.id}-${facility.id}-${utility.id}-${equip.id}`,
              display_label: `${line.name} > ${facility.name} > ${utility.name} > ${equip.name}`,
              level: 4,
              line: line.name,
              facility: facility.name,
              utility: utility.name,
              equipment: equip.name,
            });
          }
        }
      }
    }

    setSensorOptions(options);
  };

  // Load existing settings
  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("m_settings").select("*").eq("setting_type", "graph_home").single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading settings:", error);
        setGraphConfigs(initializeEmptyConfigs());
        return;
      }

      if (data && data.setting_value) {
        const settingValue = data.setting_value as { graphs?: GraphConfig[] };
        if (settingValue.graphs && Array.isArray(settingValue.graphs)) {
          // Merge saved configs with empty configs to ensure all 4 graphs exist
          const savedConfigs = settingValue.graphs;
          const mergedConfigs = initializeEmptyConfigs().map((emptyConfig) => {
            const savedConfig = savedConfigs.find((sc) => sc.graph_no === emptyConfig.graph_no);
            return savedConfig || emptyConfig;
          });
          setGraphConfigs(mergedConfigs);
        } else {
          setGraphConfigs(initializeEmptyConfigs());
        }
      } else {
        setGraphConfigs(initializeEmptyConfigs());
      }
    } catch (err) {
      console.error("Error loading settings:", err);
      setGraphConfigs(initializeEmptyConfigs());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadSensorOptions();
      loadSettings();
    }
  }, [open]);

  const handleSensorChange = (graphNo: number, sensorId: string) => {
    const sensor = sensorOptions.find((s) => s.id === sensorId);
    if (!sensor) return;

    setGraphConfigs((prev) =>
      prev.map((config) =>
        config.graph_no === graphNo
          ? {
              ...config,
              sensor: {
                line: sensor.line,
                utility: sensor.facility,
                equipment_type: sensor.utility,
                equipment_name: sensor.equipment,
                display_label: sensor.display_label,
              },
            }
          : config,
      ),
    );
    setOpenSensorDropdowns((prev) => ({ ...prev, [graphNo]: false }));
  };

  const handleGraphTypeChange = (graphNo: number, graphType: string) => {
    setGraphConfigs((prev) =>
      prev.map((config) => (config.graph_no === graphNo ? { ...config, graph_type: graphType } : config)),
    );
  };

  const handleSave = async () => {
    // Validate all 4 graphs have both sensor and graph_type
    const incompleteGraphs = graphConfigs.filter((config) => !config.sensor || !config.graph_type);

    if (incompleteGraphs.length > 0) {
      toast.error("4種類すべてのグラフを入力してください。");
      return;
    }

    setSaving(true);
    try {
      const graphsToSave = graphConfigs
        .filter((config) => config.sensor || config.graph_type)
        .map((config) => ({
          graph_no: config.graph_no,
          sensor: config.sensor
            ? {
                line: config.sensor.line,
                utility: config.sensor.utility,
                equipment_type: config.sensor.equipment_type,
                equipment_name: config.sensor.equipment_name,
                display_label: config.sensor.display_label,
              }
            : null,
          graph_type: config.graph_type,
        }));

      const settingValue = { graphs: graphsToSave };

      // Check if record exists
      const { data: existing } = await supabase
        .from("m_settings")
        .select("id")
        .eq("setting_type", "graph_home")
        .single();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from("m_settings")
          .update({
            setting_value: JSON.parse(JSON.stringify(settingValue)),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase.from("m_settings").insert([
          {
            setting_type: "graph_home",
            setting_value: JSON.parse(JSON.stringify(settingValue)),
          },
        ]);

        if (error) throw error;
      }

      toast.success("設定を保存しました");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error("Error saving settings:", err);
      toast.error("設定の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const getSensorIdFromConfig = (sensor: GraphConfig["sensor"]): string => {
    if (!sensor) return "";
    const found = sensorOptions.find((s) => s.display_label === sensor.display_label);
    return found?.id || "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">ホーム画面の表示設定</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">読み込み中...</div>
        ) : (
          <div className="space-y-6">
            {/* Header row */}
            <div className="grid grid-cols-[120px_1fr_200px] gap-4 px-4 py-2 bg-muted/50 rounded-lg font-medium">
              <div></div>
              <div className="text-center">設備</div>
              <div className="text-center">グラフの種類</div>
            </div>

            {/* Graph config rows */}
            {graphConfigs.map((config) => {
              const positionLabels: Record<number, string> = {
                1: "左上",
                2: "右上",
                3: "左下",
                4: "右下",
              };
              return (
                <div key={config.graph_no} className="grid grid-cols-[120px_1fr_200px] gap-4 items-center px-4">
                  <div className="font-medium whitespace-nowrap">
                    Graph#{config.graph_no}: {positionLabels[config.graph_no]}
                  </div>

                  {/* Sensor Type - Searchable Dropdown */}
                  <Popover
                    open={openSensorDropdowns[config.graph_no]}
                    onOpenChange={(open) =>
                      setOpenSensorDropdowns((prev) => ({
                        ...prev,
                        [config.graph_no]: open,
                      }))
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openSensorDropdowns[config.graph_no]}
                        className="w-full justify-between font-normal h-10"
                      >
                        <span className="truncate">{config.sensor?.display_label || "設備を選択する"}</span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="設備を検索..." />
                        <CommandList>
                          <CommandEmpty>設備が見つかりません</CommandEmpty>
                          <CommandGroup>
                            {sensorOptions.map((sensor) => (
                              <CommandItem
                                key={sensor.id}
                                value={sensor.display_label}
                                onSelect={() => {
                                  if (!sensor.disabled) {
                                    handleSensorChange(config.graph_no, sensor.id);
                                  }
                                }}
                                disabled={sensor.disabled}
                                className={cn(
                                  "flex items-center gap-2",
                                  sensor.level === 1 && "bg-muted/70 cursor-not-allowed opacity-70 font-semibold",
                                )}
                              >
                                {sensor.level !== 1 && (
                                  <Check
                                    className={cn(
                                      "h-4 w-4 shrink-0",
                                      getSensorIdFromConfig(config.sensor) === sensor.id ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                )}
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "shrink-0 text-xs font-medium px-1.5 py-0",
                                    sensor.level === 1 && "bg-gray-200 text-gray-600 border-gray-400",
                                    sensor.level === 2 && "bg-blue-100 text-blue-700 border-blue-300",
                                    sensor.level === 3 && "bg-amber-100 text-amber-700 border-amber-300",
                                    sensor.level === 4 && "bg-green-100 text-green-700 border-green-300",
                                  )}
                                >
                                  L{sensor.level}
                                </Badge>
                                <span className="truncate">{sensor.display_label}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Graph Type Dropdown */}
                  <Select
                    value={config.graph_type}
                    onValueChange={(value) => handleGraphTypeChange(config.graph_no, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="グラフの種類を選択する" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRAPH_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}

            {/* Action buttons */}
            <div className="flex justify-center gap-4 pt-4">
              <Button onClick={handleSave} disabled={saving} className="px-8 bg-sky-500 hover:bg-sky-600">
                {saving ? "保存中..." : "保存"}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="px-8 border-sky-500 text-sky-600 hover:bg-sky-50"
              >
                キャンセル
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
