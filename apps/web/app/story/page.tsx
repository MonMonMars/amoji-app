'use client';
// Legacy /story URL — mode chips live on /select now (in-place). Soft-land on select story board.
import SoftLandSelect from '../../components/SoftLandSelect';

export default function StoryRedirect() {
  return <SoftLandSelect seedSelectMode="story" labelKey="softLandStory" />;
}
