import { useEffect, useState } from "react";
import {
	SCALE_MAX,
	SCALE_MIN,
	SCALE_STEP,
	STORAGE_KEY_EDITOR,
	STORAGE_KEY_READ,
	applyFontScale,
	readStoredScale,
	roundScale,
	writeStoredScale,
} from "../lib/fontSize";
import { TextSizeIcon } from "./icons";

interface ScaleRowProps {
	label: string;
	value: number;
	onChange: (next: number) => void;
}

function ScaleRow({ label, value, onChange }: ScaleRowProps) {
	return (
		<label className="text-size-row">
			<span className="text-size-row-head">
				<span className="text-size-label">{label}</span>
				<span className="text-size-value">{Math.round(value * 100)}%</span>
			</span>
			<input
				className="text-size-range"
				type="range"
				min={SCALE_MIN}
				max={SCALE_MAX}
				step={SCALE_STEP}
				value={value}
				onChange={(e) => onChange(roundScale(Number(e.target.value)))}
			/>
		</label>
	);
}

export default function TextSizeControl() {
	const [open, setOpen] = useState(false);
	const [readScale, setReadScale] = useState(() =>
		readStoredScale(STORAGE_KEY_READ),
	);
	const [editorScale, setEditorScale] = useState(() =>
		readStoredScale(STORAGE_KEY_EDITOR),
	);

	useEffect(() => {
		applyFontScale(readScale, editorScale);
	}, [readScale, editorScale]);

	useEffect(() => {
		if (!open) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [open]);

	function handleReadChange(next: number): void {
		setReadScale(next);
		writeStoredScale(STORAGE_KEY_READ, next);
	}

	function handleEditorChange(next: number): void {
		setEditorScale(next);
		writeStoredScale(STORAGE_KEY_EDITOR, next);
	}

	return (
		<div className="text-size">
			<button
				className={`icon-btn${open ? " active" : ""}`}
				title="Размер текста"
				aria-label="Размер текста"
				aria-expanded={open}
				aria-controls="text-size-popover"
				onClick={() => setOpen((v) => !v)}
			>
				<TextSizeIcon />
			</button>
			{open && (
				<>
					<div
						className="text-size-backdrop"
						onClick={() => setOpen(false)}
						aria-hidden
					/>
					<div
						id="text-size-popover"
						className="text-size-popover"
						role="dialog"
						aria-label="Размер текста"
					>
						<ScaleRow
							label="Просмотр"
							value={readScale}
							onChange={handleReadChange}
						/>
						<ScaleRow
							label="Редактор"
							value={editorScale}
							onChange={handleEditorChange}
						/>
					</div>
				</>
			)}
		</div>
	);
}
