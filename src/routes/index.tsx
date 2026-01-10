import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from '@/pages/Home';
import About from '@/pages/About';
import { DynamicFormExamples } from '@/pages/DynamicFormExamples';
import WorkflowExecutionHistoryExample from '@/pages/examples/WorkflowExecutionHistoryExample';
import { VirtualScrollExample } from '@/pages/examples/VirtualScrollExample';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/dynamic-form" element={<DynamicFormExamples />} />
        <Route path="/workflow-history" element={<WorkflowExecutionHistoryExample />} />
        <Route path="/virtual-scroll" element={<VirtualScrollExample />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
