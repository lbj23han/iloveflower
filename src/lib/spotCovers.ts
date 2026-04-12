import type { FlowerSpotMapItem, FlowerSpotWithDetails } from "@/types";

type SpotForCover = Pick<FlowerSpotWithDetails | FlowerSpotMapItem, "cover_image_url"> & {
  report_image_urls?: string[];
};

export function getSpotCoverImage(
  spot: SpotForCover,
  reviewImages: string[] = [],
) {
  if (spot.cover_image_url) return spot.cover_image_url;

  const reportImage = spot.report_image_urls?.find(Boolean);
  if (reportImage) return reportImage;

  const reviewImage = reviewImages.find(Boolean);
  if (reviewImage) return reviewImage;

  return null;
}
