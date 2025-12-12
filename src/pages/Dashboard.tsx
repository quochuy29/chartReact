import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Settings, Download } from "lucide-react";
import { format, subDays, subWeeks, subMonths, eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from "date-fns";
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ReferenceLine } from "recharts";
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
  const selectionType = facilityId ? 'facility' : utilityId ? 'utility' : equipmentId ? 'equipment' : null;
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
  
  // Shop comparison states (コスト/CO2)
  const [shopDate, setShopDate] = useState<Date>(new Date());
  const [shopCompareDate, setShopCompareDate] = useState<Date | undefined>(undefined);
  const [shopPeriodType, setShopPeriodType] = useState<PeriodType>("day");
  const [shopDisplayType, setShopDisplayType] = useState<"cost" | "co2" | "cost_per_unit" | "co2_per_unit">("cost");
  const [availableProcesses, setAvailableProcesses] = useState<{ id: string; name: string }[]>([]);
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);
  const [shopComparisonData, setShopComparisonData] = useState<any[]>([]);
  
  // Available equipment for comparison (level 4)
  const [availableEquipment, setAvailableEquipment] = useState<{ id: string; name: string }[]>([]);
  
  const [axisSettings, setAxisSettings] = useState({
    yMin: "0",
    yMax: "",
    yStepSize: "",
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
    if (tabMode === "comparison") {
      loadEquipmentData();
      generateComparisonData();
    }
  }, [comparisonDate, comparisonPeriodType, tabMode]);

  useEffect(() => {
    if (tabMode === "shop") {
      generateShopComparisonData();
    }
  }, [tabMode, shopDate, shopCompareDate, shopPeriodType, shopDisplayType]);

  const loadAvailableProcesses = async () => {
    const { data } = await supabase
      .from("processes")
      .select("id, name")
      .eq("is_visible", true)
      .order("display_order");
    if (data) setAvailableProcesses(data);
  };

  const loadSelectionName = async () => {
    if (!selectionId || !selectionType) {
      setProcessName("全工程");
      return;
    }
    
    try {
      let pathParts: string[] = [];
      
      if (selectionType === 'equipment') {
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
      } else if (selectionType === 'utility') {
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
      } else if (selectionType === 'facility') {
        // Facility -> Line
        const { data: facility } = await supabase
          .from("facilities")
          .select("name, line_id")
          .eq("id", selectionId)
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
    const { data } = await supabase
      .from("equipment")
      .select("id, name")
      .eq("is_visible", true)
      .order("display_order");
    if (data) setAvailableEquipment(data);
  };

  const generateComparisonData = () => {
    // Generate equipment comparison data for bar chart
    const equipmentNames = availableEquipment.length > 0 
      ? availableEquipment.map(e => e.name)
      : ["設備1", "設備2", "設備3", "設備4", "設備5"];
    
    const data = equipmentNames.map((name) => ({
      name,
      value: Math.random() * 100 + 50,
      target: 80,
    }));
    setComparisonData(data);
  };

  const generateShopComparisonData = () => {
    // Generate time-series data based on shopPeriodType
    let data: any[] = [];
    if (shopPeriodType === "day") {
      // Generate 24h data
      const hours = Array.from({ length: 24 }, (_, i) => i);
      data = hours.map((hour) => ({
        time: `${String(hour).padStart(2, "0")}:00`,
        value: Math.random() * 100 + 50,
        compareValue: shopCompareDate ? Math.random() * 100 + 40 : undefined,
        target: 80,
      }));
    } else if (shopPeriodType === "week") {
      // Generate 7 days data
      const weekStart = startOfWeek(shopDate, { locale: ja });
      const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(shopDate, { locale: ja }) });
      data = days.map((day) => ({
        time: format(day, "MM/dd"),
        value: Math.random() * 500 + 200,
        compareValue: shopCompareDate ? Math.random() * 500 + 150 : undefined,
        target: 400,
      }));
    } else if (shopPeriodType === "month") {
      // Generate 31 days data
      data = Array.from({ length: 31 }, (_, i) => ({
        time: `${i + 1}日`,
        value: Math.random() * 200 + 100,
        compareValue: shopCompareDate ? Math.random() * 200 + 80 : undefined,
        target: 150,
      }));
    } else {
      // Generate 12 months data
      data = Array.from({ length: 12 }, (_, i) => ({
        time: `${i + 1}月`,
        value: Math.random() * 1000 + 500,
        compareValue: shopCompareDate ? Math.random() * 1000 + 400 : undefined,
        target: 800,
      }));
    }
    setShopComparisonData(data);
  };

  const toggleProcessSelection = (processId: string) => {
    setSelectedProcesses(prev => 
      prev.includes(processId) 
        ? prev.filter(id => id !== processId)
        : prev.length < 6 ? [...prev, processId] : prev
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

  const chartColors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

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
                          {compareDate 
                            ? (periodType === "year" 
                                ? format(compareDate, "yyyy年") 
                                : periodType === "month" 
                                  ? format(compareDate, "yyyy/MM") 
                                  : periodType === "week"
                                    ? format(compareDate, "yyyy/MM/dd週")
                                    : format(compareDate, "yyyy/MM/dd"))
                            : <span className="text-muted-foreground">比較期間を選択</span>}
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
                      <Tabs value={comparisonPeriodType} onValueChange={(v) => setComparisonPeriodType(v as PeriodType)}>
                        <TabsList className="h-8">
                          <TabsTrigger value="day" className="text-xs px-3">日</TabsTrigger>
                          <TabsTrigger value="week" className="text-xs px-3">週</TabsTrigger>
                          <TabsTrigger value="month" className="text-xs px-3">月</TabsTrigger>
                          <TabsTrigger value="year" className="text-xs px-3">年</TabsTrigger>
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
                        <TabsTrigger value="day" className="text-xs px-3">日</TabsTrigger>
                        <TabsTrigger value="week" className="text-xs px-3">週</TabsTrigger>
                        <TabsTrigger value="month" className="text-xs px-3">月</TabsTrigger>
                        <TabsTrigger value="year" className="text-xs px-3">年</TabsTrigger>
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
                          {shopCompareDate 
                            ? (shopPeriodType === "year" 
                                ? format(shopCompareDate, "yyyy年") 
                                : shopPeriodType === "month" 
                                  ? format(shopCompareDate, "yyyy/MM") 
                                  : shopPeriodType === "week"
                                    ? format(shopCompareDate, "yyyy/MM/dd週")
                                    : format(shopCompareDate, "yyyy/MM/dd"))
                            : <span className="text-muted-foreground">比較期間を選択</span>}
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


                {/* Target Toggle */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showTarget"
                    checked={showTarget}
                    onCheckedChange={(checked) => setShowTarget(checked as boolean)}
                  />
                  <Label htmlFor="showTarget" className="text-sm cursor-pointer">目標表示</Label>
                </div>
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
                      <Label htmlFor="cost" className="cursor-pointer">コスト</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="co2" id="co2" />
                      <Label htmlFor="co2" className="cursor-pointer">CO2排出量</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cost_per_unit" id="cost_per_unit" />
                      <Label htmlFor="cost_per_unit" className="cursor-pointer">台当たりコスト</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="co2_per_unit" id="co2_per_unit" />
                      <Label htmlFor="co2_per_unit" className="cursor-pointer">台当たりCO2排出量</Label>
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
                  <LineChart data={shopComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      label={{ value: getUnitLabel(), angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      name={shopCompareDate ? format(shopDate, "yyyy/MM/dd") : "実績"}
                    />
                    {shopCompareDate && (
                      <Line
                        type="monotone"
                        dataKey="compareValue"
                        stroke="hsl(var(--chart-3))"
                        strokeWidth={2}
                        name={format(shopCompareDate, "yyyy/MM/dd")}
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
                ) : tabMode === "comparison" ? (
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      label={{ value: "kWh/m³", angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip />
                    <Legend 
                      payload={[
                        { value: "実績", type: "square" as const, color: "hsl(var(--chart-1))", id: "value" },
                        ...(showTarget ? [{ value: "目標 (基準線)", type: "line" as const, color: "hsl(var(--chart-2))", id: "target", payload: { strokeDasharray: "5 5" } }] : [])
                      ]}
                    />
                    <Bar dataKey="value" fill="hsl(var(--chart-1))" name="実績" />
                    {showTarget && comparisonData.length > 0 && (
                      <ReferenceLine 
                        y={comparisonData[0]?.target || 80} 
                        stroke="hsl(var(--chart-2))" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    )}
                  </BarChart>
                ) : (
                  <LineChart data={energyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      label={{ value: getXAxisLabel(), position: "insideBottomRight", offset: -10 }}
                      tick={{ fontSize: 12 }}
                      angle={tabMode === "period" ? -45 : 0}
                      textAnchor={tabMode === "period" ? "end" : "middle"}
                      height={tabMode === "period" ? 60 : 30}
                    />
                    <YAxis 
                      label={{ value: getUnitLabel(), angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip
                      labelFormatter={(label, payload) => {
                        if (tabMode === "period" && payload?.[0]?.payload?.fullDate) {
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
                )}
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
          <Button variant="outline" onClick={() => setDataTableDialogOpen(true)}>データ表</Button>
        </div>

        {/* Axis Settings Dialog */}
        <Dialog open={axisDialogOpen} onOpenChange={setAxisDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Y軸スケール設定</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Y軸（左）設定:</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">最小値:</Label>
                    <Input
                      value={axisSettings.yMin}
                      onChange={(e) => setAxisSettings({ ...axisSettings, yMin: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">最大値:</Label>
                    <Input
                      value={axisSettings.yMax}
                      onChange={(e) => setAxisSettings({ ...axisSettings, yMax: e.target.value })}
                      placeholder="自動"
                    />
                    <span className="text-xs text-muted-foreground">（空欄=自動）</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Step Size:</Label>
                  <Input
                    value={axisSettings.yStepSize}
                    onChange={(e) => setAxisSettings({ ...axisSettings, yStepSize: e.target.value })}
                    placeholder="自動"
                  />
                  <span className="text-xs text-muted-foreground">（空欄=自動）</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="saveSettings"
                  checked={axisSettings.saveSettings}
                  onCheckedChange={(checked) => setAxisSettings({ ...axisSettings, saveSettings: checked as boolean })}
                />
                <Label htmlFor="saveSettings" className="text-sm">設定を保存する</Label>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setAxisDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={() => setAxisDialogOpen(false)}>
                適用
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Data Table Dialog */}
        <Dialog open={dataTableDialogOpen} onOpenChange={setDataTableDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>データ詳細: {processName}（{getUnitLabel()}）</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {periodType === "day"
                  ? `期間: ${format(date, "yyyy/MM/dd")} 05:00 - 29:00`
                  : `期間: ${periodType === "month" ? "月別" : periodType === "week" ? "週別" : "年別"}`
                }
              </p>
            </DialogHeader>
            <div className="py-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV}>
                <Download className="h-4 w-4" />
                CSV出力
              </Button>
            </div>
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>時間</TableHead>
                    <TableHead className="text-right">値</TableHead>
                    <TableHead className="text-right">目標</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {energyData.slice(0, 10).map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.fullDate || item.time}</TableCell>
                      <TableCell className="text-right">{Math.round(item.actual).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{Math.round(item.target).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {energyData.length > 10 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">...</TableCell>
                    </TableRow>
                  )}
                  <TableRow className="font-bold border-t-2">
                    <TableCell>合計</TableCell>
                    <TableCell className="text-right">{Math.round(energyData.reduce((sum, item) => sum + item.actual, 0)).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{Math.round(energyData.reduce((sum, item) => sum + item.target, 0)).toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
