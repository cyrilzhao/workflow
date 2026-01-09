import React, { createContext, useContext } from 'react';

/**
 * Widgets Context
 * 用于在整个表单树中共享自定义 widgets
 */
interface WidgetsContextValue {
  widgets: Record<string, React.ComponentType<any>>;
}

const WidgetsContext = createContext<WidgetsContextValue | null>(null);

/**
 * Widgets Provider
 */
export const WidgetsProvider: React.FC<{
  widgets?: Record<string, React.ComponentType<any>>;
  children: React.ReactNode;
}> = ({ widgets = {}, children }) => {
  return (
    <WidgetsContext.Provider value={{ widgets }}>
      {children}
    </WidgetsContext.Provider>
  );
};

/**
 * 获取 widgets（可选）
 * 如果没有 Provider，返回 null
 */
export const useWidgetsOptional = (): Record<string, React.ComponentType<any>> | null => {
  const context = useContext(WidgetsContext);
  return context?.widgets || null;
};

/**
 * 获取 widgets（必需）
 * 如果没有 Provider，返回空对象
 */
export const useWidgets = (): Record<string, React.ComponentType<any>> => {
  const context = useContext(WidgetsContext);
  return context?.widgets || {};
};
