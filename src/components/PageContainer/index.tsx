import { PageContainer, type PageContainerProps } from '@ant-design/pro-components';
import { useResourceContext } from '@/contexts/resource';
import { useLocation } from 'react-router';
import React, { useCallback, useMemo } from 'react';
import type { IResourceItem } from '@/types/resource';

type JPageContainerProps = PageContainerProps & {
  children?: React.ReactNode;
};
const JPageContainer: React.FC<JPageContainerProps> = ({ children, ...props }) => {
  const { resources } = useResourceContext();
  const location = useLocation();

  const resource = useMemo(
    () => resources.find((item) => item.list === location.pathname),
    [location.pathname, resources],
  );

  const buildHierarchy = useCallback(
    (res?: IResourceItem): IResourceItem[] => {
      if (!res) return [];
      const parent = resources.find((r) => r.name === res.meta?.parent);
      return [...buildHierarchy(parent), res];
    },
    [resources],
  );

  const breadcrumb = useMemo(() => {
    if (!resource) {
      return {
        items: [{ title: '首页', href: '/' }],
      };
    }
    const hierarchy = buildHierarchy(resource);
    const breadcrumbItems = hierarchy.map((res) => ({
      title: res.meta?.label || res.name,
      href: res.list ? `/${res.name}` : undefined,
    }));
    return {
      items: [{ title: '首页', href: '/' }, ...breadcrumbItems],
    };
  }, [resource, buildHierarchy]);

  return (
    <PageContainer breadcrumb={breadcrumb} {...props}>
      {children}
    </PageContainer>
  );
};

export default JPageContainer;
