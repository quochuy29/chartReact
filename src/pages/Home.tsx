import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, eachWeekOfInterval, startOfYear, endOfYear, eachMonthOfInterval, subYears, eachYearOfInterval } from "date-fns";
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
import { ChartSettingsOverlay, ChartSettings, defaultChartSettings } from "@/components/ChartSettingsOverlay";
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
  const [chartSettingsMap, setChartSettingsMap] = useState<Record<number, ChartSettings>>({});

  const loadSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("m_settings").select("*").eq("setting_type", "graph_home").single();

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

  // Generate chart data based on settings
  const generateChartData = useCallback((settings: ChartSettings) => {
    const baseDate = settings.date;
    let dataPoints: { label: string; fullDate: string; actual: number; target: number; compare?: number }[] = [];

    // Generate data based on display unit
    const getMultiplier = () => {
      switch (settings.displayUnit) {
        case "cost": return 100;
        case "co2": return 0.5;
        default: return 1;
      }
    };

    const multiplier = getMultiplier();

    switch (settings.periodType) {
      case "day": {
        // 24 hours (05:00 - 29:00 format like Dashboard)
        const hours = Array.from({ length: 25 }, (_, i) => i + 5);
        dataPoints = hours.map(hour => {
          const baseValue = Math.random() * 200 + 100;
          return {
            label: `${String(hour).padStart(2, "0")}:00`,
            fullDate: `${format(baseDate, "yyyy/MM/dd")} ${String(hour < 24 ? hour : hour - 24).padStart(2, "0")}:00`,
            actual: Math.round(baseValue * multiplier * 100) / 100,
            target: settings.showTarget ? Math.round(150 * multiplier * 100) / 100 : 0,
            compare: settings.compareDate ? Math.round((baseValue * 0.9) * multiplier * 100) / 100 : undefined,
          };
        });
        break;
      }
      case "week": {
        // 7 days * 24 hours like Dashboard
        const weekStart = startOfWeek(baseDate, { locale: ja });
        const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(baseDate, { locale: ja }) });
        days.forEach((day) => {
          for (let hour = 0; hour < 24; hour++) {
            const baseValue = Math.random() * 200 + 100;
            dataPoints.push({
              label: `${format(day, "MM/dd")} ${String(hour).padStart(2, "0")}:00`,
              fullDate: `${format(day, "yyyy/MM/dd")} ${String(hour).padStart(2, "0")}:00`,
              actual: Math.round(baseValue * multiplier * 100) / 100,
              target: settings.showTarget ? Math.round(150 * multiplier * 100) / 100 : 0,
              compare: settings.compareDate ? Math.round((baseValue * 0.9) * multiplier * 100) / 100 : undefined,
            });
          }
        });
        break;
      }
      case "month": {
        // Days in month (1-31)
        const start = startOfMonth(baseDate);
        const end = endOfMonth(baseDate);
        const days = eachDayOfInterval({ start, end });
        dataPoints = days.map((day, i) => {
          const baseValue = Math.random() * 200 + 100;
          return {
            label: `${i + 1}`,
            fullDate: `${format(baseDate, "yyyy/MM")}/${String(i + 1).padStart(2, "0")}`,
            actual: Math.round(baseValue * multiplier * 100) / 100,
            target: settings.showTarget ? Math.round(150 * multiplier * 100) / 100 : 0,
            compare: settings.compareDate ? Math.round((baseValue * 0.9) * multiplier * 100) / 100 : undefined,
          };
        });
        break;
      }
      case "year": {
        // 12 months
        dataPoints = Array.from({ length: 12 }, (_, i) => {
          const baseValue = Math.random() * 200 + 100;
          return {
            label: `${i + 1}月`,
            fullDate: `${baseDate.getFullYear()}年${i + 1}月`,
            actual: Math.round(baseValue * multiplier * 100) / 100,
            target: settings.showTarget ? Math.round(150 * multiplier * 100) / 100 : 0,
            compare: settings.compareDate ? Math.round((baseValue * 0.9) * multiplier * 100) / 100 : undefined,
          };
        });
        break;
      }
    }

    return dataPoints;
  }, []);

  const handleChartSettingsChange = useCallback((graphNo: number, newSettings: ChartSettings) => {
    setChartSettingsMap(prev => ({
      ...prev,
      [graphNo]: newSettings,
    }));
  }, []);

  const getChartSettings = useCallback((graphNo: number): ChartSettings => {
    return chartSettingsMap[graphNo] || defaultChartSettings;
  }, [chartSettingsMap]);

  const handleSettingsSaved = () => {
    loadSettings();
  };

  const chartColors = {
    actual: "hsl(var(--chart-1))",
    target: "hsl(var(--chart-2))",
    bar: "hsl(var(--chart-3))",
  };

  const getUnitLabel = (displayUnit: string) => {
    return {
      kwh: "kWh/m³",
      cost: "円",
      co2: "kg",
    }[displayUnit] || "kWh/m³";
  };

  const getGraphTypeLabel = (graphType: string) => {
    return {
      "使用量推移": "使用量推移",
      "設備比較": "設備比較",
      "コスト": "コスト",
      "CO2排出量": "コスト",
      "台当たりコスト": "コスト",
      "台当たりCO2排出量": "コスト",
    }[graphType] || graphType;
  };

  const getChartTitle = (config: GraphConfig) => {
    if (!config.sensor) return `Graph #${config.graph_no}`;
    return `${config.sensor.display_label} - ${getGraphTypeLabel(config.graph_type)}`;
  };

  // Graph types that should display as BarChart
  const barChartTypes = ["台当たりコスト", "台当たりCO2排出量"];

  const renderChart = (graphNo: number, graphType?: string) => {
    const settings = getChartSettings(graphNo);
    const data = generateChartData(settings);
    const isBarChart = graphType ? barChartTypes.includes(graphType) : settings.tabMode === "comparison";
    const unitLabel = getUnitLabel(settings.displayUnit);

    // Get axis domain from settings
    const getYDomain = () => {
      const min = settings.axisSettings.yLeftMin ? parseFloat(settings.axisSettings.yLeftMin) : 0;
      const max = settings.axisSettings.yLeftMax ? parseFloat(settings.axisSettings.yLeftMax) : "auto";
      return [min, max] as [number, number | "auto"];
    };

    // Determine X-axis props based on period type (matching Dashboard behavior)
    const getXAxisProps = () => {
      const baseProps = {
        dataKey: "label",
        tick: { fontSize: 11 },
        tickLine: false,
        axisLine: { className: "stroke-muted" },
      };

      if (settings.periodType === "week") {
        return {
          ...baseProps,
          angle: -45,
          textAnchor: "end" as const,
          height: 60,
          tick: { fontSize: 10 },
        };
      }

      return baseProps;
    };

    if (isBarChart) {
      return (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis {...getXAxisProps()} />
          <YAxis 
            domain={getYDomain()} 
            tick={{ fontSize: 11 }} 
            tickLine={false} 
            axisLine={{ className: "stroke-muted" }}
            label={{ value: unitLabel, angle: -90, position: "insideLeft", style: { fontSize: 11 } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            labelFormatter={(label, payload) => {
              if (payload?.[0]?.payload?.fullDate) {
                return payload[0].payload.fullDate;
              }
              return label;
            }}
            formatter={(value: number) => value.toFixed(2)}
          />
          <Legend />
          <Bar dataKey="actual" name="実績" fill={chartColors.bar} radius={[4, 4, 0, 0]} />
          {settings.showTarget && (
            <Bar dataKey="target" name="目標" fill={chartColors.target} radius={[4, 4, 0, 0]} />
          )}
          {settings.compareDate && (
            <Bar dataKey="compare" name="比較" fill={chartColors.actual} radius={[4, 4, 0, 0]} />
          )}
        </BarChart>
      );
    }

    return (
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis {...getXAxisProps()} />
        <YAxis 
          domain={getYDomain()} 
          tick={{ fontSize: 11 }} 
          tickLine={false} 
          axisLine={{ className: "stroke-muted" }}
          label={{ value: unitLabel, angle: -90, position: "insideLeft", style: { fontSize: 11 } }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
          labelFormatter={(label, payload) => {
            if (payload?.[0]?.payload?.fullDate) {
              return payload[0].payload.fullDate;
            }
            return label;
          }}
          formatter={(value: number) => value.toFixed(2)}
        />
        <Legend />
        <Line 
          type="linear" 
          dataKey="actual" 
          name="実績" 
          stroke={chartColors.actual} 
          strokeWidth={2}
          dot={{ r: 3, fill: "hsl(var(--background))", stroke: chartColors.actual, strokeWidth: 2 }}
          activeDot={{ r: 5, fill: "hsl(var(--background))", stroke: chartColors.actual, strokeWidth: 2 }}
        />
        {settings.showTarget && (
          <Line
            type="linear"
            dataKey="target"
            name="目標"
            stroke={chartColors.target}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3, fill: "hsl(var(--background))", stroke: chartColors.target, strokeWidth: 2 }}
            activeDot={{ r: 5, fill: "hsl(var(--background))", stroke: chartColors.target, strokeWidth: 2 }}
          />
        )}
        {settings.compareDate && (
          <Line
            type="linear"
            dataKey="compare"
            name="比較"
            stroke="hsl(var(--chart-4))"
            strokeWidth={2}
            dot={{ r: 3, fill: "hsl(var(--background))", stroke: "hsl(var(--chart-4))", strokeWidth: 2 }}
            activeDot={{ r: 5, fill: "hsl(var(--background))", stroke: "hsl(var(--chart-4))", strokeWidth: 2 }}
          />
        )}
      </LineChart>
    );
  };

  // Default graphs when no config exists
  const defaultGraphs = [
    { title: "エネルギー使用量", type: "line", graphType: "使用量推移" },
    { title: "コスト", type: "line", graphType: "コスト" },
    { title: "CO₂排出量", type: "line", graphType: "CO2排出量" },
    { title: "設備別使用量比較", type: "bar", graphType: "設備比較" },
  ];

  const getDefaultGraphTitle = (index: number) => {
    return `${defaultGraphs[index].title} - ${getGraphTypeLabel(defaultGraphs[index].graphType)}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">ホーム</h1>
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
                  <Card key={config.graph_no} className="relative group">
                    <ChartSettingsOverlay 
                      graphNo={config.graph_no} 
                      settings={getChartSettings(config.graph_no)}
                      onSettingsChange={(s) => handleChartSettingsChange(config.graph_no, s)}
                    />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg truncate">{getChartTitle(config)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          {renderChart(config.graph_no, config.graph_type)}
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                ))
            : // Render default graphs
              defaultGraphs.map((graph, index) => (
                <Card key={index} className="relative group">
                  <ChartSettingsOverlay 
                    graphNo={index + 1} 
                    settings={getChartSettings(index + 1)}
                    onSettingsChange={(s) => handleChartSettingsChange(index + 1, s)}
                  />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{getDefaultGraphTitle(index)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        {renderChart(index + 1, graph.type === "bar" ? "台当たりコスト" : undefined)}
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
