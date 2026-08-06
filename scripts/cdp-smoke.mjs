// CDP smoke-test: checks the running MD Viewer renderer DOM
const wsUrl = process.argv[2];
const ws = new WebSocket(wsUrl);
let id = 0;
const pending = new Map();

function send(method, params = {}) {
	return new Promise((resolve, reject) => {
		const msgId = ++id;
		pending.set(msgId, { resolve, reject });
		ws.send(JSON.stringify({ id: msgId, method, params }));
	});
}

ws.onmessage = (ev) => {
	let msg;
	try {
		msg = JSON.parse(ev.data);
	} catch {
		return; // невалидное сообщение — игнорируем
	}
	if (msg.id && pending.has(msg.id)) {
		const { resolve, reject } = pending.get(msg.id);
		pending.delete(msg.id);
		msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
	}
};

ws.onopen = async () => {
	try {
		await send("Runtime.enable");
		const evalJs = async (expression) => {
			const r = await send("Runtime.evaluate", {
				expression,
				returnByValue: true,
			});
			return r.result?.value;
		};
		const results = {};
		results.markdownBodyExists = await evalJs(
			"!!document.querySelector('.markdown-body')",
		);
		results.hasTable = await evalJs(
			"!!document.querySelector('.markdown-body table')",
		);
		results.hasHighlightedCode = await evalJs(
			"!!document.querySelector('.markdown-body .hljs')",
		);
		results.hasKatex = await evalJs(
			"!!document.querySelector('.markdown-body .katex')",
		);
		results.hasMermaidBlock = await evalJs(
			"!!document.querySelector('.markdown-body .language-mermaid')",
		);
		results.hasAnchorHeading = await evalJs(
			"!!document.querySelector('.markdown-body h1 .anchor')",
		);
		results.themeCssLoaded = await evalJs(
			"!!document.getElementById('theme-css')",
		);
		results.darkClass = await evalJs(
			"document.documentElement.classList.contains('dark')",
		);
		// toggle theme and re-check
		await evalJs("document.querySelector('.toolbar button').click()");
		results.darkAfterToggle = await evalJs(
			"document.documentElement.classList.contains('dark')",
		);
		results.statusText = await evalJs(
			"document.querySelector('.status')?.textContent || ''",
		);
		console.log(JSON.stringify(results, null, 2));
	} catch (e) {
		console.error("CDP error:", e.message);
	} finally {
		ws.close();
		process.exit(0);
	}
};
