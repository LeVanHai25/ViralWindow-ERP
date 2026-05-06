import React from 'react';
import * as LucideIcons from 'lucide-react';

/**
 * Standardized Icon Container for ViralWindow
 * 
 * Props:
 * - icon: string (Lucide icon name, e.g. 'User', 'Users', 'Bell')
 * - color: string ('system' | 'success' | 'pending' | 'urgent' | 'messages')
 * - size: string ('sm' | 'md' | 'lg')
 * - variant: string ('rounded' | 'circle')
 */

export const SemanticColors = {
  system: { bg: 'bg-blue-100', text: 'text-blue-600' },
  success: { bg: 'bg-green-100', text: 'text-green-600' },
  pending: { bg: 'bg-orange-100', text: 'text-orange-600' },
  urgent: { bg: 'bg-red-100', text: 'text-red-600' },
  messages: { bg: 'bg-purple-100', text: 'text-purple-600' },
};

const IconBox = ({ icon, color = 'system', size = 'md', variant = 'rounded' }) => {
  const IconComponent = LucideIcons[icon] || LucideIcons.HelpCircle;

  // Semantic color mapping
  const colors = SemanticColors[color] || SemanticColors.system;

  // Standard size mapping (36px - 44px container)
  const sizes = {
    sm: { container: 'w-[36px] h-[36px]', icon: 18 },
    md: { container: 'w-[40px] h-[40px]', icon: 20 },
    lg: { container: 'w-[44px] h-[44px]', icon: 22 },
  };

  const { container: sizeClasses, icon: iconSize } = sizes[size] || sizes.md;

  // Variant mapping
  const variants = {
    rounded: 'rounded-xl', // ~12px border radius
    circle: 'rounded-full', // full circle
  };

  const variantClass = variants[variant] || variants.rounded;

  return (
    <div 
      className={`
        flex items-center justify-center shrink-0
        ${sizeClasses}
        ${colors.bg}
        ${colors.text}
        ${variantClass}
        transition-all duration-150 ease-in-out
        hover:scale-105 hover:shadow-sm
        active:scale-95
      `}
    >
      <IconComponent size={iconSize} strokeWidth={2} />
    </div>
  );
};

export default IconBox;
