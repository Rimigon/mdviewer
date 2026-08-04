import { useState } from "react";
import type { DirEntry } from "@shared/types";

interface Props {
	root: string;
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
	onOpenFile,
}: {
	node: NodeState;
	depth: number;
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

	return (
		<div>
			<div
				className={`tree-row${node.entry.isDir ? " dir" : ""}${isMd ? " md" : ""}`}
				style={{ paddingLeft: `${depth * 14}px` }}
				onClick={() => void toggle()}
				title={node.entry.path}
			>
				<span className="tree-icon">
					{node.entry.isDir ? (state.expanded ? "📂" : "📁") : "📄"}
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
							onOpenFile={onOpenFile}
						/>
					))}
				</div>
			)}
		</div>
	);
}

export default function FileTree({ root, onOpenFile }: Props) {
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
			<div className="tree-scroll">
				<TreeNode
					node={{
						entry: rootEntry,
						expanded: true,
						children: null,
						loading: false,
					}}
					depth={0}
					onOpenFile={onOpenFile}
				/>
			</div>
		</aside>
	);
}
