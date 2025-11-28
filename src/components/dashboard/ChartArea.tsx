import { Card } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { ViewMode, UnitType, SelectedNode } from "@/components/EnergyDashboard";

// Mock data generators
const generateDailyData = () => {
  const data = [];
  for (let hour = 5; hour <= 29; hour++) {
    const displayHour = hour > 24 ? hour - 24 : hour;
    data.push({
      time: `${displayHour.toString().padStart(2, "0")}:00`,
      value: 150 + Math.random() * 100,
      target: 180,
    });
  }
  return data;
};

const generatePeriodData = (viewMode: ViewMode) => {
  if (viewMode === "period") {
    return Array.from({ length: 7 }, (_, i) => ({
      period: `Day ${i + 1}`,
      value: 3000 + Math.random() * 1000,
      target: 3500,
    }));
  }
  return [];
};

const generateShopComparisonData = () => [
  { shop: "Shop A - Welding", value: 4500, target: 4000 },
  { shop: "Shop B - Painting", value: 3200, target: 3500 },
  { shop: "Shop C - Quality", value: 1800, target: 2000 },
  { shop: "Shop D - Cutting", value: 5100, target: 4800 },
];

interface ChartAreaProps {
  viewMode: ViewMode;
  unitType: UnitType;
  selectedDate: Date;
  showTarget: boolean;
  selectedNode: SelectedNode;
}

export const ChartArea = ({ viewMode, unitType, showTarget, selectedNode }: ChartAreaProps) => {
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

  const renderChart = () => {
    if (viewMode === "daily") {
      const data = generateDailyData();
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
            <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" label={{ value: getUnitLabel(), angle: -90, position: "insideLeft" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--chart-primary))"
              strokeWidth={2}
              name="Consumption"
              dot={{ fill: "hsl(var(--chart-primary))", r: 4 }}
              activeDot={{ r: 6 }}
            />
            {showTarget && (
              <Line
                type="monotone"
                dataKey="target"
                stroke="hsl(var(--warning))"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Target"
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (viewMode === "period") {
      const data = generatePeriodData(viewMode);
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
            <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" label={{ value: getUnitLabel(), angle: -90, position: "insideLeft" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Legend />
            <Bar dataKey="value" fill="hsl(var(--chart-primary))" name="Consumption" radius={[8, 8, 0, 0]} />
            {showTarget && (
              <Line
                type="monotone"
                dataKey="target"
                stroke="hsl(var(--warning))"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Target"
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (viewMode === "shop-comparison") {
      const data = generateShopComparisonData();
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" label={{ value: getUnitLabel(), position: "insideBottom" }} />
            <YAxis type="category" dataKey="shop" stroke="hsl(var(--muted-foreground))" width={150} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Legend />
            <Bar dataKey="value" fill="hsl(var(--chart-primary))" name="Actual" radius={[0, 8, 8, 0]} />
            {showTarget && <Bar dataKey="target" fill="hsl(var(--chart-secondary))" name="Target" radius={[0, 8, 8, 0]} />}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (viewMode === "comparison") {
      const data = generateDailyData();
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
            <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" label={{ value: getUnitLabel(), angle: -90, position: "insideLeft" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--chart-primary))"
              strokeWidth={2}
              name="Period 1"
              dot={{ fill: "hsl(var(--chart-primary))", r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="target"
              stroke="hsl(var(--chart-secondary))"
              strokeWidth={2}
              name="Period 2"
              dot={{ fill: "hsl(var(--chart-secondary))", r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  return (
    <Card className="p-6 h-full shadow-md">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-foreground">{selectedNode.name}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {viewMode === "daily" && "Daily energy consumption (05:00 - 29:00)"}
          {viewMode === "period" && "Weekly period report"}
          {viewMode === "comparison" && "Period comparison"}
          {viewMode === "shop-comparison" && "Shop-level comparison"}
        </p>
      </div>
      <div className="h-[calc(100%-80px)]">{renderChart()}</div>
    </Card>
  );
};
