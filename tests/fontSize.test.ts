import { describe, it, expect } from "vitest";
import {
	SCALE_DEFAULT,
	SCALE_MAX,
	SCALE_MIN,
	clampScale,
	readStoredScale,
	roundScale,
	writeStoredScale,
} from "../src/renderer/src/lib/fontSize";

function mockStorage(initial: Record<string, string> = {}) {
	const data = new Map(Object.entries(initial));
	return {
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => void data.set(key, value),
	};
}

describe("clampScale", () => {
	it("возвращает значение внутри диапазона без изменений", () => {
		expect(clampScale(1)).toBe(1);
		expect(clampScale(1.25)).toBe(1.25);
	});

	it("ограничивает значения снизу и сверху", () => {
		expect(clampScale(0.1)).toBe(SCALE_MIN);
		expect(clampScale(9)).toBe(SCALE_MAX);
	});

	it("возвращает дефолт для нечисловых значений", () => {
		expect(clampScale("1.2" as unknown as number)).toBe(SCALE_DEFAULT);
		expect(clampScale(NaN)).toBe(SCALE_DEFAULT);
		expect(clampScale(Infinity)).toBe(SCALE_DEFAULT);
		expect(clampScale(undefined as unknown as number)).toBe(SCALE_DEFAULT);
		expect(clampScale(null as unknown as number)).toBe(SCALE_DEFAULT);
	});
});

describe("roundScale", () => {
	it("округляет до сотых", () => {
		expect(roundScale(1.1500000000000001)).toBe(1.15);
		expect(roundScale(0.7500000000000001)).toBe(0.75);
		expect(roundScale(1)).toBe(1);
	});
});

describe("readStoredScale", () => {
	it("читает сохранённое значение", () => {
		expect(readStoredScale("read", mockStorage({ read: "1.25" }))).toBe(1.25);
	});

	it("возвращает дефолт при отсутствии значения", () => {
		expect(readStoredScale("read", mockStorage({}))).toBe(SCALE_DEFAULT);
	});

	it("clamp-ит битые и выходящие за диапазон значения", () => {
		expect(readStoredScale("read", mockStorage({ read: "abc" }))).toBe(
			SCALE_DEFAULT,
		);
		expect(readStoredScale("read", mockStorage({ read: "0.1" }))).toBe(
			SCALE_MIN,
		);
		expect(readStoredScale("read", mockStorage({ read: "3" }))).toBe(SCALE_MAX);
	});

	it("не падает при ошибке хранилища", () => {
		const throwing = {
			getItem: () => {
				throw new Error("boom");
			},
		};
		expect(readStoredScale("read", throwing)).toBe(SCALE_DEFAULT);
	});
});

describe("writeStoredScale", () => {
	it("сохраняет значение", () => {
		const store = mockStorage();
		writeStoredScale("read", 1.3, store);
		expect(store.getItem("read")).toBe("1.3");
	});

	it("не падает при ошибке хранилища", () => {
		const throwing = {
			setItem: () => {
				throw new Error("boom");
			},
		};
		expect(() => writeStoredScale("read", 1.3, throwing)).not.toThrow();
	});
});
