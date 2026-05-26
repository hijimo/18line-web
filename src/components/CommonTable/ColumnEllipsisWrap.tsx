import classNames from 'classnames';
import React from 'react';
import styles from './ColumnEllipsisWrap.module.css';

export type ColumnEllipsisWrapProps = {
  className?: string;
  width?: string | number;
  children?: React.ReactNode;
};

const ColumnEllipsisWrap: React.FC<ColumnEllipsisWrapProps> = ({
  className,
  width = 200,
  children,
}) => {
  return (
    <div className={classNames(styles.wrap, className)} style={{ width }}>
      {children ?? '--'}
    </div>
  );
};

export default ColumnEllipsisWrap;
