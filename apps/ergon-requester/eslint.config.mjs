import nx from '@nx/eslint-plugin';
import base from '../../eslint.config.mjs';
export default [...base, ...nx.configs['flat/react']];
