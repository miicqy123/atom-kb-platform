import * as React from "react";

export interface ToastProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  variant?: "default" | "destructive";
}

export type ToastActionElement = React.ReactElement;
