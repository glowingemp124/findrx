import type { ComponentProps } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

export const textLinkClass = "font-semibold text-accent-text underline-offset-2 hover:underline";

export function TextLink({ className, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props} className={cn(textLinkClass, className)} />;
}
