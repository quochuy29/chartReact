import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Upload, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SmartPagination } from "@/components/SmartPagination";

// Helper function to generate mock data
const generateMockData = (prefix: string, count: number, type: 'tag' | 'device' | 'parameter') => {
  const uploaders = ["田中太郎", "山田花子", "佐藤次郎", "鈴木一郎", "高橋美咲"];
  const data = [];
  
  for (let i = 1; i <= count; i++) {
    const year = 2024 + Math.floor((i - 1) / 12);
    const month = ((i - 1) % 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    const hour = Math.floor(Math.random() * 12) + 8;
    const minute = Math.floor(Math.random() * 60);
    const status = Math.random() > 0.15 ? "success" : "failed";
    const uploader = uploaders[Math.floor(Math.random() * uploaders.length)];
    
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
    const errorFile = status === "failed" 
      ? `${prefix}_error_${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}${String(hour).padStart(2, '0')}${String(minute).padStart(2, '0')}00.txt`
      : null;
    
    data.push({
      id: i,
      fileName: `${prefix}_${year}_${String(month).padStart(2, '0')}.csv`,
      uploadDate: dateStr,
      uploader,
      status,
      errorFile,
    });
  }
  
  return data;
};

// Mock data for CSV uploads - 50 records
const mockTagUploads = generateMockData("tag_formula", 50, "tag");

// Mock data for device management - 50 records
const mockDeviceUploads = generateMockData("device_list", 50, "device");

// Mock data for parameter settings uploads - 50 records
const mockParameterUploads = generateMockData("parameter", 50, "parameter");

const DataMaintenance = () => {
  const { toast } = useToast();
  const [tagCurrentPage, setTagCurrentPage] = useState(1);
  const [parameterCurrentPage, setParameterCurrentPage] = useState(1);
  const [deviceCurrentPage, setDeviceCurrentPage] = useState(1);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryProgress, setRecoveryProgress] = useState(0);
  const [recoveryFromDate, setRecoveryFromDate] = useState("");
  const [recoveryToDate, setRecoveryToDate] = useState("");

  const itemsPerPage = 5;
  const totalTagPages = Math.ceil(mockTagUploads.length / itemsPerPage);
  const tagStartIndex = (tagCurrentPage - 1) * itemsPerPage;
  const tagEndIndex = tagStartIndex + itemsPerPage;

  const totalParameterPages = Math.ceil(mockParameterUploads.length / itemsPerPage);
  const parameterStartIndex = (parameterCurrentPage - 1) * itemsPerPage;
  const parameterEndIndex = parameterStartIndex + itemsPerPage;
  const currentParameterUploads = mockParameterUploads.slice(parameterStartIndex, parameterEndIndex);

  const totalDevicePages = Math.ceil(mockDeviceUploads.length / itemsPerPage);
  const deviceStartIndex = (deviceCurrentPage - 1) * itemsPerPage;
  const deviceEndIndex = deviceStartIndex + itemsPerPage;
  const currentDeviceUploads = mockDeviceUploads.slice(deviceStartIndex, deviceEndIndex);
  const currentTagUploads = mockTagUploads.slice(tagStartIndex, tagEndIndex);

  const handleFileDownload = (fileName: string) => {
    toast({
      title: "ダウンロード開始",
      description: `${fileName} をダウンロードしています...`,
    });
  };

  const handleTemplateDownload = (type: string) => {
    toast({
      title: "テンプレートダウンロード",
      description: `${type}テンプレートをダウンロードしています...`,
    });
  };

  const handleFileUpload = (type: string) => {
    toast({
      title: "アップロード完了",
      description: `${type}ファイルのアップロードが正常に完了しました。`,
    });
  };

  const handleExecuteRecovery = () => {
    // Validation
    if (!recoveryFromDate && !recoveryToDate) {
      toast({
        title: "エラー",
        description: "開始日時と終了日時を選択してください",
        variant: "destructive",
      });
      return;
    }

    if (!recoveryFromDate) {
      toast({
        title: "エラー",
        description: "開始日時を選択してください",
        variant: "destructive",
      });
      return;
    }

    if (!recoveryToDate) {
      toast({
        title: "エラー",
        description: "終了日時を選択してください",
        variant: "destructive",
      });
      return;
    }

    // Check if start date is greater than end date
    const fromDate = new Date(recoveryFromDate);
    const toDate = new Date(recoveryToDate);
    if (fromDate > toDate) {
      toast({
        title: "エラー",
        description: "開始日時は終了日時より前に設定してください",
        variant: "destructive",
      });
      return;
    }

    setIsRecovering(true);
    setRecoveryProgress(0);

    // Mock recovered records count
    const mockRecoveredRecords = Math.floor(Math.random() * 1000) + 100;

    const interval = setInterval(() => {
      setRecoveryProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRecovering(false);
          toast({
            title: "復旧完了",
            description: `データの復旧が正常に完了しました。復旧レコード数: ${mockRecoveredRecords.toLocaleString()} 件`,
          });
          return 0;
        }
        return prev + 10;
      });
    }, 500);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">データ保守</h1>

        <Tabs defaultValue="tag-calculation" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger className="data-[state=active]:shadow-[0_2px_0_0_#ff0000]" value="tag-calculation">
              Tag計算式設定
            </TabsTrigger>
            <TabsTrigger className="data-[state=active]:shadow-[0_2px_0_0_#ff0000]" value="parameter-setting">
              パラメータ設定
            </TabsTrigger>
            <TabsTrigger className="data-[state=active]:shadow-[0_2px_0_0_#ff0000]" value="data-recovery">
              データ復旧
            </TabsTrigger>
            <TabsTrigger className="data-[state=active]:shadow-[0_2px_0_0_#ff0000]" value="device-management">
              設備管理
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Tag Calculation Setting */}
          <TabsContent value="tag-calculation">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button onClick={() => handleFileUpload("Tag計算式")}>
                  <Upload className="h-4 w-4 mr-2" />
                  CSVアップロード
                </Button>
                <button
                  onClick={() => handleTemplateDownload("Tag計算式")}
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  <Download className="h-4 w-4" />
                  テンプレートダウンロード
                </button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">No.</TableHead>
                      <TableHead>ファイル名</TableHead>
                      <TableHead>アップロード日時</TableHead>
                      <TableHead>アップロード者</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead className="w-56">エラー</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentTagUploads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          アップロードされたファイルがありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentTagUploads.map((upload, index) => (
                        <TableRow key={upload.id}>
                          <TableCell>{tagStartIndex + index + 1}</TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleFileDownload(upload.fileName)}
                              className="text-primary hover:underline"
                            >
                              {upload.fileName}
                            </button>
                          </TableCell>
                          <TableCell>{upload.uploadDate}</TableCell>
                          <TableCell>{upload.uploader}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                upload.status === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}
                            >
                              {upload.status === "success" ? "成功" : "失敗"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {upload.errorFile ? (
                              <button
                                onClick={() => handleFileDownload(upload.errorFile!)}
                                className="text-destructive hover:underline text-sm"
                              >
                                {upload.errorFile}
                              </button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {mockTagUploads.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {tagStartIndex + 1} - {Math.min(tagEndIndex, mockTagUploads.length)} / {mockTagUploads.length} 件
                  </span>
                  <div className="flex items-center gap-1">
                  <SmartPagination
                    currentPage={tagCurrentPage}
                    totalPages={totalTagPages}
                    onPageChange={setTagCurrentPage}
                  />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab 2: Parameter Setting */}
          <TabsContent value="parameter-setting">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button onClick={() => handleFileUpload("パラメータ")}>
                  <Upload className="h-4 w-4 mr-2" />
                  CSVアップロード
                </Button>
                <button
                  onClick={() => handleTemplateDownload("パラメータ")}
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  <Download className="h-4 w-4" />
                  テンプレートダウンロード
                </button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">No.</TableHead>
                      <TableHead>ファイル名</TableHead>
                      <TableHead>アップロード日時</TableHead>
                      <TableHead>アップロード者</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead className="w-56">エラー</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentParameterUploads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          アップロードされたファイルがありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentParameterUploads.map((upload, index) => (
                        <TableRow key={upload.id}>
                          <TableCell>{parameterStartIndex + index + 1}</TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleFileDownload(upload.fileName)}
                              className="text-primary hover:underline"
                            >
                              {upload.fileName}
                            </button>
                          </TableCell>
                          <TableCell>{upload.uploadDate}</TableCell>
                          <TableCell>{upload.uploader}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                upload.status === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}
                            >
                              {upload.status === "success" ? "成功" : "失敗"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {upload.errorFile ? (
                              <button
                                onClick={() => handleFileDownload(upload.errorFile!)}
                                className="text-destructive hover:underline text-sm"
                              >
                                {upload.errorFile}
                              </button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {mockParameterUploads.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {parameterStartIndex + 1} - {Math.min(parameterEndIndex, mockParameterUploads.length)} /{" "}
                    {mockParameterUploads.length} 件
                  </span>
                  <SmartPagination
                    currentPage={parameterCurrentPage}
                    totalPages={totalParameterPages}
                    onPageChange={setParameterCurrentPage}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab 3: Data Recovery */}
          <TabsContent value="data-recovery">
            <div className="space-y-6">
              <div className="flex items-end gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from-date">開始日時<span className="text-red-500 ml-1">*</span></Label>
                  <Input
                    id="from-date"
                    type="datetime-local"
                    step="1"
                    value={recoveryFromDate}
                    onChange={(e) => setRecoveryFromDate(e.target.value)}
                    className="w-72"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to-date">終了日時<span className="text-red-500 ml-1">*</span></Label>
                  <Input
                    id="to-date"
                    type="datetime-local"
                    step="1"
                    value={recoveryToDate}
                    onChange={(e) => setRecoveryToDate(e.target.value)}
                    className="w-72"
                  />
                </div>
                <Button onClick={handleExecuteRecovery} disabled={isRecovering}>
                  復旧実行
                </Button>
              </div>

              {isRecovering && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>復旧処理中...</span>
                    <span>{recoveryProgress}%</span>
                  </div>
                  <Progress value={recoveryProgress} className="w-full" />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab 4: Device Management */}
          <TabsContent value="device-management">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button onClick={() => handleFileUpload("設備管理")}>
                  <Upload className="h-4 w-4 mr-2" />
                  CSVアップロード
                </Button>
                <button
                  onClick={() => handleTemplateDownload("設備管理")}
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  <Download className="h-4 w-4" />
                  テンプレートダウンロード
                </button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">No.</TableHead>
                      <TableHead>ファイル名</TableHead>
                      <TableHead>アップロード日時</TableHead>
                      <TableHead>アップロード者</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead className="w-56">エラー</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentDeviceUploads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          アップロードされたファイルがありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentDeviceUploads.map((upload, index) => (
                        <TableRow key={upload.id}>
                          <TableCell>{deviceStartIndex + index + 1}</TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleFileDownload(upload.fileName)}
                              className="text-primary hover:underline"
                            >
                              {upload.fileName}
                            </button>
                          </TableCell>
                          <TableCell>{upload.uploadDate}</TableCell>
                          <TableCell>{upload.uploader}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                upload.status === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}
                            >
                              {upload.status === "success" ? "成功" : "失敗"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {upload.errorFile ? (
                              <button
                                onClick={() => handleFileDownload(upload.errorFile!)}
                                className="text-destructive hover:underline text-sm"
                              >
                                {upload.errorFile}
                              </button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {mockDeviceUploads.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {deviceStartIndex + 1} - {Math.min(deviceEndIndex, mockDeviceUploads.length)} /{" "}
                    {mockDeviceUploads.length} 件
                  </span>
                  <SmartPagination
                    currentPage={deviceCurrentPage}
                    totalPages={totalDevicePages}
                    onPageChange={setDeviceCurrentPage}
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default DataMaintenance;
