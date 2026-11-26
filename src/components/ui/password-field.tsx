import { useState, type ComponentProps } from "react";
import { TextField } from "@/components/ui/field";

type PasswordFieldProps = Omit<ComponentProps<typeof TextField>, "type" | "trailing">;

/** Text field with a Show/Hide toggle. */
export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      // Urbanist draws password dots as specks; see .password-mask in index.css.
      className={visible ? props.className : `password-mask ${props.className ?? ""}`.trim()}
      trailing={
        <button
          type="button"
          aria-pressed={visible}
          className="cursor-pointer rounded-full px-1.5 text-xs font-semibold text-ink-2 hover:text-ink"
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? "Hide" : "Show"}
        </button>
      }
    />
  );
}
