import type { TocEntry } from "../lib/toc";

interface Props {
	entries: TocEntry[];
	onNavigate: (id: string) => void;
}

export default function TocSidebar({ entries, onNavigate }: Props) {
	if (entries.length === 0) {
		return (
			<aside className="toc">
				<span className="toc-empty">Нет заголовков</span>
			</aside>
		);
	}
	return (
		// Ложное срабатывание: правило помечает любой контейнер с <a>, а не только вложенные ссылки
		// pi-lens-ignore: no-nested-links
		<aside className="toc" role="navigation" aria-label="Оглавление">
			<div className="toc-title">Оглавление</div>
			{entries.map((e) => (
				<a
					key={e.id}
					href={`#${e.id}`}
					className="toc-link"
					style={{ paddingLeft: `${(e.level - 1) * 12}px` }}
					onClick={(ev) => {
						ev.preventDefault();
						onNavigate(e.id);
					}}
				>
					{e.text}
				</a>
			))}
		</aside>
	);
}
