import { cva, type VariantProps } from "class-variance-authority";
import { useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Button styles, also for links that should look like buttons (never nest a <button> in an <a>). */
export const buttonStyles = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-[background-color,color,transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-ink hover:brightness-110",
        secondary:
          "bg-card text-ink shadow-raise ring-1 ring-line-strong hover:bg-side-hover",
        ink: "bg-ink text-card hover:opacity-90",
        ghost: "bg-transparent text-ink-2 hover:bg-side-hover",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-md",
        lg: "h-11 px-5 text-base",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles> & {
    icon?: ReactNode;
    iconRight?: ReactNode;
    /** Lean toward the pointer. Fine pointers only. */
    magnetic?: boolean;
  };

function canLean() {
  return (
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function Button({
  className,
  variant,
  size,
  icon,
  iconRight,
  magnetic = false,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonStyles({ variant, size }), magnetic && "will-change-transform", className)}
      onPointerMove={(event) => {
        props.onPointerMove?.(event);
        const node = ref.current;
        if (!magnetic || !node || !canLean()) return;
        const rect = node.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * 0.2;
        const y = (event.clientY - rect.top - rect.height / 2) * 0.28;
        node.style.transform = `translate(${x}px, ${y}px)`;
      }}
      onPointerLeave={(event) => {
        props.onPointerLeave?.(event);
        if (ref.current) ref.current.style.transform = "";
      }}
      {...props}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  );
}

export function IconButton({
  className,
  label,
  children,
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "inline-grid cursor-pointer place-items-center rounded-full text-ink-2 transition-colors hover:bg-side-hover hover:text-ink",
        size === "sm" ? "size-8" : "size-10",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
