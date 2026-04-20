/**
 * 模型设置页面
 */
import { PageContainer } from '@ant-design/pro-components';
import React from 'react';
import ApiConfigSection from './components/ApiConfigSection';
import ModelConfigList from './components/ModelConfigList';

const ModelSettings: React.FC = () => {
  return (
    <PageContainer title="模型设置">
      <div className="space-y-6">
        {/* API 配置卡片区域 */}
        <ApiConfigSection />

        {/* 已配置的模型列表 */}
        <ModelConfigList />
      </div>
    </PageContainer>
  );
};

export default ModelSettings;
