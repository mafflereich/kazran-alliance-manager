export const getTierColor = (tier: number) => {
  switch (tier) {
    case 1: return 'bg-orange-100 text-orange-800 border-orange-200';
    case 2: return 'bg-blue-100 text-blue-800 border-blue-200';
    case 3: return 'bg-stone-200 text-stone-800 border-stone-300';
    case 4: return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-stone-100 text-stone-800 border-stone-200';
  }
};

export const getTierTextColorDark = (tier: number) => {
  switch (tier) {
    case 1: return 'text-orange-400';
    case 2: return 'text-blue-400';
    case 3: return 'text-stone-400';
    case 4: return 'text-green-400';
    default: return 'text-stone-500';
  }
};

export const getTierHighlightClass = (tier: number) => {
  switch (tier) {
    case 1: return 'bg-orange-500/10 text-orange-500';
    case 2: return 'bg-blue-500/10 text-blue-500';
    case 3: return 'bg-stone-500/10 text-stone-400';
    case 4: return 'bg-green-500/10 text-green-500';
    default: return 'bg-stone-500/10 text-stone-400';
  }
};

export const getTierHoverClass = (tier: number) => {
  switch (tier) {
    case 1: return 'hover:bg-orange-500/10 hover:text-orange-400';
    case 2: return 'hover:bg-blue-500/10 hover:text-blue-400';
    case 3: return 'hover:bg-stone-500/10 hover:text-stone-300';
    case 4: return 'hover:bg-green-500/10 hover:text-green-400';
    default: return 'hover:bg-stone-800 hover:text-white';
  }
};

export const getTierBorderHoverClass = (tier: number) => {
  switch (tier) {
    case 1: return 'hover:border-orange-400 hover:bg-orange-50/30';
    case 2: return 'hover:border-blue-400 hover:bg-blue-50/30';
    case 3: return 'hover:border-stone-400 hover:bg-stone-50/30';
    case 4: return 'hover:border-green-400 hover:bg-green-50/30';
    default: return 'hover:border-amber-300 hover:bg-stone-100';
  }
};

export const getTierTextHoverClass = (tier: number) => {
  switch (tier) {
    case 1: return 'group-hover:text-orange-600';
    case 2: return 'group-hover:text-blue-600';
    case 3: return 'group-hover:text-stone-600';
    case 4: return 'group-hover:text-green-600';
    default: return 'group-hover:text-amber-700';
  }
};
