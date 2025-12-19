import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ja } from "date-fns/locale";
import { Settings } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { DashboardLayout } from "@/components/DashboardLayout";
import { HomeSettingsModal } from "@/components/HomeSettingsModal";
import { supabase } from "@/integrations/supabase/client";

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

const Home = () => {
  const [currentMonth] = useState(new Date());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [graphConfigs, setGraphConfigs] = useState<GraphConfig[]>([]);
  const [graphDataMap, setGraphDataMap] = useState<Record<number, any[]>>({});

  const loadSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("m_settings").select("*").eq("setting_type", 1).single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading settings:", error);
        return;
      }

      if (data && data.setting_value) {
        const settingValue = data.setting_value as { graphs?: GraphConfig[] };
        if (settingValue.graphs && Array.isArray(settingValue.graphs)) {
          setGraphConfigs(settingValue.graphs);
        }
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    generateGraphData();
  }, [currentMonth, graphConfigs]);

  const generateGraphData = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    const newGraphDataMap: Record<number, any[]> = {};

    graphConfigs.forEach((config) => {
      if (!config.sensor || !config.graph_type) return;

      const data = days.map((day) => ({
        day: format(day, "d"),
        actual: Math.round((Math.random() * 200 + 100) * 100) / 100,
        target: 150.0,
      }));

      newGraphDataMap[config.graph_no] = data;
    });

    setGraphDataMap(newGraphDataMap);
  };

  const handleSettingsSaved = () => {
    loadSettings();
  };

  const chartColors = {
    actual: "hsl(var(--chart-1))",
    target: "hsl(var(--chart-2))",
    bar: "hsl(var(--chart-3))",
  };

  const getChartTitle = (config: GraphConfig) => {
    if (!config.sensor) return `Graph #${config.graph_no}`;
    return `${config.sensor.display_label} - ${config.graph_type}`;
  };

  // Graph types that should display as BarChart
  const barChartTypes = ["台当たりコスト", "台当たりCO2排出量"];

  const renderChart = (config: GraphConfig) => {
    const data = graphDataMap[config.graph_no] || [];
    const isBarChart = barChartTypes.includes(config.graph_type);

    if (isBarChart) {
      return (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ className: "stroke-muted" }} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={{ className: "stroke-muted" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(value: number) => value.toFixed(2)}
          />
          <Legend />
          <Bar dataKey="actual" name="実績" fill={chartColors.bar} radius={[4, 4, 0, 0]} />
          <Bar dataKey="target" name="目標" fill={chartColors.target} radius={[4, 4, 0, 0]} />
        </BarChart>
      );
    }

    return (
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ className: "stroke-muted" }} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={{ className: "stroke-muted" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
          formatter={(value: number) => value.toFixed(2)}
        />
        <Legend />
        <Line type="monotone" dataKey="actual" name="実績" stroke={chartColors.actual} strokeWidth={2} dot={false} />
        <Line
          type="monotone"
          dataKey="target"
          name="目標"
          stroke={chartColors.target}
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
        />
      </LineChart>
    );
  };

  // Default graphs when no config exists
  const defaultGraphs = [
    { title: "エネルギー使用量 (kWh/m³)", type: "line" },
    { title: "コスト (円)", type: "line" },
    { title: "CO₂排出量 (kg)", type: "line" },
    { title: "設備別使用量比較", type: "bar" },
  ];

  const generateDefaultData = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    return days.map((day) => ({
      day: format(day, "d"),
      actual: Math.round((Math.random() * 200 + 100) * 100) / 100,
      target: 150.0,
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">ホーム</h1>
            <p className="text-muted-foreground mt-1">{format(currentMonth, "yyyy年MM月", { locale: ja })}のデータ</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} className="h-10 w-10">
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {graphConfigs.length > 0
            ? // Render configured graphs
              graphConfigs
                .filter((config) => config.sensor && config.graph_type)
                .map((config) => (
                  <Card key={config.graph_no}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg truncate">{getChartTitle(config)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          {renderChart(config)}
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                ))
            : // Render default graphs
              defaultGraphs.map((graph, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{graph.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        {graph.type === "bar" ? (
                          <BarChart data={generateDefaultData()}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                              dataKey="day"
                              tick={{ fontSize: 11 }}
                              tickLine={false}
                              axisLine={{ className: "stroke-muted" }}
                            />
                            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={{ className: "stroke-muted" }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--popover))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                              formatter={(value: number) => value.toFixed(2)}
                            />
                            <Legend />
                            <Bar dataKey="actual" name="実績" fill={chartColors.bar} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="target" name="目標" fill={chartColors.target} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        ) : (
                          <LineChart data={generateDefaultData()}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                              dataKey="day"
                              tick={{ fontSize: 11 }}
                              tickLine={false}
                              axisLine={{ className: "stroke-muted" }}
                            />
                            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={{ className: "stroke-muted" }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--popover))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                              formatter={(value: number) => value.toFixed(2)}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="actual"
                              name="実績"
                              stroke={chartColors.actual}
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="target"
                              name="目標"
                              stroke={chartColors.target}
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={false}
                            />
                          </LineChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>
      </div>

      {/* Settings Modal */}
      <HomeSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} onSaved={handleSettingsSaved} />
    </DashboardLayout>
  );
};

export default Home;
