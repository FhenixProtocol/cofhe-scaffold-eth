export interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  canProceed: boolean;
  isActive: boolean;
}

export interface WalkthroughStepConfig {
  id: string;
  title: string;
  header: string;
  description: string;
  component?: React.ComponentType<any>;
  checkProgression: () => boolean;
  errorMessage?: string;
}

export type WalkthroughStepId =
  | "getting-started"
  | "select-amount"
  | "encrypt-input"
  | "create-order"
  | "wait-decryption"
  | "execute-order"
  | "view-transaction";
