import { ProTable } from '@ant-design/pro-components';
import type { ProTableProps } from '@ant-design/pro-table';
import type { SearchConfig } from '@ant-design/pro-table/es/components/Form/FormRender';
import type { SizeType } from 'antd/es/config-provider/SizeContext';
import React, { useCallback, useState } from 'react';
import styles from './index.module.css';

export { default as ColumnEllipsisWrap } from './ColumnEllipsisWrap';

export type CommonTableProps<T, U> = ProTableProps<T, U> & {
  // 一个无用的占位符， @typescript-eslint/no-empty-interface
  zhanwei?: string;
};

const scroll: { x: true } = { x: true };

const search: SearchConfig = { labelWidth: 'auto', defaultCollapsed: false };

const CommonTable = <
  T extends Record<string, unknown> = Record<string, unknown>,
  U extends Record<string, unknown> = Record<string, never>,
>(
  props: CommonTableProps<T, U>,
) => {
  const [size, setSize] = useState<SizeType>('large');

  const handleSizeChange = useCallback((s: SizeType) => setSize(s), []);

  return (
    <ProTable<T, U>
      className={styles.table || ''}
      scroll={scroll}
      search={search}
      sticky
      rowKey="id"
      tableAlertRender={false}
      rowSelection={false}
      columnEmptyText="--"
      size={size}
      onSizeChange={handleSizeChange}
      {...props}
    />
  );
};

const MemodCommonTable = React.memo(CommonTable) as typeof CommonTable;

export default MemodCommonTable;
