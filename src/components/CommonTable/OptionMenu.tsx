import React from 'react'
import DownOutlined from '@ant-design/icons/DownOutlined'
import { Divider, Dropdown, type MenuProps } from 'antd'
import styles from './OptionMenu.module.css'

type OptionMenuProps = {
  maxLen?: number
  children: React.ReactNode
}
const OptionMenu: React.FC<OptionMenuProps> = ({ maxLen = 2, ...props }) => {
  const children = (
    Array.isArray(props.children) ? props.children : [props.children]
  )?.filter?.((child) => React.isValidElement(child))

  if (children && children.length > maxLen) {
    const [first, ...others] = children

    const items: MenuProps['items'] = []
    //  = React.Children.map(others, (child) => {
    //   return {
    //     key: child.key as string,
    //     label: child,
    //   };
    // });
    React.Children.forEach(others, (child) => {
      items?.push({
        key: child.key as string,
        label: child,
        type: 'item',
      })
      // if (idx < others.length - 1) {
      //   items?.push({
      //     type: 'divider',
      //   });
      // }
    })
    return [
      first,
      <Divider key="divider1" type="vertical" />,
      <Dropdown key="dropdown" menu={{ items }} overlayClassName={styles.menu}>
        <a>
          更多 <DownOutlined />
        </a>
      </Dropdown>,
    ]
  }
  const [first, second, third] = children

  return (
    <>
      {first}
      {second && <Divider key="divider1" type="vertical" />}
      {second}
      {third && <Divider key="divider1" type="vertical" />}
      {third}
    </>
  )
}

export default OptionMenu
