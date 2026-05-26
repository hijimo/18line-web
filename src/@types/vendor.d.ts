declare module '@ant-design/pro-components' {
  import type React from 'react';

  export type PageContainerProps = Record<string, TODO>;
  export const PageContainer: React.FC<PageContainerProps>;
  export const ProLayout: React.FC<Record<string, TODO>>;
  export const ProTable: <T, U>(props: ProTableProps<T, U>) => React.ReactElement;
}

declare module '@ant-design/pro-table' {
  export type ProColumns<T = Record<string, TODO>> = Record<string, TODO> & {
    __recordType?: T;
    render?: (...args: TODO[]) => React.ReactNode;
    renderText?: (...args: TODO[]) => React.ReactNode;
  };

  export type ProTableProps<T, U> = Record<string, TODO> & {
    __recordType?: T;
    __paramsType?: U;
  };
}

declare module '@ant-design/pro-utils/es/typing' {
  export type ProCoreActionType = {
    pageInfo?: {
      current: number;
      pageSize: number;
    };
  };
}

declare module '@ant-design/pro-table/es/components/Form/FormRender' {
  export type SearchConfig = {
    labelWidth?: 'auto' | number;
    defaultCollapsed?: boolean;
  };
}

declare module 'js-cookie' {
  const Cookies: {
    get: (name: string) => string | undefined;
    set: (name: string, value: string, options?: Record<string, TODO>) => void;
    remove: (name: string, options?: Record<string, TODO>) => void;
  };

  export default Cookies;
}
