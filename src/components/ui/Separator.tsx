import * as React from "react";
import { cn } from "@/lib/utils";

const Separator = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn("shrink-0 bg-border", className)}
      {...props}
    />
  );
};

export { Separator };