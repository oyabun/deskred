import * as LucideIcons from 'lucide-react';

function DesktopIcon({ icon, label, onDoubleClick }) {
  const handleDoubleClick = () => {
    console.log('Desktop icon double-clicked:', label);
    if (onDoubleClick) {
      onDoubleClick();
    }
  };

  // Dynamically get the Lucide icon component
  const IconComponent = LucideIcons[icon] || LucideIcons.HelpCircle;

  return (
    <div className="desktop-icon" onDoubleClick={handleDoubleClick}>
      <div className="icon-image">
        <IconComponent size={32} strokeWidth={1.5} color="#ff3300" />
      </div>
      <div className="icon-label">
        {label}
      </div>
    </div>
  );
}

export default DesktopIcon;
