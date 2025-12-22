import StartNode from './StartNode';
import EndNode from './EndNode';
import LoopNode from './LoopNode';
import SwitchNode from './SwitchNode';

export const nodeTypes = {
  start: StartNode,
  end: EndNode,
  loop: LoopNode,
  switch: SwitchNode,
};

export { StartNode, EndNode, LoopNode, SwitchNode };
