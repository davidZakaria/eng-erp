'use client';

import { useState } from 'react';
import { DrawingUploader } from '@/components/drawings/DrawingUploader';
import { DrawingRegister } from '@/components/drawings/DrawingRegister';

export default function ConsultantDashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-8">
      <DrawingUploader onUploaded={() => setRefreshKey((k) => k + 1)} />
      <DrawingRegister key={refreshKey} />
    </div>
  );
}
