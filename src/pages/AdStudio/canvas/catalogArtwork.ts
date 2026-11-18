export const projectWorkspaceArtworkId = "nxclip-catalog-project-workspace-office-v1";

export function catalogArtworkUrl(assetId: string): string | undefined {
  if (assetId === projectWorkspaceArtworkId) return "/ad-studio/sample-assets/project-workspace-office.jpg";
}
