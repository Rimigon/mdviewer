interface IconProps {
	size?: number;
	className?: string;
}

function svgProps(size: number, className?: string) {
	return {
		width: size,
		height: size,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 2,
		strokeLinecap: "round" as const,
		strokeLinejoin: "round" as const,
		className,
		"aria-hidden": true,
	};
}

export function OpenFileIcon({ size = 16, className }: IconProps) {
	return (
		<svg {...svgProps(size, className)}>
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<polyline points="14 2 14 8 20 8" />
		</svg>
	);
}

export function FolderIcon({ size = 16, className }: IconProps) {
	return (
		<svg {...svgProps(size, className)}>
			<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
		</svg>
	);
}

export function SaveIcon({ size = 16, className }: IconProps) {
	return (
		<svg {...svgProps(size, className)}>
			<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
			<polyline points="17 21 17 13 7 13 7 21" />
			<polyline points="7 3 7 8 15 8" />
		</svg>
	);
}

export function EditIcon({ size = 16, className }: IconProps) {
	return (
		<svg {...svgProps(size, className)}>
			<path d="M12 20h9" />
			<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
		</svg>
	);
}

export function EyeIcon({ size = 16, className }: IconProps) {
	return (
		<svg {...svgProps(size, className)}>
			<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
			<circle cx="12" cy="12" r="3" />
		</svg>
	);
}

export function ListIcon({ size = 16, className }: IconProps) {
	return (
		<svg {...svgProps(size, className)}>
			<line x1="8" y1="6" x2="21" y2="6" />
			<line x1="8" y1="12" x2="21" y2="12" />
			<line x1="8" y1="18" x2="21" y2="18" />
			<line x1="3" y1="6" x2="3.01" y2="6" />
			<line x1="3" y1="12" x2="3.01" y2="12" />
			<line x1="3" y1="18" x2="3.01" y2="18" />
		</svg>
	);
}

export function SunIcon({ size = 16, className }: IconProps) {
	return (
		<svg {...svgProps(size, className)}>
			<circle cx="12" cy="12" r="4" />
			<path d="M12 2v2" />
			<path d="M12 20v2" />
			<path d="m4.93 4.93 1.41 1.41" />
			<path d="m17.66 17.66 1.41 1.41" />
			<path d="M2 12h2" />
			<path d="M20 12h2" />
			<path d="m6.34 17.66-1.41 1.41" />
			<path d="m19.07 4.93-1.41 1.41" />
		</svg>
	);
}

export function MoonIcon({ size = 16, className }: IconProps) {
	return (
		<svg {...svgProps(size, className)}>
			<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
		</svg>
	);
}

export function SearchIcon({ size = 16, className }: IconProps) {
	return (
		<svg {...svgProps(size, className)}>
			<circle cx="11" cy="11" r="7" />
			<line x1="21" y1="21" x2="16.65" y2="16.65" />
		</svg>
	);
}

export function ChevronIcon({ size = 14, className }: IconProps) {
	return (
		<svg {...svgProps(size, className)}>
			<polyline points="9 6 15 12 9 18" />
		</svg>
	);
}

export function FolderOpenIcon({ size = 16, className }: IconProps) {
	return (
		<svg {...svgProps(size, className)}>
			<path d="M6 14l1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
		</svg>
	);
}

export function FolderClosedIcon({ size = 16, className }: IconProps) {
	return (
		<svg {...svgProps(size, className)}>
			<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
			<path d="M2 7v13" />
		</svg>
	);
}

export function FileIcon({ size = 16, className }: IconProps) {
	return (
		<svg {...svgProps(size, className)}>
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<path d="M14 2v6h6" />
			<path d="M9 13h6" />
			<path d="M9 17h4" />
		</svg>
	);
}

export function TextSizeIcon({ size = 16, className }: IconProps) {
	return (
		<svg {...svgProps(size, className)}>
			<path d="M5 20 9.5 6 14 20" />
			<path d="M6.9 14.8h5.2" />
			<path d="M19 15.4a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 1 0 0-4.6Z" />
			<path d="M19 20v-6.5" />
		</svg>
	);
}
