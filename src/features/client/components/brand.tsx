import { Link } from "react-router-dom";
import { paths } from "@/app/paths";
import { Logo } from "@/components/brand/logo";

export function Brand() {
  return (
    <Link to={paths.client.home} aria-label="FindRx home" className="flex h-9 items-center">
      <Logo className="h-9" alt="" />
    </Link>
  );
}
