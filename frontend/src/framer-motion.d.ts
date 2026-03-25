import 'framer-motion';

// Augment framer-motion types to accept broader transition types
declare module 'framer-motion' {
  interface TransitionProps {
    ease?: string | number[] | [number, number, number, number];
  }
}
