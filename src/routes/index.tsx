import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from '@/pages/Home';
import About from '@/pages/About';
import { DynamicFormExamples } from '@/pages/DynamicFormExamples';
import WorkflowExecutionHistoryExample from '@/pages/examples/WorkflowExecutionHistoryExample';
import AgentNodeTestExample from '@/pages/examples/AgentNodeTestExample';
import { VirtualScrollExample } from '@/pages/examples/VirtualScrollExample';
import { MemoPerformanceTest } from '@/pages/examples/PerformanceTest/MemoPerformanceTest';
import DynamicIconExample from '@/pages/examples/DynamicIconExample';
import { AsyncSchemaLinkageExample } from '@/pages/examples/NestedForm/AsyncSchemaLinkageExample';
import { ErrorScrollExample } from '@/pages/examples/ErrorScrollExample';
import { RefreshLinkageExample } from '@/pages/examples/RefreshLinkageExample';
import { KeyValueArrayExample } from '@/pages/examples/KeyValueArrayExample';
import { TableArrayExample } from '@/pages/examples/TableArrayExample';
import { CategoryActionExample } from '@/pages/examples/CategoryActionExample';
import { MultipleLinkagesExample } from '@/pages/examples/MultipleLinkagesExample';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/dynamic-form" element={<DynamicFormExamples />} />
        <Route path="/workflow-history" element={<WorkflowExecutionHistoryExample />} />
        <Route path="/agent-node-test" element={<AgentNodeTestExample />} />
        <Route path="/virtual-scroll" element={<VirtualScrollExample />} />
        <Route path="/memo-performance" element={<MemoPerformanceTest />} />
        <Route path="/dynamic-icon" element={<DynamicIconExample />} />
        <Route path="/async-schema-linkage" element={<AsyncSchemaLinkageExample />} />
        <Route path="/error-scroll" element={<ErrorScrollExample />} />
        <Route path="/refresh-linkage" element={<RefreshLinkageExample />} />
        <Route path="/key-value-array" element={<KeyValueArrayExample />} />
        <Route path="/table-array" element={<TableArrayExample />} />
        <Route path="/category-action" element={<CategoryActionExample />} />
        <Route path="/multiple-linkages" element={<MultipleLinkagesExample />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
