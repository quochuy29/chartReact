import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ProductionPlanning = () => {
  const [fiscalYear, setFiscalYear] = useState(2025);
  const [factories, setFactories] = useState<any[]>([]);
  const [selectedFactory, setSelectedFactory] = useState<string>("");
  const [plans, setPlans] = useState<Record<number, { units: number; notes: string }>>({});

  const months = [
    { value: 4, label: "4月" },
    { value: 5, label: "5月" },
    { value: 6, label: "6月" },
    { value: 7, label: "7月" },
    { value: 8, label: "8月" },
    { value: 9, label: "9月" },
    { value: 10, label: "10月" },
    { value: 11, label: "11月" },
    { value: 12, label: "12月" },
    { value: 1, label: "1月" },
    { value: 2, label: "2月" },
    { value: 3, label: "3月" },
  ];

  useEffect(() => {
    loadFactories();
  }, []);

  useEffect(() => {
    if (selectedFactory) {
      loadPlans();
    }
  }, [selectedFactory, fiscalYear]);

  const loadFactories = async () => {
    const { data } = await supabase.from("factories").select("*").order("display_order");
    if (data) {
      setFactories(data);
      if (data.length > 0) {
        setSelectedFactory(data[0].id);
      }
    }
  };

  const loadPlans = async () => {
    if (!selectedFactory) return;

    const { data } = await supabase
      .from("production_plans")
      .select("*")
      .eq("factory_id", selectedFactory)
      .eq("fiscal_year", fiscalYear);

    if (data) {
      const plansMap: Record<number, { units: number; notes: string }> = {};
      data.forEach((plan) => {
        plansMap[plan.month] = {
          units: plan.planned_units,
          notes: plan.notes || "",
        };
      });
      setPlans(plansMap);
    }
  };

  const handleSave = async () => {
    if (!selectedFactory) return;

    const updates = Object.entries(plans).map(([month, plan]) => ({
      factory_id: selectedFactory,
      fiscal_year: fiscalYear,
      month: parseInt(month),
      planned_units: plan.units,
      notes: plan.notes,
    }));

    const { error } = await supabase.from("production_plans").upsert(updates, {
      onConflict: "factory_id,fiscal_year,month",
    });

    if (error) {
      toast.error("保存エラー", { description: error.message });
    } else {
      toast.success("保存しました");
    }
  };

  const updatePlan = (month: number, field: "units" | "notes", value: string | number) => {
    setPlans((prev) => ({
      ...prev,
      [month]: {
        units: field === "units" ? (value as number) : prev[month]?.units || 0,
        notes: field === "notes" ? (value as string) : prev[month]?.notes || "",
      },
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">生産計画設定</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">会計年度を選択:</span>
                <Select value={fiscalYear.toString()} onValueChange={(value) => setFiscalYear(parseInt(value))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024年度</SelectItem>
                    <SelectItem value="2025">2025年度</SelectItem>
                    <SelectItem value="2026">2026年度</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {factories.length > 0 && (
                <Select value={selectedFactory} onValueChange={setSelectedFactory}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="工場を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {factories.map((factory) => (
                      <SelectItem key={factory.id} value={factory.id}>
                        {factory.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-sm font-medium">生産台数を入力してください (台):</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">月</TableHead>
                  <TableHead>計画 (台)</TableHead>
                  <TableHead>備考</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {months.map((month) => (
                  <TableRow key={month.value}>
                    <TableCell className="font-medium">{month.label}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={plans[month.value]?.units || ""}
                        onChange={(e) => updatePlan(month.value, "units", parseInt(e.target.value) || 0)}
                        className="w-[150px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={plans[month.value]?.notes || ""}
                        onChange={(e) => updatePlan(month.value, "notes", e.target.value)}
                        placeholder="例: 連休あり"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-6 flex justify-center">
              <Button onClick={handleSave}>保存</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProductionPlanning;
