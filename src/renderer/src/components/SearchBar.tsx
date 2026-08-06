import { SearchIcon } from "./icons";

interface Props {
	query: string;
	onChange: (q: string) => void;
	count: number;
}

export default function SearchBar({ query, onChange, count }: Props) {
	return (
		<div className="search">
			<span className="search-icon">
				<SearchIcon />
			</span>
			<input
				type="search"
				placeholder="Поиск…"
				value={query}
				onChange={(e) => onChange(e.target.value)}
				aria-label="Поиск по документу"
			/>
			{query.trim() !== "" && (
				<span className="search-count">{count}</span>
			)}
		</div>
	);
}
