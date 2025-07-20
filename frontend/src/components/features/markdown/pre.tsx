import React from "react";
import { ExtraProps } from "react-markdown";

/**
 * Custom pre component that prevents nested pre tags
 */
export function pre({
  children,
  className,
  ...props
}: React.ClassAttributes<HTMLPreElement> &
  React.HTMLAttributes<HTMLPreElement> &
  ExtraProps) {
  // Check if children contains a pre tag (to prevent double nesting)
  const childrenArray = React.Children.toArray(children);
  const hasNestedPre = childrenArray.some((child) => {
    if (React.isValidElement(child)) {
      return child.type === "pre" || child.props?.mdxType === "pre";
    }
    return false;
  });

  // If there's a nested pre, just render the children directly
  if (hasNestedPre) {
    return <>{children}</>;
  }

  // Always render pre as-is to preserve code structure for syntax highlighting
  // The code component will handle minification and styling
  return (
    <pre className={className} {...props}>
      {children}
    </pre>
  );
}
