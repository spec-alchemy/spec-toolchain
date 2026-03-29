export const SHARED_KERNEL_EXTENSION_POINT_STATUS = [
  "reserved",
  "candidate"
] as const;

export type SharedKernelExtensionPointStatus =
  (typeof SHARED_KERNEL_EXTENSION_POINT_STATUS)[number];

export interface SharedKernelArtifactContract {
  kind: string;
  status: SharedKernelExtensionPointStatus;
}

export interface SharedKernelFamilyContract {
  family: string;
  artifactContracts?: readonly SharedKernelArtifactContract[];
}
