import React from 'react';

export type IconName =
  | 'calendar_month'
  | 'domain'
  | 'hub'
  | 'tune'
  | 'terminal'
  | 'schedule'
  | 'restaurant'
  | 'verified'
  | 'verified_user'
  | 'person'
  | 'person_off'
  | 'domain_disabled'
  | 'difference'
  | 'check'
  | 'check_circle'
  | 'cancel'
  | 'close'
  | 'sync'
  | 'file_download'
  | 'done_all'
  | 'autorenew'
  | 'lock'
  | 'grid_4x4'
  | 'progress_activity'
  | 'meeting_room'
  | 'badge'
  | 'memory'
  | 'info'
  | 'warning'
  | 'error'
  | 'expand_more'
  | 'arrow_forward'
  | 'subdirectory_arrow_right'
  | 'network_check'
  | 'fact_check'
  | string;

interface IconProps {
  name: IconName;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export const Icon: React.FC<IconProps> = ({ name, className = '', style, title }) => {
  const commonProps = {
    className: `inline-block shrink-0 ${className}`,
    style,
    'aria-hidden': title ? undefined : true,
    role: title ? 'img' : undefined,
    width: '1em',
    height: '1em',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'calendar_month':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <circle cx="8" cy="14" r="1" fill="currentColor" />
          <circle cx="12" cy="14" r="1" fill="currentColor" />
          <circle cx="16" cy="14" r="1" fill="currentColor" />
          <circle cx="8" cy="18" r="1" fill="currentColor" />
          <circle cx="12" cy="18" r="1" fill="currentColor" />
          <circle cx="16" cy="18" r="1" fill="currentColor" />
        </svg>
      );

    case 'domain':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M15 9h4a2 2 0 0 1 2 2v10M9 7h2M9 11h2M9 15h2M18 13h1M18 17h1" />
        </svg>
      );

    case 'hub':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <circle cx="12" cy="12" r="3" />
          <circle cx="4" cy="6" r="2" />
          <circle cx="20" cy="6" r="2" />
          <circle cx="4" cy="18" r="2" />
          <circle cx="20" cy="18" r="2" />
          <line x1="5.7" y1="7.3" x2="9.6" y2="10.2" />
          <line x1="18.3" y1="7.3" x2="14.4" y2="10.2" />
          <line x1="5.7" y1="16.7" x2="9.6" y2="13.8" />
          <line x1="18.3" y1="16.7" x2="14.4" y2="13.8" />
        </svg>
      );

    case 'tune':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <line x1="4" y1="8" x2="20" y2="8" />
          <line x1="4" y1="16" x2="20" y2="16" />
          <circle cx="9" cy="8" r="2" fill="currentColor" />
          <circle cx="15" cy="16" r="2" fill="currentColor" />
        </svg>
      );

    case 'terminal':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      );

    case 'schedule':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );

    case 'restaurant':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <path d="M18 2v20M6 2v7a3 3 0 0 0 6 0V2M9 12v10" />
        </svg>
      );

    case 'verified':
    case 'verified_user':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <path d="M12 2l3.09 3.09L19.5 4.5l1 4.3 3.5 2.6-1.5 4.2 1.5 4.2-3.5 2.6-1 4.3-4.41-.59L12 22l-3.09-3.09L4.5 19.5l-1-4.3-3.5-2.6 1.5-4.2-1.5-4.2 3.5-2.6 1-4.3 4.41.59L12 2z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      );

    case 'person':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );

    case 'person_off':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <path d="M16 21v-2a4 4 0 0 0-2.8-3.8M8.8 8.8A4 4 0 0 1 12 3a4 4 0 0 1 4 4c0 .8-.2 1.5-.6 2.1M2 2l20 20M4 21v-2a4 4 0 0 1 4-4h2" />
        </svg>
      );

    case 'domain_disabled':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <path d="M3 21h18M2 2l20 20M5 21V7M9 5h6a2 2 0 0 1 2 2v6M19 13v8" />
        </svg>
      );

    case 'difference':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <line x1="9" y1="12" x2="15" y2="12" />
          <line x1="12" y1="9" x2="12" y2="15" />
        </svg>
      );

    case 'check':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );

    case 'check_circle':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );

    case 'cancel':
    case 'error':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      );

    case 'close':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );

    case 'sync':
    case 'autorenew':
    case 'progress_activity':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l6.73-5.19" />
        </svg>
      );

    case 'file_download':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
      );

    case 'done_all':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <polyline points="18 6 7 17 2 12" />
          <polyline points="22 10 13 19 11 17" />
        </svg>
      );

    case 'lock':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );

    case 'grid_4x4':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <line x1="4" y1="9" x2="20" y2="9" />
          <line x1="4" y1="15" x2="20" y2="15" />
          <line x1="9" y1="4" x2="9" y2="20" />
          <line x1="15" y1="4" x2="15" y2="20" />
        </svg>
      );

    case 'meeting_room':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <path d="M3 21h18M6 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17M14 12h.01" />
        </svg>
      );

    case 'badge':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <circle cx="8" cy="11" r="2" />
          <path d="M14 9h4M14 13h4M6 17h4" />
        </svg>
      );

    case 'memory':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <line x1="9" y1="1" x2="9" y2="4" />
          <line x1="15" y1="1" x2="15" y2="4" />
          <line x1="9" y1="20" x2="9" y2="23" />
          <line x1="15" y1="20" x2="15" y2="23" />
          <line x1="20" y1="9" x2="23" y2="9" />
          <line x1="20" y1="15" x2="23" y2="15" />
          <line x1="1" y1="9" x2="4" y2="9" />
          <line x1="1" y1="15" x2="4" y2="15" />
        </svg>
      );

    case 'info':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );

    case 'warning':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );

    case 'expand_more':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <polyline points="6 9 12 15 18 9" />
        </svg>
      );

    case 'arrow_forward':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      );

    case 'subdirectory_arrow_right':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <polyline points="10 18 15 13 10 8" />
          <path d="M4 6v7a2 2 0 0 0 2 2h9" />
        </svg>
      );

    case 'network_check':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
        </svg>
      );

    case 'fact_check':
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <polyline points="9 15 11 17 15 13" />
        </svg>
      );

    default:
      return (
        <svg {...commonProps}>
          {title && <title>{title}</title>}
          <circle cx="12" cy="12" r="4" fill="currentColor" />
        </svg>
      );
  }
};
