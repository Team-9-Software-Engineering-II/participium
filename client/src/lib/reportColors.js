// Colori standardizzati per gli status dei report in tutto il sistema
// Aggiornato: 9 dicembre 2025
// Status permessi: Pending Approval, Assigned, In Progress, Resolved, Rejected, Suspended

export const REPORT_STATUS_COLORS = {
  // Pending Approval - Azzurro
  'Pending Approval': {
    hex: '#3B82F6', // blue-500
    tailwind: 'bg-blue-500',
    tailwindDark: 'bg-blue-600',
    label: 'Pending Approval'
  },
  
  // Assigned - Arancione
  'Assigned': {
    hex: '#F97316', // orange-500
    tailwind: 'bg-orange-500',
    tailwindDark: 'bg-orange-600',
    label: 'Assigned'
  },
  
  // In Progress - Giallo fluo
  'In Progress': {
    hex: '#FACC15', // yellow-400
    tailwind: 'bg-yellow-400',
    tailwindDark: 'bg-yellow-400',
    label: 'In Progress'
  },
  
  // Resolved - Verde
  'Resolved': {
    hex: '#22C55E', // green-500
    tailwind: 'bg-green-500',
    tailwindDark: 'bg-green-600',
    label: 'Resolved'
  },
  
  // Rejected - Rosso
  'Rejected': {
    hex: '#EF4444', // red-500
    tailwind: 'bg-red-500',
    tailwindDark: 'bg-red-600',
    label: 'Rejected'
  },
  
  // Suspended - Grigio
  'Suspended': {
    hex: '#6B7280', // gray-500
    tailwind: 'bg-gray-500',
    tailwindDark: 'bg-gray-600',
    label: 'Suspended'
  }
};

// Helper function per ottenere il colore Tailwind di uno status
export const getStatusColor = (status, variant = 'default') => {
  const statusInfo = REPORT_STATUS_COLORS[status];
  if (!statusInfo) return 'bg-gray-500';
  
  return variant === 'dark' ? statusInfo.tailwindDark : statusInfo.tailwind;
};

// Helper function per ottenere il colore hex di uno status (per la mappa)
export const getStatusHex = (status) => {
  const statusInfo = REPORT_STATUS_COLORS[status];
  return statusInfo?.hex || '#6B7280'; // Default: gray
};

// Oggetto per MapView (compatibilità retroattiva)
export const REPORT_STATUS = Object.entries(REPORT_STATUS_COLORS).reduce((acc, [key, value]) => {
  acc[key] = {
    color: value.hex,
    label: value.label,
    icon: '●'
  };
  return acc;
}, {});
