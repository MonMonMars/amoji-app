'use client';
// Legacy /mode URL — mode chips live on /select now (in-place chat/story/kid).
// Soft-land so Pages bookmarks + old SW shells do not 404 after #103 removed /mode.
import SoftLandSelect from '../../components/SoftLandSelect';

export default function ModeRedirect() {
  return <SoftLandSelect label="Taking you to character select..." />;
}
