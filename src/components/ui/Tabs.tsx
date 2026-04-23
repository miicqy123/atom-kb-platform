import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined);

const Tabs = ({
  value,
  onValueChange,
  defaultValue,
  className,
  ...props
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
} & React.HTMLAttributes<HTMLDivElement>) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '');

  const contextValue = React.useMemo(() => ({
    value: value ?? internalValue,
    onValueChange: onValueChange || ((newValue: string) => setInternalValue(newValue))
  }), [value, onValueChange, internalValue]);

  return (
    <TabsContext.Provider value={contextValue}>
      <div
        className={cn("relative w-full", className)}
        {...props}
      />
    </TabsContext.Provider>
  );
};
Tabs.displayName = "Tabs";

const useTabs = () => {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within <Tabs>");
  }
  return context;
};

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, onClick, ...props }, ref) => {
  const { value: currentValue, onValueChange } = useTabs();
  const isSelected = currentValue === value;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onValueChange(value);
    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isSelected
          ? "bg-background text-foreground shadow-sm"
          : "hover:bg-muted hover:text-muted-foreground",
        className
      )}
      onClick={handleClick}
      data-state={isSelected ? "active" : "inactive"}
      {...props}
    />
  );
});
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, ...props }, ref) => {
  const { value: currentValue } = useTabs();
  const isVisible = currentValue === value;

  if (!isVisible) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  );
});
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };