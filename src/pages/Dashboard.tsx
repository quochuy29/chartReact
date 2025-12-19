import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Settings, Download } from "lucide-react";
import {
  format,
  subDays,
  subWeeks,
  subMonths,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
} from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  ReferenceLine,
  ComposedChart,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";

type TabMode = "period" | "comparison" | "shop";
type PeriodType = "day" | "week" | "month" | "year";

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const facilityId = searchParams.get("facility");
  const utilityId = searchParams.get("utility");
  const equipmentId = searchParams.get("equipment");

  // Determine current selection type and ID
  const selectionType = facilityId ? "facility" : utilityId ? "utility" : equipmentId ? "equipment" : null;
  const selectionId = facilityId || utilityId || equipmentId;

  // Tab mode state
  const [tabMode, setTabMode] = useState<TabMode>("period");
  const [periodType, setPeriodType] = useState<PeriodType>("day");

  const [date, setDate] = useState<Date>(new Date());
  const [compareDate, setCompareDate] = useState<Date | undefined>(undefined);
  const [displayUnit, setDisplayUnit] = useState("kwh");
  const [showTarget, setShowTarget] = useState(true);
  const [energyData, setEnergyData] = useState<any[]>([]);
  const [processName, setProcessName] = useState("全工程");
  const [axisDialogOpen, setAxisDialogOpen] = useState(false);
  const [dataTableDialogOpen, setDataTableDialogOpen] = useState(false);

  // Comparison mode states (設備比較)
  const [comparisonDate, setComparisonDate] = useState<Date>(new Date());
  const [comparisonPeriodType, setComparisonPeriodType] = useState<PeriodType>("day");
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [comparisonTableData, setComparisonTableData] = useState<any[]>([]);

  // Shop comparison states (コスト/CO2)
  const [shopDate, setShopDate] = useState<Date>(new Date());
  const [shopCompareDate, setShopCompareDate] = useState<Date | undefined>(undefined);
  const [shopPeriodType, setShopPeriodType] = useState<PeriodType>("month");
  const [shopDisplayType, setShopDisplayType] = useState<"cost" | "co2" | "cost_per_unit" | "co2_per_unit">("cost");
  const [availableProcesses, setAvailableProcesses] = useState<{ id: string; name: string }[]>([]);
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);
  const [shopComparisonData, setShopComparisonData] = useState<any[]>([]);
  const [productionPlanData, setProductionPlanData] = useState<any[]>([]);
  const [shopTableData, setShopTableData] = useState<any[]>([]);
  const [shopChildItems, setShopChildItems] = useState<{ id: string; name: string }[]>([]);

  // Available equipment for comparison (level 4)
  const [availableEquipment, setAvailableEquipment] = useState<{ id: string; name: string }[]>([]);

  const [axisSettings, setAxisSettings] = useState({
    yLeftMin: "0",
    yLeftMax: "",
    yLeftStepSize: "",
    yRightMin: "0",
    yRightMax: "",
    yRightStepSize: "",
    saveSettings: false,
  });

  // Generate detailed table data
  const tableData = energyData.map((item, index) => ({
    timeRange: `${item.time} - ${String((parseInt(item.time) + 1) % 24).padStart(2, "0")}:00`,
    value: Math.round(item.actual * 1000),
    target: Math.round(item.target * 1000),
  }));

  const totalValue = tableData.reduce((sum, item) => sum + item.value, 0);
  const totalTarget = tableData.reduce((sum, item) => sum + item.target, 0);

  const exportCSV = () => {
    const headers = ["時間", "値（kWh）", "目標"];
    const rows = tableData.map((item) => [item.timeRange, item.value, item.target]);
    rows.push(["合計", totalValue, totalTarget]);
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `energy_data_${format(date, "yyyy-MM-dd")}.csv`;
    link.click();
  };

  useEffect(() => {
    loadEnergyData();
    loadAvailableProcesses();
    if (selectionId) {
      loadSelectionName();
    }
  }, [date, compareDate, selectionId, selectionType, tabMode, periodType]);

  useEffect(() => {
    if (tabMode === "comparison" && utilityId) {
      loadEquipmentData();
    }
  }, [comparisonDate, comparisonPeriodType, tabMode, utilityId]);

  useEffect(() => {
    if (tabMode === "comparison" && availableEquipment.length > 0) {
      generateComparisonData();
    }
  }, [availableEquipment, comparisonDate, comparisonPeriodType]);

  useEffect(() => {
    if (tabMode === "shop" && (facilityId || utilityId || equipmentId)) {
      loadShopChildItems();
      generateShopComparisonData();
      loadProductionPlanData();
    }
  }, [tabMode, shopDate, shopCompareDate, shopPeriodType, shopDisplayType, facilityId, utilityId, equipmentId]);

  useEffect(() => {
    if (tabMode === "shop" && shopChildItems.length >= 0) {
      generateShopTableData();
    }
  }, [shopChildItems, shopDate, shopCompareDate, shopPeriodType]);

  const loadShopChildItems = async () => {
    if (facilityId) {
      // Facility selected: load utilities as children
      const { data } = await supabase
        .from("utilities")
        .select("id, name")
        .eq("facility_id", facilityId)
        .eq("is_visible", true)
        .order("display_order");
      if (data) setShopChildItems(data);
    } else if (utilityId) {
      // Utility selected: load equipment as children
      const { data } = await supabase
        .from("equipment")
        .select("id, name")
        .eq("utility_id", utilityId)
        .eq("is_visible", true)
        .order("display_order");
      if (data) setShopChildItems(data);
    } else if (equipmentId) {
      // Equipment selected: no children, use single item
      setShopChildItems([]);
    } else {
      setShopChildItems([]);
    }
  };

  const generateShopTableData = () => {
    let tableData: any[] = [];

    if (shopPeriodType === "day") {
      // 24 hours
      const hours = Array.from({ length: 24 }, (_, i) => i);
      tableData = hours.map((hour) => {
        const row: any = {
          datetime: `${format(shopDate, "yyyy-MM-dd")} ${String(hour).padStart(2, "0")}:00`,
        };
        if (shopChildItems.length > 0) {
          shopChildItems.forEach((item) => {
            row[item.name] = Math.random() * 100 + 50;
          });
          if (shopCompareDate) {
            shopChildItems.forEach((item) => {
              row[`${item.name}_compare`] = Math.random() * 100 + 40;
            });
          }
        } else {
          row.value = Math.random() * 100 + 50;
          if (shopCompareDate) {
            row.compareValue = Math.random() * 100 + 40;
          }
        }
        return row;
      });
    } else if (shopPeriodType === "week") {
      const weekStart = startOfWeek(shopDate, { locale: ja });
      const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(shopDate, { locale: ja }) });
      days.forEach((day) => {
        for (let hour = 0; hour < 24; hour++) {
          const row: any = {
            datetime: `${format(day, "yyyy-MM-dd")} ${String(hour).padStart(2, "0")}:00`,
          };
          if (shopChildItems.length > 0) {
            shopChildItems.forEach((item) => {
              row[item.name] = Math.random() * 100 + 50;
            });
            if (shopCompareDate) {
              shopChildItems.forEach((item) => {
                row[`${item.name}_compare`] = Math.random() * 100 + 40;
              });
            }
          } else {
            row.value = Math.random() * 100 + 50;
            if (shopCompareDate) {
              row.compareValue = Math.random() * 100 + 40;
            }
          }
          tableData.push(row);
        }
      });
    } else if (shopPeriodType === "month") {
      const daysInMonth = endOfMonth(shopDate).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const row: any = {
          datetime: `${format(shopDate, "yyyy-MM")}-${String(day).padStart(2, "0")} 00:00`,
        };
        if (shopChildItems.length > 0) {
          shopChildItems.forEach((item) => {
            row[item.name] = Math.random() * 200 + 100;
          });
          if (shopCompareDate) {
            shopChildItems.forEach((item) => {
              row[`${item.name}_compare`] = Math.random() * 200 + 80;
            });
          }
        } else {
          row.value = Math.random() * 200 + 100;
          if (shopCompareDate) {
            row.compareValue = Math.random() * 200 + 80;
          }
        }
        tableData.push(row);
      }
    } else {
      // year - 12 months
      for (let month = 1; month <= 12; month++) {
        const row: any = {
          datetime: `${shopDate.getFullYear()}-${String(month).padStart(2, "0")}-01 00:00`,
        };
        if (shopChildItems.length > 0) {
          shopChildItems.forEach((item) => {
            row[item.name] = Math.random() * 500 + 300;
          });
          if (shopCompareDate) {
            shopChildItems.forEach((item) => {
              row[`${item.name}_compare`] = Math.random() * 500 + 250;
            });
          }
        } else {
          row.value = Math.random() * 500 + 300;
          if (shopCompareDate) {
            row.compareValue = Math.random() * 500 + 250;
          }
        }
        tableData.push(row);
      }
    }
    setShopTableData(tableData);
  };

  const loadAvailableProcesses = async () => {
    const { data } = await supabase.from("processes").select("id, name").eq("is_visible", true).order("display_order");
    if (data) setAvailableProcesses(data);
  };

  const loadSelectionName = async () => {
    if (!selectionId || !selectionType) {
      setProcessName("全工程");
      return;
    }

    try {
      let pathParts: string[] = [];

      if (selectionType === "equipment") {
        // Equipment -> Utility -> Facility -> Line
        const { data: equip } = await supabase
          .from("equipment")
          .select("name, utility_id")
          .eq("id", selectionId)
          .maybeSingle();

        if (equip) {
          const { data: utility } = await supabase
            .from("utilities")
            .select("name, facility_id")
            .eq("id", equip.utility_id)
            .maybeSingle();

          if (utility) {
            const { data: facility } = await supabase
              .from("facilities")
              .select("name, line_id")
              .eq("id", utility.facility_id)
              .maybeSingle();

            if (facility) {
              const { data: line } = await supabase
                .from("lines")
                .select("name")
                .eq("id", facility.line_id)
                .maybeSingle();

              if (line) pathParts.push(line.name);
              pathParts.push(facility.name);
            }
            pathParts.push(utility.name);
          }
          pathParts.push(equip.name);
        }
      } else if (selectionType === "utility") {
        // Utility -> Facility -> Line
        const { data: utility } = await supabase
          .from("utilities")
          .select("name, facility_id")
          .eq("id", selectionId)
          .maybeSingle();

        if (utility) {
          const { data: facility } = await supabase
            .from("facilities")
            .select("name, line_id")
            .eq("id", utility.facility_id)
            .maybeSingle();

          if (facility) {
            const { data: line } = await supabase.from("lines").select("name").eq("id", facility.line_id).maybeSingle();

            if (line) pathParts.push(line.name);
            pathParts.push(facility.name);
          }
          pathParts.push(utility.name);
        }
      } else if (selectionType === "facility") {
        // Facility -> Line
        const { data: facility } = await supabase
          .from("facilities")
          .select("name, line_id")
          .eq("id", selectionId)
          .maybeSingle();

        if (facility) {
          const { data: line } = await supabase.from("lines").select("name").eq("id", facility.line_id).maybeSingle();

          if (line) pathParts.push(line.name);
          pathParts.push(facility.name);
        }
      }

      setProcessName(pathParts.length > 0 ? pathParts.join("_") : "全工程");
    } catch (error) {
      console.error("Error loading selection path:", error);
      setProcessName("全工程");
    }
  };

  const loadEnergyData = async () => {
    if (tabMode === "period") {
      if (periodType === "day") {
        // Generate 24h data (05:00 - 29:00)
        const hours = Array.from({ length: 25 }, (_, i) => i + 5);
        const sampleData = hours.map((hour) => ({
          time: hour < 24 ? `${String(hour).padStart(2, "0")}:00` : `${String(hour).padStart(2, "0")}:00`,
          fullDate: `${format(date, "yyyy/MM/dd")} ${hour < 24 ? String(hour).padStart(2, "0") : String(hour).padStart(2, "0")}:00`,
          actual: Math.random() * 50 + 30,
          compareActual: compareDate ? Math.random() * 50 + 25 : undefined,
          target: 45,
        }));
        setEnergyData(sampleData);
      } else if (periodType === "week") {
        // Generate 7 days * 24 hours = 168 data points
        const weekStart = startOfWeek(date, { locale: ja });
        const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(date, { locale: ja }) });
        const sampleData: any[] = [];
        days.forEach((day) => {
          for (let hour = 0; hour < 24; hour++) {
            sampleData.push({
              time: `${format(day, "MM/dd")} ${String(hour).padStart(2, "0")}:00`,
              fullDate: `${format(day, "yyyy/MM/dd")} ${String(hour).padStart(2, "0")}:00`,
              actual: Math.random() * 50 + 30,
              compareActual: compareDate ? Math.random() * 50 + 25 : undefined,
              target: 45,
            });
          }
        });
        setEnergyData(sampleData);
      } else if (periodType === "month") {
        // Generate 31 data points (31 days)
        const sampleData = Array.from({ length: 31 }, (_, i) => ({
          time: `${i + 1}`,
          fullDate: `${format(date, "yyyy/MM")}/${String(i + 1).padStart(2, "0")}`,
          actual: Math.random() * 200 + 100,
          compareActual: compareDate ? Math.random() * 200 + 80 : undefined,
          target: 150,
        }));
        setEnergyData(sampleData);
      } else {
        // Generate 12 data points (12 months)
        const sampleData = Array.from({ length: 12 }, (_, i) => ({
          time: `${i + 1}月`,
          fullDate: `${date.getFullYear()}年${i + 1}月`,
          actual: Math.random() * 500 + 300,
          compareActual: compareDate ? Math.random() * 500 + 250 : undefined,
          target: 450,
        }));
        setEnergyData(sampleData);
      }
    }
  };

  const loadEquipmentData = async () => {
    if (!utilityId) {
      setAvailableEquipment([]);
      return;
    }
    const { data } = await supabase
      .from("equipment")
      .select("id, name")
      .eq("utility_id", utilityId)
      .eq("is_visible", true)
      .order("display_order");
    if (data) setAvailableEquipment(data);
  };

  const generateComparisonData = () => {
    // Generate equipment comparison data for bar chart
    if (availableEquipment.length === 0) {
      setComparisonData([]);
      setComparisonTableData([]);
      return;
    }

    const data = availableEquipment.map((equipment) => ({
      name: equipment.name,
      value: Math.random() * 100 + 50,
    }));
    setComparisonData(data);

    // Generate time-series data for table
    let tableData: any[] = [];
    if (comparisonPeriodType === "day") {
      // 24 hours
      const hours = Array.from({ length: 24 }, (_, i) => i);
      tableData = hours.map((hour) => {
        const row: any = {
          datetime: `${format(comparisonDate, "yyyy-MM-dd")} ${String(hour).padStart(2, "0")}:00`,
        };
        availableEquipment.forEach((eq) => {
          row[eq.name] = Math.random() * 100 + 50;
        });
        return row;
      });
    } else if (comparisonPeriodType === "week") {
      // 7 days * 24 hours
      const weekStart = startOfWeek(comparisonDate, { locale: ja });
      const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(comparisonDate, { locale: ja }) });
      days.forEach((day) => {
        for (let hour = 0; hour < 24; hour++) {
          const row: any = {
            datetime: `${format(day, "yyyy-MM-dd")} ${String(hour).padStart(2, "0")}:00`,
          };
          availableEquipment.forEach((eq) => {
            row[eq.name] = Math.random() * 100 + 50;
          });
          tableData.push(row);
        }
      });
    } else if (comparisonPeriodType === "month") {
      // 31 days
      const daysInMonth = endOfMonth(comparisonDate).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const row: any = {
          datetime: `${format(comparisonDate, "yyyy-MM")}-${String(day).padStart(2, "0")} 00:00`,
        };
        availableEquipment.forEach((eq) => {
          row[eq.name] = Math.random() * 200 + 100;
        });
        tableData.push(row);
      }
    } else {
      // year - 12 months
      for (let month = 1; month <= 12; month++) {
        const row: any = {
          datetime: `${comparisonDate.getFullYear()}-${String(month).padStart(2, "0")}-01 00:00`,
        };
        availableEquipment.forEach((eq) => {
          row[eq.name] = Math.random() * 500 + 300;
        });
        tableData.push(row);
      }
    }
    setComparisonTableData(tableData);
  };

  const generateShopComparisonData = () => {
    // Generate time-series data based on shopPeriodType
    // For Facility/Utility: stacked bar with multiple equipment/utilities
    // For Equipment: line chart
    let data: any[] = [];

    if (shopPeriodType === "month") {
      // Generate 31 days data
      data = Array.from({ length: 31 }, (_, i) => {
        const baseData: any = {
          time: `${i + 1}日`,
        };

        if (facilityId || utilityId) {
          // Stacked bar: multiple categories
          baseData.category1 = Math.random() * 50 + 30;
          baseData.category2 = Math.random() * 40 + 20;
          baseData.category3 = Math.random() * 30 + 15;
        } else {
          // Line chart for equipment
          baseData.value = Math.random() * 200 + 100;
          baseData.compareValue = shopCompareDate ? Math.random() * 200 + 80 : undefined;
        }

        return baseData;
      });
    } else if (shopPeriodType === "year") {
      // Generate 12 months data (fiscal year: April to March)
      const fiscalMonths = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
      data = fiscalMonths.map((month) => {
        const baseData: any = {
          time: `${month}月`,
        };

        if (facilityId || utilityId) {
          // Stacked bar: multiple categories
          baseData.category1 = Math.random() * 500 + 300;
          baseData.category2 = Math.random() * 400 + 200;
          baseData.category3 = Math.random() * 300 + 150;
        } else {
          // Line chart for equipment
          baseData.value = Math.random() * 1000 + 500;
          baseData.compareValue = shopCompareDate ? Math.random() * 1000 + 400 : undefined;
        }

        return baseData;
      });
    } else if (shopPeriodType === "day") {
      // Generate 24h data
      const hours = Array.from({ length: 24 }, (_, i) => i);
      data = hours.map((hour) => {
        const baseData: any = {
          time: `${String(hour).padStart(2, "0")}:00`,
        };

        if (facilityId || utilityId) {
          baseData.category1 = Math.random() * 30 + 20;
          baseData.category2 = Math.random() * 25 + 15;
          baseData.category3 = Math.random() * 20 + 10;
        } else {
          baseData.value = Math.random() * 100 + 50;
          baseData.compareValue = shopCompareDate ? Math.random() * 100 + 40 : undefined;
        }

        return baseData;
      });
    } else {
      // week
      const weekStart = startOfWeek(shopDate, { locale: ja });
      const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(shopDate, { locale: ja }) });
      data = days.map((day) => {
        const baseData: any = {
          time: format(day, "MM/dd"),
        };

        if (facilityId || utilityId) {
          baseData.category1 = Math.random() * 150 + 100;
          baseData.category2 = Math.random() * 120 + 80;
          baseData.category3 = Math.random() * 100 + 60;
        } else {
          baseData.value = Math.random() * 500 + 200;
          baseData.compareValue = shopCompareDate ? Math.random() * 500 + 150 : undefined;
        }

        return baseData;
      });
    }
    setShopComparisonData(data);
  };

  const loadProductionPlanData = async () => {
    // Get fiscal year from shopDate
    const currentYear = shopDate.getFullYear();
    const currentMonth = shopDate.getMonth() + 1;
    const fiscalYear = currentMonth >= 4 ? currentYear : currentYear - 1;

    // Try to load from database first
    const { data } = await supabase
      .from("production_plans")
      .select("month, planned_units")
      .eq("fiscal_year", fiscalYear)
      .order("month");

    if (data && data.length > 0) {
      // Map to fiscal year order (April = 4 to March = 3)
      const fiscalMonths = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
      const planData = fiscalMonths.map((month) => {
        const plan = data.find((p) => p.month === month);
        return {
          month: `${month}月`,
          planned_units: plan?.planned_units || Math.floor(Math.random() * 500 + 200),
        };
      });
      setProductionPlanData(planData);
    } else {
      // Generate sample data
      const fiscalMonths = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
      const sampleData = fiscalMonths.map((month) => ({
        month: `${month}月`,
        planned_units: Math.floor(Math.random() * 500 + 200),
      }));
      setProductionPlanData(sampleData);
    }
  };

  const toggleProcessSelection = (processId: string) => {
    setSelectedProcesses((prev) =>
      prev.includes(processId) ? prev.filter((id) => id !== processId) : prev.length < 6 ? [...prev, processId] : prev,
    );
  };

  const getDisplayValue = (value: number) => {
    if (displayUnit === "kwh") return value;
    if (displayUnit === "cost") return value * 12;
    return value * 0.5;
  };

  const getUnitLabel = () => {
    if (tabMode === "shop") {
      if (shopDisplayType === "cost" || shopDisplayType === "cost_per_unit") return "円";
      return "kg(CO2)";
    }
    if (displayUnit === "kwh") return "kWh/m3";
    if (displayUnit === "cost") return "コスト (円)";
    return "CO2 (kg)";
  };

  const chartColors = ["hsl(var(--chart-1))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  const getChartTitle = () => {
    switch (tabMode) {
      case "period":
        if (periodType === "day") {
          if (compareDate) {
            return `期報 (日): ${format(date, "yyyy/MM/dd")} vs ${format(compareDate, "yyyy/MM/dd")}`;
          }
          return `期報 (日): ${format(date, "yyyy/MM/dd")} (05:00 - 29:00)`;
        }
        if (periodType === "week") return `期報 (週別)`;
        if (periodType === "month") return `期報 (月別)`;
        return `期報 (年別)`;
      case "comparison":
        return `設備比較 (${format(comparisonDate, "yyyy/MM/dd")})`;
      case "shop":
        if (shopDisplayType === "cost") return "コスト";
        if (shopDisplayType === "co2") return "CO2排出量";
        if (shopDisplayType === "cost_per_unit") return "台当たりコスト";
        return "台当たりCO2排出量";
    }
  };

  const getXAxisLabel = () => {
    if (tabMode === "comparison") return "時間";
    if (tabMode === "period") {
      if (periodType === "day") return "時間";
      if (periodType === "week") return "週";
      if (periodType === "month") return "月";
      return "年";
    }
    return "";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">グラフ表示</h1>
            <p className="text-muted-foreground mt-1">{processName}</p>
          </div>
        </div>

        {/* Control Panel */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Tab Mode */}
              <Tabs value={tabMode} onValueChange={(v) => setTabMode(v as TabMode)} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="period">使用量推移</TabsTrigger>
                  <TabsTrigger value="comparison">設備比較</TabsTrigger>
                  <TabsTrigger value="shop">コスト/CO2</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Controls Row */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Date Picker - varies by tab */}
                {tabMode === "period" && (
                  <div className="flex items-center gap-2">
                    <Tabs value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
                      <TabsList>
                        <TabsTrigger value="day">日</TabsTrigger>
                        <TabsTrigger value="week">週</TabsTrigger>
                        <TabsTrigger value="month">月</TabsTrigger>
                        <TabsTrigger value="year">年</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          {periodType === "year"
                            ? format(date, "yyyy年")
                            : periodType === "month"
                              ? format(date, "yyyy/MM")
                              : periodType === "week"
                                ? format(date, "yyyy/MM/dd週")
                                : format(date, "yyyy/MM/dd")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={(date) => date && setDate(date)}
                          locale={ja}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          {compareDate ? (
                            periodType === "year" ? (
                              format(compareDate, "yyyy年")
                            ) : periodType === "month" ? (
                              format(compareDate, "yyyy/MM")
                            ) : periodType === "week" ? (
                              format(compareDate, "yyyy/MM/dd週")
                            ) : (
                              format(compareDate, "yyyy/MM/dd")
                            )
                          ) : (
                            <span className="text-muted-foreground">比較期間を選択</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <div className="p-2 border-b flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCompareDate(undefined)}
                            disabled={!compareDate}
                          >
                            クリア
                          </Button>
                        </div>
                        <Calendar
                          mode="single"
                          selected={compareDate}
                          onSelect={(date) => setCompareDate(date)}
                          locale={ja}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {tabMode === "comparison" && (
                  <div className="flex items-center gap-4">
                    {/* Period Type Tabs */}
                    <div className="flex items-center">
                      <Tabs
                        value={comparisonPeriodType}
                        onValueChange={(v) => setComparisonPeriodType(v as PeriodType)}
                      >
                        <TabsList className="h-8">
                          <TabsTrigger value="day" className="text-xs px-3">
                            日
                          </TabsTrigger>
                          <TabsTrigger value="week" className="text-xs px-3">
                            週
                          </TabsTrigger>
                          <TabsTrigger value="month" className="text-xs px-3">
                            月
                          </TabsTrigger>
                          <TabsTrigger value="year" className="text-xs px-3">
                            年
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    {/* Date Picker */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          {comparisonPeriodType === "year"
                            ? format(comparisonDate, "yyyy年")
                            : comparisonPeriodType === "month"
                              ? format(comparisonDate, "yyyy/MM")
                              : comparisonPeriodType === "week"
                                ? format(comparisonDate, "yyyy/MM/dd週")
                                : format(comparisonDate, "yyyy/MM/dd")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={comparisonDate}
                          onSelect={(date) => date && setComparisonDate(date)}
                          locale={ja}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {tabMode === "shop" && (
                  <div className="flex items-center gap-4">
                    {/* Period Type Tabs */}
                    <Tabs value={shopPeriodType} onValueChange={(v) => setShopPeriodType(v as PeriodType)}>
                      <TabsList className="h-8">
                        <TabsTrigger value="day" className="text-xs px-3">
                          日
                        </TabsTrigger>
                        <TabsTrigger value="week" className="text-xs px-3">
                          週
                        </TabsTrigger>
                        <TabsTrigger value="month" className="text-xs px-3">
                          月
                        </TabsTrigger>
                        <TabsTrigger value="year" className="text-xs px-3">
                          年
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>

                    {/* Date Picker */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          {shopPeriodType === "year"
                            ? format(shopDate, "yyyy年")
                            : shopPeriodType === "month"
                              ? format(shopDate, "yyyy/MM")
                              : shopPeriodType === "week"
                                ? format(shopDate, "yyyy/MM/dd週")
                                : format(shopDate, "yyyy/MM/dd")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={shopDate}
                          onSelect={(date) => date && setShopDate(date)}
                          locale={ja}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>

                    {/* Comparison Date Picker */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          {shopCompareDate ? (
                            shopPeriodType === "year" ? (
                              format(shopCompareDate, "yyyy年")
                            ) : shopPeriodType === "month" ? (
                              format(shopCompareDate, "yyyy/MM")
                            ) : shopPeriodType === "week" ? (
                              format(shopCompareDate, "yyyy/MM/dd週")
                            ) : (
                              format(shopCompareDate, "yyyy/MM/dd")
                            )
                          ) : (
                            <span className="text-muted-foreground">比較期間を選択</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <div className="p-2 border-b flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShopCompareDate(undefined)}
                            disabled={!shopCompareDate}
                          >
                            クリア
                          </Button>
                        </div>
                        <Calendar
                          mode="single"
                          selected={shopCompareDate}
                          onSelect={(date) => setShopCompareDate(date)}
                          locale={ja}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Target Toggle - Hide on comparison tab */}
                {tabMode !== "comparison" && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="showTarget"
                      checked={showTarget}
                      onCheckedChange={(checked) => setShowTarget(checked as boolean)}
                    />
                    <Label htmlFor="showTarget" className="text-sm cursor-pointer">
                      目標表示
                    </Label>
                  </div>
                )}
              </div>

              {/* Shop Display Type Selection */}
              {tabMode === "shop" && (
                <div className="pt-2 border-t">
                  <RadioGroup
                    value={shopDisplayType}
                    onValueChange={(v) => setShopDisplayType(v as typeof shopDisplayType)}
                    className="flex flex-wrap gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cost" id="cost" />
                      <Label htmlFor="cost" className="cursor-pointer">
                        コスト
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="co2" id="co2" />
                      <Label htmlFor="co2" className="cursor-pointer">
                        CO2排出量
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cost_per_unit" id="cost_per_unit" />
                      <Label htmlFor="cost_per_unit" className="cursor-pointer">
                        台当たりコスト
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="co2_per_unit" id="co2_per_unit" />
                      <Label htmlFor="co2_per_unit" className="cursor-pointer">
                        台当たりCO₂排出量
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chart Area */}
        <Card>
          <CardHeader>
            <CardTitle>{getChartTitle()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                {tabMode === "shop" ? (
                  facilityId || utilityId || equipmentId ? (
                    facilityId || utilityId ? (
                      // Stacked Bar Chart for Facility/Utility with dual Y-axis using ComposedChart
                      <ComposedChart
                        data={shopComparisonData.map((item, idx) => {
                          const currentMonth = shopDate.getMonth() + 1;
                          const currentMonthLabel = `${currentMonth}月`;
                          const monthlyPlan = productionPlanData.find(
                            (p) => p.month === currentMonthLabel,
                          )?.planned_units;

                          return {
                            ...item,
                            productionPlan:
                              shopPeriodType === "year" ? productionPlanData[idx]?.planned_units : monthlyPlan,
                          };
                        })}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" label={{ value: getUnitLabel(), angle: -90, position: "insideLeft" }} />
                        {shopDisplayType !== "cost_per_unit" && shopDisplayType !== "co2_per_unit" && (
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            label={{ value: "生産台数", angle: 90, position: "insideRight" }}
                            allowDecimals={false}
                          />
                        )}
                        <Tooltip />
                        <Legend />
                        <Bar
                          yAxisId="left"
                          dataKey="category1"
                          stackId="a"
                          fill="hsl(var(--chart-1))"
                          name="カテゴリ1"
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="category2"
                          stackId="a"
                          fill="hsl(var(--chart-3))"
                          name="カテゴリ2"
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="category3"
                          stackId="a"
                          fill="hsl(var(--chart-4))"
                          name="カテゴリ3"
                        />
                        {shopDisplayType !== "cost_per_unit" && shopDisplayType !== "co2_per_unit" && (
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="productionPlan"
                            stroke="hsl(var(--chart-5))"
                            strokeWidth={2}
                            name="生産計画"
                            dot={{ fill: "hsl(var(--chart-5))" }}
                          />
                        )}
                        {showTarget && (
                          <ReferenceLine
                            yAxisId="left"
                            y={150}
                            stroke="hsl(var(--chart-2))"
                            strokeDasharray="5 5"
                            label="目標"
                          />
                        )}
                      </ComposedChart>
                    ) : (
                      // Line Chart for Equipment with dual Y-axis
                      <LineChart
                        data={shopComparisonData.map((item, idx) => {
                          const currentMonth = shopDate.getMonth() + 1;
                          const currentMonthLabel = `${currentMonth}月`;
                          const monthlyPlan = productionPlanData.find(
                            (p) => p.month === currentMonthLabel,
                          )?.planned_units;

                          return {
                            ...item,
                            productionPlan:
                              shopPeriodType === "year" ? productionPlanData[idx]?.planned_units : monthlyPlan,
                          };
                        })}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" label={{ value: getUnitLabel(), angle: -90, position: "insideLeft" }} />
                        {shopDisplayType !== "cost_per_unit" && shopDisplayType !== "co2_per_unit" && (
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            label={{ value: "生産台数", angle: 90, position: "insideRight" }}
                            allowDecimals={false}
                          />
                        )}
                        <Tooltip />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="value"
                          stroke="hsl(var(--chart-1))"
                          strokeWidth={2}
                          name={shopCompareDate ? format(shopDate, "yyyy/MM/dd") : "実績"}
                        />
                        {shopCompareDate && (
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="compareValue"
                            stroke="hsl(var(--chart-3))"
                            strokeWidth={2}
                            name={format(shopCompareDate, "yyyy/MM/dd")}
                          />
                        )}
                        {shopDisplayType !== "cost_per_unit" && shopDisplayType !== "co2_per_unit" && (
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="productionPlan"
                            stroke="hsl(var(--chart-5))"
                            strokeWidth={2}
                            name="生産計画"
                            dot={{ fill: "hsl(var(--chart-5))" }}
                          />
                        )}
                        {showTarget && (
                          <ReferenceLine
                            yAxisId="left"
                            y={150}
                            stroke="hsl(var(--chart-2))"
                            strokeDasharray="5 5"
                            label="目標"
                          />
                        )}
                      </LineChart>
                    )
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      コスト/CO₂を表示するには、サイドバーからファシリティ、ユーティリティ、または設備を選択してください。
                    </div>
                  )
                ) : tabMode === "comparison" ? (
                  utilityId && comparisonData.length > 0 ? (
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis label={{ value: "kWh/m³", angle: -90, position: "insideLeft" }} />
                      <Tooltip />
                      <Legend
                        payload={[
                          { value: "実績", type: "square" as const, color: "hsl(var(--chart-1))", id: "value" },
                        ]}
                      />
                      <Bar dataKey="value" fill="hsl(var(--chart-1))" name="実績" />
                    </BarChart>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      {!utilityId
                        ? "設備比較を表示するには、サイドバーからユーティリティを選択してください。"
                        : "選択されたユーティリティに設備がありません。"}
                    </div>
                  )
                ) : tabMode === "period" ? (
                  utilityId || equipmentId ? (
                    <LineChart data={energyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="time"
                        label={{ value: getXAxisLabel(), position: "insideBottomRight", offset: -10 }}
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis label={{ value: getUnitLabel(), angle: -90, position: "insideLeft" }} />
                      <Tooltip
                        labelFormatter={(label, payload) => {
                          if (payload?.[0]?.payload?.fullDate) {
                            return payload[0].payload.fullDate;
                          }
                          return label;
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="hsl(var(--chart-1))"
                        strokeWidth={2}
                        name={compareDate ? format(date, "yyyy/MM/dd") : "実績"}
                      />
                      {compareDate && (
                        <Line
                          type="monotone"
                          dataKey="compareActual"
                          stroke="hsl(var(--chart-3))"
                          strokeWidth={2}
                          name={format(compareDate, "yyyy/MM/dd")}
                        />
                      )}
                      {showTarget && (
                        <Line
                          type="monotone"
                          dataKey="target"
                          stroke="hsl(var(--chart-2))"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="目標"
                        />
                      )}
                    </LineChart>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      使用量推移を表示するには、サイドバーからユーティリティまたは設備を選択してください。
                    </div>
                  )
                ) : null}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button variant="outline" className="gap-2" onClick={() => setAxisDialogOpen(true)}>
            <Settings className="h-4 w-4" />
            軸設定
          </Button>
          <Button variant="outline" onClick={() => setDataTableDialogOpen(true)}>
            データ表
          </Button>
        </div>

        {/* Axis Settings Dialog */}
        <Dialog open={axisDialogOpen} onOpenChange={setAxisDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Y軸スケール設定</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Y軸（左）設定 */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Y1軸 設定:</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">最小値:</Label>
                    <Input
                      value={axisSettings.yLeftMin}
                      onChange={(e) => setAxisSettings({ ...axisSettings, yLeftMin: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">最大値:</Label>
                    <Input
                      value={axisSettings.yLeftMax}
                      onChange={(e) => setAxisSettings({ ...axisSettings, yLeftMax: e.target.value })}
                      placeholder="自動"
                    />
                    <span className="text-xs text-muted-foreground">（空欄=自動）</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">間隔:</Label>
                  <Input
                    value={axisSettings.yLeftStepSize}
                    onChange={(e) => setAxisSettings({ ...axisSettings, yLeftStepSize: e.target.value })}
                    placeholder="自動"
                  />
                  <span className="text-xs text-muted-foreground">（空欄=自動）</span>
                </div>
              </div>

              {/* Y軸（右）設定 */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Y2軸 設定:</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">最小値:</Label>
                    <Input
                      value={axisSettings.yRightMin}
                      onChange={(e) => setAxisSettings({ ...axisSettings, yRightMin: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">最大値:</Label>
                    <Input
                      value={axisSettings.yRightMax}
                      onChange={(e) => setAxisSettings({ ...axisSettings, yRightMax: e.target.value })}
                      placeholder="自動"
                    />
                    <span className="text-xs text-muted-foreground">（空欄=自動）</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">間隔:</Label>
                  <Input
                    value={axisSettings.yRightStepSize}
                    onChange={(e) => setAxisSettings({ ...axisSettings, yRightStepSize: e.target.value })}
                    placeholder="自動"
                  />
                  <span className="text-xs text-muted-foreground">（空欄=自動）</span>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setAxisDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={() => setAxisDialogOpen(false)}>適用</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Data Table Dialog */}
        <Dialog open={dataTableDialogOpen} onOpenChange={setDataTableDialogOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>
                データ詳細: {processName}（{getUnitLabel()}）
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {tabMode === "period" && periodType === "day"
                  ? `期間: ${format(date, "yyyy/MM/dd")} 05:00 - 29:00`
                  : tabMode === "period"
                    ? `期間: ${periodType === "month" ? "月別" : periodType === "week" ? "週別" : "年別"}`
                    : ""}
              </p>
            </DialogHeader>
            <div className="py-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV}>
                <Download className="h-4 w-4" />
                CSV出力
              </Button>
            </div>
            <div className="overflow-auto max-h-[400px]">
              {tabMode === "period" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日付</TableHead>
                      <TableHead>時間</TableHead>
                      <TableHead className="text-right">
                        {processName}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {periodType === "year"
                            ? format(date, "yyyy年")
                            : periodType === "month"
                              ? format(date, "yyyy/MM")
                              : format(date, "yyyy/MM/dd")}
                        </span>
                      </TableHead>
                      {compareDate && (
                        <TableHead className="text-right">
                          {processName}
                          <br />
                          <span className="text-xs text-muted-foreground">
                            {periodType === "year"
                              ? format(compareDate, "yyyy年")
                              : periodType === "month"
                                ? format(compareDate, "yyyy/MM")
                                : format(compareDate, "yyyy/MM/dd")}
                          </span>
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {energyData.map((item, index) => {
                      // Extract day and hour from data
                      let dayDisplay = "";
                      let hourDisplay = "";

                      if (periodType === "day") {
                        // For day view: time is "05:00", "06:00", etc.
                        dayDisplay = `${date.getDate()}日`;
                        hourDisplay = item.time;
                      } else if (periodType === "week") {
                        // For week view: time is "MM/dd HH:00"
                        const parts = item.time.split(" ");
                        if (parts.length === 2) {
                          const datePart = parts[0].split("/");
                          dayDisplay = `${parseInt(datePart[1])}日`;
                          hourDisplay = parts[1];
                        } else {
                          dayDisplay = item.time;
                          hourDisplay = "-";
                        }
                      } else if (periodType === "month") {
                        // For month view: time is "1", "2", etc.
                        dayDisplay = `${item.time}日`;
                        hourDisplay = "-";
                      } else {
                        // For year view: time is "1月", "2月", etc.
                        dayDisplay = item.time;
                        hourDisplay = "-";
                      }

                      return (
                        <TableRow key={index}>
                          <TableCell>{dayDisplay}</TableCell>
                          <TableCell>{hourDisplay}</TableCell>
                          <TableCell className="text-right">{Math.round(item.actual).toLocaleString()}</TableCell>
                          {compareDate && (
                            <TableCell className="text-right">
                              {item.compareActual !== undefined ? Math.round(item.compareActual).toLocaleString() : "-"}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : tabMode === "comparison" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日時</TableHead>
                      {availableEquipment.map((eq) => (
                        <TableHead key={eq.id} className="text-right">
                          {eq.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonTableData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.datetime}</TableCell>
                        {availableEquipment.map((eq) => (
                          <TableCell key={eq.id} className="text-right">
                            {item[eq.name] !== undefined ? Math.round(item[eq.name]).toLocaleString() : "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : tabMode === "shop" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日付</TableHead>
                      <TableHead>時間</TableHead>
                      {shopChildItems.length > 0 ? (
                        <>
                          {shopChildItems.map((item) => (
                            <TableHead key={item.id} className="text-right">
                              {item.name}
                              <br />
                              <span className="text-xs text-muted-foreground">
                                {shopPeriodType === "year"
                                  ? format(shopDate, "yyyy年")
                                  : shopPeriodType === "month"
                                    ? format(shopDate, "yyyy/MM")
                                    : format(shopDate, "yyyy/MM/dd")}
                              </span>
                            </TableHead>
                          ))}
                          {shopCompareDate &&
                            shopChildItems.map((item) => (
                              <TableHead key={`${item.id}_compare`} className="text-right">
                                {item.name}
                                <br />
                                <span className="text-xs text-muted-foreground">
                                  {shopPeriodType === "year"
                                    ? format(shopCompareDate, "yyyy年")
                                    : shopPeriodType === "month"
                                      ? format(shopCompareDate, "yyyy/MM")
                                      : format(shopCompareDate, "yyyy/MM/dd")}
                                </span>
                              </TableHead>
                            ))}
                        </>
                      ) : (
                        <>
                          <TableHead className="text-right">
                            {processName}
                            <br />
                            <span className="text-xs text-muted-foreground">
                              {shopPeriodType === "year"
                                ? format(shopDate, "yyyy年")
                                : shopPeriodType === "month"
                                  ? format(shopDate, "yyyy/MM")
                                  : format(shopDate, "yyyy/MM/dd")}
                            </span>
                          </TableHead>
                          {shopCompareDate && (
                            <TableHead className="text-right">
                              {processName}
                              <br />
                              <span className="text-xs text-muted-foreground">
                                {shopPeriodType === "year"
                                  ? format(shopCompareDate, "yyyy年")
                                  : shopPeriodType === "month"
                                    ? format(shopCompareDate, "yyyy/MM")
                                    : format(shopCompareDate, "yyyy/MM/dd")}
                              </span>
                            </TableHead>
                          )}
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shopTableData.map((item, index) => {
                      // Extract day and hour from datetime
                      let dayDisplay = "";
                      let hourDisplay = "";

                      if (shopPeriodType === "day") {
                        const parts = item.datetime.split(" ");
                        dayDisplay = `${shopDate.getDate()}日`;
                        hourDisplay = parts[1] || "-";
                      } else if (shopPeriodType === "week") {
                        const parts = item.datetime.split(" ");
                        const dateParts = parts[0].split("-");
                        dayDisplay = `${parseInt(dateParts[2])}日`;
                        hourDisplay = parts[1] || "-";
                      } else if (shopPeriodType === "month") {
                        const parts = item.datetime.split(" ");
                        const dateParts = parts[0].split("-");
                        dayDisplay = `${parseInt(dateParts[2])}日`;
                        hourDisplay = parts[1] || "-";
                      } else {
                        // year
                        const parts = item.datetime.split(" ");
                        const dateParts = parts[0].split("-");
                        dayDisplay = `${parseInt(dateParts[1])}月`;
                        hourDisplay = parts[1] || "-";
                      }

                      return (
                        <TableRow key={index}>
                          <TableCell>{dayDisplay}</TableCell>
                          <TableCell>{hourDisplay}</TableCell>
                          {shopChildItems.length > 0 ? (
                            <>
                              {shopChildItems.map((child) => (
                                <TableCell key={child.id} className="text-right">
                                  {item[child.name] !== undefined ? Math.round(item[child.name]).toLocaleString() : "-"}
                                </TableCell>
                              ))}
                              {shopCompareDate &&
                                shopChildItems.map((child) => (
                                  <TableCell key={`${child.id}_compare`} className="text-right">
                                    {item[`${child.name}_compare`] !== undefined
                                      ? Math.round(item[`${child.name}_compare`]).toLocaleString()
                                      : "-"}
                                  </TableCell>
                                ))}
                            </>
                          ) : (
                            <>
                              <TableCell className="text-right">
                                {item.value !== undefined ? Math.round(item.value).toLocaleString() : "-"}
                              </TableCell>
                              {shopCompareDate && (
                                <TableCell className="text-right">
                                  {item.compareValue !== undefined
                                    ? Math.round(item.compareValue).toLocaleString()
                                    : "-"}
                                </TableCell>
                              )}
                            </>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>時間</TableHead>
                      <TableHead className="text-right">値</TableHead>
                      <TableHead className="text-right">目標</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        データなし
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
