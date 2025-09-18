import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Government Subsidy Platform',
  projectId: 'fb1327641b5bfb8914b3adbfe7ffbcf5',
  chains: [sepolia],
  ssr: false, // If your dApp uses server side rendering (SSR)
});