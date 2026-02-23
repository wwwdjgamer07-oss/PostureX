import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon({ children, className, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

export function SkullGridIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 4.5h8l3 3v5.2c0 2.8-2 5.2-4.7 5.8v2.5H9.7v-2.5C7 17.9 5 15.5 5 12.7V7.5l3-3Z" />
      <rect x="8.5" y="9.5" width="2.6" height="2.6" rx=".4" />
      <rect x="12.9" y="9.5" width="2.6" height="2.6" rx=".4" />
      <path d="M9.2 15h5.6M10.2 17h3.6" />
    </BaseIcon>
  );
}

export function SkullBrainIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 4.5h8l3 3v5.2c0 2.8-2 5.2-4.7 5.8v2.5H9.7v-2.5C7 17.9 5 15.5 5 12.7V7.5l3-3Z" />
      <path d="M9.2 9.5c.4-.8 1.2-1.3 2.1-1.3s1.7.5 2.1 1.3m-4.8 2.3h6.8" />
      <path d="M10 13.8c.5.4 1.2.7 2 .7.8 0 1.5-.3 2-.7" />
    </BaseIcon>
  );
}

export function SkullJoystickIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 4.5h8l3 3v4.7c0 3-2.2 5.5-5.1 5.9V21H10v-2.9c-2.9-.4-5.1-2.9-5.1-5.9V7.5l3.1-3Z" />
      <circle cx="12" cy="8.5" r="1.4" />
      <path d="M12 9.9v2.3M9.2 14.4h2.3M12.5 14.4h2.3" />
    </BaseIcon>
  );
}

export function SkullAvatarIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 4.5h8l3 3v5.2c0 2.8-2 5.2-4.7 5.8v1.4h2.2a2 2 0 0 1 2 2M9.7 18.5v1.4H7.5a2 2 0 0 0-2 2" />
      <circle cx="10.3" cy="10.3" r=".9" />
      <circle cx="13.7" cy="10.3" r=".9" />
      <path d="M9.8 14.3h4.4" />
    </BaseIcon>
  );
}

export function SkullGemIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3.5 18 9l-6 11L6 9l6-5.5Z" />
      <path d="M9.6 7.3h4.8M8.2 9h7.6M10.8 11.2l1.2-1.2 1.2 1.2" />
    </BaseIcon>
  );
}

export function SkullCoinIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M9.2 9.8h5.6l1 1v2.4l-1 1h-5.6l-1-1v-2.4l1-1Z" />
      <path d="M10 15.4h4" />
    </BaseIcon>
  );
}

export function SkullCrystalIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m12 3.5 5.5 4.8L14 20h-4L6.5 8.3 12 3.5Z" />
      <path d="M8.7 9h6.6M10 12h4M10.8 15h2.4" />
    </BaseIcon>
  );
}
