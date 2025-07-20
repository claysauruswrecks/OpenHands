import React, { createContext, useContext, useState, useCallback } from "react";

interface ExpandCollapseContextType {
  expandAllState: boolean | null; // null = individual control, true = expand all, false = collapse all
  setExpandAll: () => void;
  setCollapseAll: () => void;
  setIndividualOverride: (componentId: string) => void;
  shouldShowDetails: (defaultValue: boolean, componentId: string) => boolean;
}

const ExpandCollapseContext = createContext<ExpandCollapseContextType | null>(
  null,
);

export function useExpandCollapse() {
  const context = useContext(ExpandCollapseContext);
  if (!context) {
    throw new Error(
      "useExpandCollapse must be used within an ExpandCollapseProvider",
    );
  }
  return context;
}

interface ExpandCollapseProviderProps {
  children: React.ReactNode;
}

export function ExpandCollapseProvider({
  children,
}: ExpandCollapseProviderProps) {
  const [expandAllState, setExpandAllState] = useState<boolean | null>(null);
  const [individualOverrides, setIndividualOverrides] = useState<Set<string>>(
    new Set(),
  );

  const setExpandAll = useCallback(() => {
    setExpandAllState(true);
    setIndividualOverrides(new Set()); // Clear all individual overrides
  }, []);

  const setCollapseAll = useCallback(() => {
    setExpandAllState(false);
    setIndividualOverrides(new Set()); // Clear all individual overrides
  }, []);

  const setIndividualOverride = useCallback((componentId: string) => {
    setIndividualOverrides((prev) => new Set([...prev, componentId]));
  }, []);

  const shouldShowDetails = useCallback(
    (defaultValue: boolean, componentId: string) => {
      // If this component has been individually overridden, use its local state
      if (individualOverrides.has(componentId)) {
        return defaultValue;
      }
      // If expand/collapse all is active, use that state
      if (expandAllState !== null) {
        return expandAllState;
      }
      // Otherwise, use the component's default/individual state
      return defaultValue;
    },
    [expandAllState, individualOverrides],
  );

  return (
    <ExpandCollapseContext.Provider
      value={{
        expandAllState,
        setExpandAll,
        setCollapseAll,
        setIndividualOverride,
        shouldShowDetails,
      }}
    >
      {children}
    </ExpandCollapseContext.Provider>
  );
}
