import React, { useCallback, useMemo } from 'react'
import {
  PageContainer,
  type PageContainerProps,
} from '@ant-design/pro-components'
import { useResource } from '@refinedev/core'
import type { IResourceItem } from '@refinedev/core'

type JPageContainerProps = PageContainerProps & {
  children?: React.ReactNode
}
const JPageContainer: React.FC<JPageContainerProps> = ({
  children,
  ...props
}) => {
  const { resource, resources } = useResource()

  const buildHierarchy = useCallback(
    (res?: IResourceItem): IResourceItem[] => {
      if (!res) return []
      const parent = resources.find((r) => r.name === res.meta?.parent)
      return [...buildHierarchy(parent), res]
    },
    [resources],
  )

  const breadcrumb = useMemo(() => {
    if (!resource) {
      return {
        items: [{ title: '首页', href: '/' }],
      }
    }
    const hierarchy = buildHierarchy(resource)
    const breadcrumbItems = hierarchy.map((res) => ({
      title: res.meta?.label || res.label || res.name,
      href: res.list ? `/${res.name}` : undefined,
    }))
    return {
      items: [{ title: '首页', href: '/' }, ...breadcrumbItems],
    }
  }, [resource, buildHierarchy])

  return (
    <PageContainer breadcrumb={breadcrumb} {...props}>
      {children}
    </PageContainer>
  )
}

export default JPageContainer
