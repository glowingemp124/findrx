import { useState } from "react";
import { Icon } from "@/components/icons";
import { DataTable } from "@/components/data-table/data-table";
import type { DataTableColumn } from "@/components/data-table/types";
import { useClientTable } from "@/components/data-table/use-client-table";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { CheckboxControl } from "@/components/ui/checkbox";
import { Notice } from "@/components/ui/notice";
import { adminAuth } from "@/features/admin/auth/admin-auth-service";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { CreateStaffDialog, EditStaffDialog } from "@/features/admin/components/staff-dialogs";
import { PERMISSIONS, type AdminSession } from "@/features/admin/types";
import { formatUsPhone } from "@/features/requests/lib/formatters";
import { useToast } from "@/lib/toast";

export function StaffPage() {
  const team = adminAuth.useTeam();
  const { push } = useToast();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminSession | null>(null);

  const columns: DataTableColumn<AdminSession>[] = [
    {
      id: "person",
      header: "Person",
      sortValue: (row) => `${row.role === "owner" ? 0 : 1}${row.name}`,
      cell: (row) => (
        <div className="flex min-w-[240px] items-start gap-3">
          <Avatar name={row.name} src={row.avatar} size="lg" />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              {row.name}
              {row.role === "owner" ? <Badge tone="muted">Owner</Badge> : null}
              {!row.active ? <Badge tone="warn">Deactivated</Badge> : null}
            </p>
            <p className="text-sm text-muted">{row.email}</p>
            <p className="mt-1 text-xs text-muted">
              {row.role === "owner" ? "Every permission" : `${row.permissions.length} of ${PERMISSIONS.length} permissions`} ·{" "}
              <span className="tabular-nums">{formatUsPhone(row.phone)}</span>
            </p>
          </div>
        </div>
      ),
    },
    ...PERMISSIONS.map<DataTableColumn<AdminSession>>((permission) => ({
      id: permission.id,
      header: permission.label,
      headerAlign: "center",
      cell: (row) => {
        const owner = row.role === "owner";
        return (
          <div className="flex justify-center">
            <CheckboxControl
              checked={owner || row.permissions.includes(permission.id)}
              disabled={owner || !row.active}
              ariaLabel={`${permission.label} for ${row.name}`}
              title={owner ? "The Owner always has every permission" : permission.description}
              onChange={(checked) => {
                adminAuth.setPermission(row.id, permission.id, checked);
                push(`${permission.label} ${checked ? "granted to" : "removed from"} ${row.name}.`);
              }}
            />
          </div>
        );
      },
    })),
    {
      id: "edit",
      header: "",
      align: "right",
      cell: (row) =>
        row.role === "owner" ? null : (
          <IconButton label={`Edit ${row.name}`} size="sm" onClick={() => setEditing(row)}>
            <Icon name="pencil" className="size-4" />
          </IconButton>
        ),
    },
  ];

  const table = useClientTable(team, {
    columns,
    searchText: (row) => `${row.name} ${row.email} ${row.phone}`,
    filters: [
      {
        id: "status",
        label: "Status",
        options: [
          { value: "", label: "Everyone" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Deactivated" },
        ],
        matches: (row, value) => row.active === (value === "active"),
      },
    ],
  });

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Staff"
        subtitle="Six permissions decide what each person can open. Only the Owner can change them."
        action={
          <Button variant="primary" size="lg" icon={<Icon name="plus" className="size-4" />} onClick={() => setCreating(true)}>
            Add staff member
          </Button>
        }
      />
      <DataTable
        label="Staff and permissions"
        table={table}
        columns={columns}
        getRowId={(row) => row.id}
        searchPlaceholder="Search name, email or phone"
        emptyTitle="No one matches"
      />
      <Notice tone="accent" icon="shield">
        The Owner always holds every permission. Permission changes apply immediately; a staff member sees only the modules
        they're allowed.
      </Notice>
      <CreateStaffDialog open={creating} onClose={() => setCreating(false)} />
      <EditStaffDialog member={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
