import type { ComponentProps } from "react";
import { PageHeader as BasePageHeader } from "@/components/layout/page-header";

export { LiveDot } from "@/components/layout/page-header";

export function PageHeader(props: Omit<ComponentProps<typeof BasePageHeader>, "brand">) {
  return <BasePageHeader brand="FindRx for Pharmacies" {...props} />;
}
