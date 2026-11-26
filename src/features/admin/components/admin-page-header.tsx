import type { ComponentProps } from "react";
import { PageHeader } from "@/components/layout/page-header";

export function AdminPageHeader(props: Omit<ComponentProps<typeof PageHeader>, "brand">) {
  return <PageHeader brand="FindRx Admin" {...props} />;
}
