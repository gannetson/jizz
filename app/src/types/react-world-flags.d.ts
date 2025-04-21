declare module 'react-world-flags' {
  import { ComponentType } from 'react';

  interface FlagProps {
    code: string;
    style?: React.CSSProperties;
    className?: string;
  }

  const Flag: ComponentType<FlagProps>;
  export default Flag;
} 