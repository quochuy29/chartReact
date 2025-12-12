import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { z } from "zod";

interface UserWithRole {
  id: string;
  display_name: string | null;
  email: string | null;
  role: "admin" | "manager" | "user" | null;
  created_at: string;
}

type AppRole = "admin" | "manager" | "user";

// Validation schemas
const addUserSchema = z
  .object({
    user_id: z
      .string()
      .min(3, "ユーザーIDは3文字以上で入力してください")
      .max(50, "ユーザーIDは50文字以内で入力してください")
      .regex(/^[a-zA-Z0-9]+$/, "ユーザーIDは半角英数字のみ入力可能です"),
    display_name: z.string().min(1, "表示名は必須です").max(50, "表示名は50文字以内で入力してください"),
    email: z.string().min(1, "メールアドレスは必須です").email("正しいメールアドレス形式で入力してください"),
    password: z
      .string()
      .min(8, "パスワードは8文字以上で入力してください")
      .max(25, "パスワードは25文字以内で入力してください"),
    password_confirm: z.string().min(1, "パスワード確認は必須です"),
    role: z.enum(["admin", "manager", "user"], { required_error: "役割を選択してください" }),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "パスワードが一致しません",
    path: ["password_confirm"],
  });

const editUserSchema = z
  .object({
    display_name: z.string().min(1, "表示名は必須です").max(50, "表示名は50文字以内で入力してください"),
    email: z.string().min(1, "メールアドレスは必須です").email("正しいメールアドレス形式で入力してください"),
    role: z.enum(["admin", "manager", "user"], { required_error: "役割を選択してください" }),
    password: z.string().max(25, "パスワードは25文字以内で入力してください").optional().or(z.literal("")),
    password_confirm: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.password && data.password.length > 0) {
        if (data.password.length < 8) return false;
      }
      return true;
    },
    {
      message: "パスワードは8文字以上で入力してください",
      path: ["password"],
    },
  )
  .refine(
    (data) => {
      if (data.password && data.password.length > 0) {
        return data.password === data.password_confirm;
      }
      return true;
    },
    {
      message: "パスワードが一致しません",
      path: ["password_confirm"],
    },
  );

type AddUserErrors = Partial<Record<keyof z.infer<typeof addUserSchema>, string>>;
type EditUserErrors = Partial<Record<"display_name" | "email" | "role" | "password" | "password_confirm", string>>;

const UserManagement = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 5;
  const [editFormData, setEditFormData] = useState({
    display_name: "",
    email: "",
    role: "user" as AppRole,
    is_display_user: false,
    password: "",
    password_confirm: "",
  });
  const [formData, setFormData] = useState({
    user_id: "",
    email: "",
    password: "",
    password_confirm: "",
    display_name: "",
    role: "user" as AppRole,
    is_display_user: false,
  });
  const [addFormErrors, setAddFormErrors] = useState<AddUserErrors>({});
  const [editFormErrors, setEditFormErrors] = useState<EditUserErrors>({});
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, email, created_at");

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: roles, error: rolesError } = await supabase.from("user_roles").select("user_id, role");

      if (rolesError) throw rolesError;

      // Create a map of user_id to role
      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role as AppRole]));

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => ({
        id: profile.id,
        display_name: profile.display_name,
        email: profile.email,
        role: roleMap.get(profile.id) || "admin",
        created_at: profile.created_at,
      }));

      usersWithRoles.push(
        {
          id: "HuyPQ1",
          display_name: "HuyPQ",
          email: "huypq@vnext.vn",
          role: "admin",
          created_at: "2025-01-01",
        },
        {
          id: "PhucND1",
          display_name: "PhucND",
          email: "phucnd@vnext.vn",
          role: "user",
          created_at: "2025-01-01",
        },
        {
          id: "ThangNV1",
          display_name: "ThangNV",
          email: "thangnv@vnext.vn",
          role: "user",
          created_at: "2025-01-01",
        },
        {
          id: "AnhNQ1",
          display_name: "AnhNQ",
          email: "anhnq@vnext.vn",
          role: "user",
          created_at: "2025-01-01",
        },
        {
          id: "ThuyNVT1",
          display_name: "ThuyNVT",
          email: "thuynvt@vnext.vn",
          role: "user",
          created_at: "2025-01-01",
        },
        {
          id: "ThinhLD1",
          display_name: "ThinhLD",
          email: "thinhld@vnext.vn",
          role: "user",
          created_at: "2025-01-01",
        },
        {
          id: "NguyetLTA1",
          display_name: "NguyetLTA",
          email: "nguyetlta@vnext.vn",
          role: "user",
          created_at: "2025-01-01",
        },
        {
          id: "TrinhPP1",
          display_name: "TrinhPP",
          email: "trinhpp@vnext.vn",
          role: "user",
          created_at: "2025-01-01",
        },
        {
          id: "HueNTB1",
          display_name: "HueNTB",
          email: "huentb@vnext.vn",
          role: "user",
          created_at: "2025-01-01",
        },
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: "エラー",
        description: "ユーザーの読み込みに失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkDuplicateUserId = (userId: string): boolean => {
    return users.some((user) => user.id.toLowerCase() === userId.toLowerCase());
  };

  const validateAddForm = (): boolean => {
    const result = addUserSchema.safeParse(formData);
    const errors: AddUserErrors = {};

    if (!result.success) {
      result.error.errors.forEach((err) => {
        const path = err.path[0] as keyof AddUserErrors;
        if (!errors[path]) {
          errors[path] = err.message;
        }
      });
    }

    // Check for duplicate User ID
    if (formData.user_id && checkDuplicateUserId(formData.user_id)) {
      errors.user_id = "このユーザーIDは既に使用されています";
    }

    if (Object.keys(errors).length > 0) {
      setAddFormErrors(errors);
      return false;
    }

    setAddFormErrors({});
    return true;
  };

  const validateEditForm = (): boolean => {
    const result = editUserSchema.safeParse(editFormData);
    if (!result.success) {
      const errors: EditUserErrors = {};
      result.error.errors.forEach((err) => {
        const path = err.path[0] as keyof EditUserErrors;
        if (!errors[path]) {
          errors[path] = err.message;
        }
      });
      setEditFormErrors(errors);
      return false;
    }
    setEditFormErrors({});
    return true;
  };

  const handleAddUser = async () => {
    if (!validateAddForm()) return;

    try {
      // Note: Creating users typically requires admin privileges or an edge function
      // For now, we'll just add a role for an existing user
      toast({
        title: "情報",
        description: "新規ユーザーの追加は管理者権限が必要です。Supabase管理画面から追加してください。",
      });
      setIsAddDialogOpen(false);
      resetAddForm();
    } catch (error) {
      console.error("Error adding user:", error);
      toast({
        title: "エラー",
        description: "ユーザーの追加に失敗しました",
        variant: "destructive",
      });
    }
  };

  const resetAddForm = () => {
    setFormData({
      user_id: "",
      email: "",
      password: "",
      password_confirm: "",
      display_name: "",
      role: "user",
      is_display_user: false,
    });
    setAddFormErrors({});
  };

  const openEditDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setEditFormData({
      display_name: user.display_name || "",
      email: user.email || "",
      role: user.role || "user",
      is_display_user: false,
      password: "",
      password_confirm: "",
    });
    setEditFormErrors({});
    setIsEditDialogOpen(true);
  };

  const resetEditForm = () => {
    setEditFormData({
      display_name: "",
      email: "",
      role: "user",
      is_display_user: false,
      password: "",
      password_confirm: "",
    });
    setEditFormErrors({});
    setSelectedUser(null);
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    if (!validateEditForm()) return;

    try {
      // Update display name and email in profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ display_name: editFormData.display_name, email: editFormData.email })
        .eq("id", selectedUser.id);

      if (profileError) throw profileError;

      // Update or insert role
      if (editFormData.role) {
        // First, delete existing role
        await supabase.from("user_roles").delete().eq("user_id", selectedUser.id);

        // Insert new role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: selectedUser.id, role: editFormData.role });

        if (roleError) throw roleError;
      }

      toast({
        title: "成功",
        description: "ユーザー情報を更新しました",
      });

      setIsEditDialogOpen(false);
      resetEditForm();
      loadUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "エラー",
        description: "ユーザーの更新に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      // Delete user role
      const { error: roleError } = await supabase.from("user_roles").delete().eq("user_id", selectedUser.id);

      if (roleError) throw roleError;

      toast({
        title: "成功",
        description: "ユーザーの役割を削除しました",
      });

      setIsDeleteDialogOpen(false);
      loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "エラー",
        description: "削除に失敗しました",
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case "admin":
        return "管理者";
      case "user":
        return "ユーザー";
      default:
        return "未設定";
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(users.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentUsers = users.slice(startIndex, endIndex);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">ユーザー管理</h1>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新規追加
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ユーザーID</TableHead>
                <TableHead>表示名</TableHead>
                <TableHead>メール</TableHead>
                <TableHead>役割</TableHead>
                <TableHead>作成日</TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    読み込み中...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    ユーザーがいません
                  </TableCell>
                </TableRow>
              ) : (
                currentUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-xs">{user.id.substring(0, 8)}...</TableCell>
                    <TableCell>{user.display_name || "-"}</TableCell>
                    <TableCell>{user.email || "-"}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.role === "admin"
                            ? "bg-red-100 text-red-800"
                            : user.role === "user"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                    </TableCell>
                    <TableCell>{format(new Date(user.created_at), "yyyy/MM/dd")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(user)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2">
            <div className="text-sm text-muted-foreground">
              {startIndex + 1} - {Math.min(endIndex, users.length)} / {users.length} 件
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                前へ
              </Button>
              <div className="text-sm">
                {currentPage} / {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                次へ
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add User Dialog */}
      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetAddForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新規ユーザー追加</DialogTitle>
            <DialogDescription>新しいユーザーの情報を入力してください。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user_id">
                ユーザーID<span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="user_id"
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className={addFormErrors.user_id ? "border-red-500" : ""}
                placeholder="半角英数字のみ (3-50文字)"
              />
              {addFormErrors.user_id && <p className="text-xs text-red-500">{addFormErrors.user_id}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_name">
                表示名<span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                className={addFormErrors.display_name ? "border-red-500" : ""}
              />
              {addFormErrors.display_name && <p className="text-xs text-red-500">{addFormErrors.display_name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">
                メールアドレス<span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={addFormErrors.email ? "border-red-500" : ""}
              />
              {addFormErrors.email && <p className="text-xs text-red-500">{addFormErrors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                パスワード<span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={addFormErrors.password ? "border-red-500" : ""}
              />
              {addFormErrors.password && <p className="text-xs text-red-500">{addFormErrors.password}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password_confirm">
                パスワードを確認<span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="password_confirm"
                type="password"
                value={formData.password_confirm}
                onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                className={addFormErrors.password_confirm ? "border-red-500" : ""}
              />
              {addFormErrors.password_confirm && (
                <p className="text-xs text-red-500">{addFormErrors.password_confirm}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                役割<span className="text-red-500 ml-1">*</span>
              </Label>
              <RadioGroup
                value={formData.role}
                onValueChange={(value: AppRole) => {
                  setFormData({
                    ...formData,
                    role: value,
                    is_display_user: value === "user" ? formData.is_display_user : false,
                  });
                }}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="admin" id="role_admin" />
                  <Label htmlFor="role_admin" className="font-normal cursor-pointer">
                    管理者
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="user" id="role_user" />
                  <Label htmlFor="role_user" className="font-normal cursor-pointer">
                    一般ユーザー
                  </Label>
                </div>
              </RadioGroup>
              {addFormErrors.role && <p className="text-xs text-red-500">{addFormErrors.role}</p>}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_display_user"
                checked={formData.is_display_user}
                onCheckedChange={(checked) => setFormData({ ...formData, is_display_user: checked === true })}
                disabled={formData.role !== "user"}
              />
              <Label htmlFor="is_display_user" className={formData.role !== "user" ? "text-muted-foreground" : ""}>
                表示用ユーザー
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                resetAddForm();
              }}
            >
              キャンセル
            </Button>
            <Button onClick={handleAddUser}>追加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) resetEditForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ユーザー編集</DialogTitle>
            <DialogDescription>ユーザー情報を編集してください。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_user_id">
                ユーザーID<span className="text-red-500 ml-1">*</span>
              </Label>
              <Input id="edit_user_id" value={selectedUser?.id || ""} readOnly disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_display_name">
                表示名<span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="edit_display_name"
                value={editFormData.display_name}
                onChange={(e) => setEditFormData({ ...editFormData, display_name: e.target.value })}
                className={editFormErrors.display_name ? "border-red-500" : ""}
              />
              {editFormErrors.display_name && <p className="text-xs text-red-500">{editFormErrors.display_name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_email">
                メールアドレス<span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="edit_email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className={editFormErrors.email ? "border-red-500" : ""}
              />
              {editFormErrors.email && <p className="text-xs text-red-500">{editFormErrors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_password">パスワード</Label>
              <Input
                id="edit_password"
                type="password"
                value={editFormData.password}
                onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                placeholder="変更する場合のみ入力"
                className={editFormErrors.password ? "border-red-500" : ""}
              />
              {editFormErrors.password && <p className="text-xs text-red-500">{editFormErrors.password}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_password_confirm">パスワードを確認</Label>
              <Input
                id="edit_password_confirm"
                type="password"
                value={editFormData.password_confirm}
                onChange={(e) => setEditFormData({ ...editFormData, password_confirm: e.target.value })}
                placeholder="変更する場合のみ入力"
                className={editFormErrors.password_confirm ? "border-red-500" : ""}
              />
              {editFormErrors.password_confirm && (
                <p className="text-xs text-red-500">{editFormErrors.password_confirm}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                役割<span className="text-red-500 ml-1">*</span>
              </Label>
              <RadioGroup
                value={editFormData.role}
                onValueChange={(value: AppRole) => {
                  setEditFormData({
                    ...editFormData,
                    role: value,
                    is_display_user: value === "user" ? editFormData.is_display_user : false,
                  });
                }}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="admin" id="edit_role_admin" />
                  <Label htmlFor="edit_role_admin" className="font-normal cursor-pointer">
                    管理者
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="user" id="edit_role_user" />
                  <Label htmlFor="edit_role_user" className="font-normal cursor-pointer">
                    一般ユーザー
                  </Label>
                </div>
              </RadioGroup>
              {editFormErrors.role && <p className="text-xs text-red-500">{editFormErrors.role}</p>}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit_is_display_user"
                checked={editFormData.is_display_user}
                onCheckedChange={(checked) => setEditFormData({ ...editFormData, is_display_user: checked === true })}
                disabled={editFormData.role !== "user"}
              />
              <Label
                htmlFor="edit_is_display_user"
                className={editFormData.role !== "user" ? "text-muted-foreground" : ""}
              >
                表示用ユーザー
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                resetEditForm();
              }}
            >
              キャンセル
            </Button>
            <Button onClick={handleEditUser}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>削除の確認</AlertDialogTitle>
            <AlertDialogDescription>
              このユーザーを削除してもよろしいですか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser}>削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default UserManagement;
