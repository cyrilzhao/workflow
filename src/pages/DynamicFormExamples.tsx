import React, { useState } from 'react';
import { Tabs, Tab } from '@blueprintjs/core';
import '@blueprintjs/core/lib/css/blueprint.css';

// 基础表单
import { BasicFormPanel } from './examples/BasicForm/BasicFormPanel';

// 条件渲染
import { ConditionalFormPanel } from './examples/ConditionalForm/ConditionalFormPanel';

// 嵌套表单
import { StaticNestedExample } from './examples/NestedForm/StaticNestedExample';
import { DynamicNestedExample } from './examples/NestedForm/DynamicNestedExample';
import { JsonPointerNestedExample } from './examples/NestedForm/JsonPointerNestedExample';

// 路径透明化
import { BasicFlattenExample } from './examples/FlattenPath/BasicFlattenExample';
import { WithPrefixFlattenExample } from './examples/FlattenPath/WithPrefixFlattenExample';
import { MultiLevelPrefixExample } from './examples/FlattenPath/MultiLevelPrefixExample';
import { MixedFlattenExample } from './examples/FlattenPath/MixedFlattenExample';
import { NestedWithFlattenExample } from './examples/FlattenPath/NestedWithFlattenExample';

// 复杂场景
import { ComplexFormPanel } from './examples/ComplexForm/ComplexFormPanel';

export const DynamicFormExamples: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('basic');

  return (
    <div style={{ padding: '20px' }}>
      <h1>动态表单示例</h1>
      <Tabs selectedTabId={selectedTab} onChange={id => setSelectedTab(id as string)}>
        <Tab id="basic" title="基础表单" panel={<BasicFormPanel />} />
        <Tab id="conditional" title="条件渲染" panel={<ConditionalFormPanel />} />
        <Tab id="nested" title="嵌套表单" panel={<NestedFormPanel />} />
        <Tab id="flatten" title="路径透明化" panel={<FlattenPathPanel />} />
        <Tab id="complex" title="复杂场景" panel={<ComplexFormPanel />} />
      </Tabs>
    </div>
  );
};

const NestedFormPanel: React.FC = () => {
  const [selectedExample, setSelectedExample] = useState('static');

  return (
    <div style={{ marginTop: '20px' }}>
      <Tabs selectedTabId={selectedExample} onChange={id => setSelectedExample(id as string)}>
        <Tab id="static" title="静态嵌套" panel={<StaticNestedExample />} />
        <Tab id="dynamic" title="动态嵌套" panel={<DynamicNestedExample />} />
        <Tab id="jsonPointer" title="JSON Pointer 跨层级" panel={<JsonPointerNestedExample />} />
      </Tabs>
    </div>
  );
};

const FlattenPathPanel: React.FC = () => {
  const [selectedExample, setSelectedExample] = useState('basic');

  return (
    <div style={{ marginTop: '20px' }}>
      <Tabs selectedTabId={selectedExample} onChange={id => setSelectedExample(id as string)}>
        <Tab id="basic" title="基础用法" panel={<BasicFlattenExample />} />
        <Tab id="withPrefix" title="带前缀" panel={<WithPrefixFlattenExample />} />
        <Tab id="multiLevel" title="多层前缀" panel={<MultiLevelPrefixExample />} />
        <Tab id="mixed" title="混合使用" panel={<MixedFlattenExample />} />
        <Tab id="nestedWithFlatten" title="嵌套表单+透明化" panel={<NestedWithFlattenExample />} />
      </Tabs>
    </div>
  );
};
