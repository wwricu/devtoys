import type { ReactNode } from "react";
import RememberTool from "@/components/RememberTool";
import ToolHeader from "@/components/ToolHeader";

/** Title bar plus the tool body, shared by every generated tool route. */
export default function ToolShell({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <RememberTool id={id} />
      <ToolHeader id={id} />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
