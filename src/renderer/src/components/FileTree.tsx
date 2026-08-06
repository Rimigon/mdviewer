import { useState } from "react";
import type { DirEntry } from "@shared/types";
import {
	ChevronIcon,
	FileIcon,
	FolderClosedIcon,
	FolderOpenIcon,
} from "./icons";

interface Props {
	root: string;
	activePath: string | null;
	onOpenFile: (path: string) => void;
}

interface NodeState {
	entry: DirEntry;
	expanded: boolean;
	children: DirEntry[] | null;
	loading: boolean;
}

function TreeNode({
	node,
	depth,
	activePath,
	onOpenFile,
}: {
	node: NodeState;
	depth: number;
	activePath: string | null;
	onOpenFile: (path: string) => void;
}) {
	const [state, setState] = useState(node);

	async function toggle(): Promise<void> {
		if (!node.entry.isDir) {
			onOpenFile(node.entry.path);
			return;
		}
		if (state.children === null) {
			setState((s) => ({ ...s, loading: true }));
			try {
				const children = await window.api.readDir(node.entry.path);
				setState((s) => ({ ...s, children, loading: false, expanded: true }));
			} catch {
				setState((s) => ({ ...s, loading: false }));
			}
		} else {
			setState((s) => ({ ...s, expanded: !s.expanded }));
		}
	}

	const isMd = /\.(md|markdown|mdown|mkd)$/i.test(node.entry.name);
	const isActive = node.entry.path === activePath;

	return (
		<div>
			<div
				className={`tree-row${node.entry.isDir ? " dir" : ""}${isMd ? " md" : ""}${isActive ? " active" : ""}`}
				style={{ paddingLeft: `${8 + depth * 14}px` }}
				onClick={() => void toggle()}
				title={node.entry.path}
			>
				{node.entry.isDir ? (
					<span
						className={`tree-chevron${state.expanded ? " expanded" : ""}`}
					>
						<ChevronIcon />
					</span>
				) : (
					<span className="tree-chevron" />
				)}
				<span className="tree-icon">
					{node.entry.isDir ? (
						state.expanded ? (
							<FolderOpenIcon />
						) : (
							<FolderClosedIcon />
						)
					) : (
						<FileIcon />
					)}
				</span>
				<span className="tree-name">{node.entry.name}</span>
				{state.loading && <span className="tree-loading">…</span>}
			</div>
			{node.entry.isDir && state.expanded && state.children && (
				<div>
					{state.children.map((c) => (
						<TreeNode
							key={c.path}
							node={{
								entry: c,
								expanded: false,
								children: null,
								loading: false,
							}}
							depth={depth + 1}
							activePath={activePath}
							onOpenFile={onOpenFile}
						/>
					))}
				</div>
			)}
		</div>
	);
}

export default function FileTree({ root, activePath, onOpenFile }: Props) {
	const rootEntry: DirEntry = {
		name: root.split(/[\\/]/).pop() ?? root,
		path: root,
		isDir: true,
	};
	return (
		<aside className="tree">
			<div className="tree-root" title={root}>
				{rootEntry.name}
			</div>
			<TreeNode
				node={{
					entry: rootEntry,
					expanded: true,
					children: null,
					loading: false,
				}}
				depth={0}
				activePath={activePath}
				onOpenFile={onOpenFile}
			/>
		</aside>
	);
}
