	import React, { useEffect, useState } from "react";
	import ReactDOM from "react-dom/client";
	import {
		BrowserRouter,
		Routes,
		Route,
		Navigate,
		useParams
	} from "react-router-dom";

	import { routes } from "./routes.jsx";


	function writeworker() {
		const workers = [
			"AKfycbzwc57zmEK1Vm9Q5L1n1my3dxRafZRfNhCZ24zSLIa9H7MhySFhNahvPfW4R3uq753_",
			"AKfycbxCi8vsX-_l5a0JP-mG1RXIbSeiuZOfteumnk96oZCgQMR9nHjikpDqpknUHp-K5hg",
			"AKfycbz0Jc62sHl3IKUJNpqYZp6FGf85aERQKg4SITYgb0pbOJXGvo7CVshdIhN3AEbEBkQmww",
			"AKfycbwMElTU5QdXoUEc4yWj8mUbF-753lHMFAafJn7GuaV8WpACWy16DWhXS8KfJA_HKEZ03Q",
			"AKfycbwafzfiazfcLyo4MPomtJV8j8P3Ys5Y5Z5dlbo6X_Ddll40NQyylFotiGP4RmlNEPNFpg",
			"AKfycbz2OkJ8-2GbIVWOAOAP0Qp37Sts2tclovMTtGEIfqWRkePvz1G1Ag3YywZNyDxeBtYkjg",
			"AKfycbyMS8xD-tK6wRe7wc3fyKAX7MmLiLOU5CTLHVV_HLNImZFx8SsPA2Cvhcc0Ml2TUeas",
			"AKfycbyOERxQbjmX6cmaY9txazA2MFY7y66ylYHyGG1FeGFHARXk36jLvIOGJUsUoy8VmOrp",
			"AKfycbx0LmnTURBcvLI1I4hASnAOTOkqsNEWToguRNAkypoIiGorRQr6YyqFlbOaZjtnWBjx",
			"AKfycbyaAQFka8STu0Fupxt333SW2T-7InSqmY6moyRs8-YGHucSiFqqpyCE4vktadLziRPe",
			"AKfycbxBXfKvsLNcAoiD1usgXLJejnVbGJ4Q0c9WYdufoHoIsuC4bbLKPlQ4XsLPNHRFAzilow",
			"AKfycbw3FjfIIds8UpY4GE_Jdu9hF8Mf58govLZcdpVdHOqb6IbF_A8F2cgtkvv--iEgOEzm",
			"AKfycbyzcBH0M5Np7XQf4aaGktd0zgHt5Sa0CRAXiG-XiUyWd5jzEN1qLDcjXbpVgu0LKQbJ",
			"AKfycbxq4Pi15A7VI2PQGJBnCU0OL0K08gfqbl1dRQEwQc5dcELs1BUoGBw8s9cGQHQncmjh",
			"AKfycbwYhBoXMfdf0QisZrOiUqr27DwE5Hf9hIYAeXV9SfYce-j5VrdwXkJp_wKSwV70yOe6TQ"
		];

		const fallback =
			"AKfycbx69GPoJtf9sSevsUbWtPr46vpa01u4oNkHjFmkkWxmj62AZ0q-";

		return Math.random() < 15 / 16
			? workers[Math.floor(Math.random() * workers.length)]
			: fallback;
	}


	/*
	 * /s/em/*
	 *
	 * PDF embed endpoint.
	 */
	function Embed({ standalone = false }) {
		const params = useParams();
		const rawPath = params["*"] || "";

		let dataUrl = "/s/index/404_html.pdf";
		let titlex = "File not found";

		try {
			let raw = decodeURIComponent(rawPath);

			if (!raw) {
				throw new Error("Missing path");
			}

			if (!raw.toLowerCase().endsWith(".pdf")) {
				raw += ".pdf";
			}

			const parts = raw.split("/");
			const file = parts.pop();

			const cleanFile = file.replace(/&/g, '_').replace(/[^A-Za-z0-9._\- ]/g, '');
			titlex = cleanFile.replace(/\.pdf$/i, "");

			const cleanPathSegments = parts
				.map(segment => segment.replace(/&/g, '_').replace(/[^A-Za-z0-9._\- ]/g, ''))
				.filter(Boolean);
			
			const path = cleanPathSegments.join("/");
		   
			dataUrl = "/" + (path ? path + "/" : "") + cleanFile;
		}
		catch (err) {
			console.log("Embed error:", err);
			titlex = "File not found";
			dataUrl = "/s/index/404_html.pdf";
		}

		useEffect(() => {
			let win;

			try {
				if (window.self !== window.top) {
					win = window.open("about:blank", "_blank");
				}
				else {
					win = window.open("about:blank", "_self");
				}

				if (!win) {
					return;
				}

				const embedUrl = new URL("https://thsconline.github.io/pdf/viewer.html");
				embedUrl.searchParams.set("file", dataUrl);

				win.document.write(
					"<html><head><title>" +
					titlex +
					"</title>" +
					"<meta http-equiv=\"X-UA-Compatible\" content=\"IE=Edge\">" +
					"<meta http-equiv=\"content-type\" content=\"text/html; charset=utf-8\">" +
					"<link rel=\"shortcut icon\" type=\"image/x-icon\" href=\"https://thsconline.github.io/s/images/icon_pdf2.png\">" +
					"<link href=\"/s/styles.css\" rel=\"stylesheet\" type=\"text/css\">" +
					"<style>html, body {height:100% !important;}</style>"
				);

				win.document.write("</head><body>");

				if (!standalone) {
					win.document.write(
						"<div id=\"overlaybar\" style=\"z-index:1000;width:100%;\">" +
						titlex + 
						"<span style=\"float:right\">" +
						"<a class=\"border\" onclick=\"window.close()\">Close ×</a>" +
						"</span></div><br>"
					);
				}
				
				win.document.write(
					"<iframe style=\"width:100%;height:96%;\" frameborder=\"0\" " +
					"sandbox=\"allow-scripts allow-popups allow-same-origin allow-downloads\" " + 
					"src=\"" + embedUrl.href + "\"></iframe>"
				);

				win.document.write("</body></html>");
				win.document.title = titlex;
			}
			catch (err) {
				window.location = "/s/";
			}
		}, [dataUrl, titlex, standalone]);

		return null;
	}


	/*
	 * /s/v/:viewno/:titlex
	 *
	 * Main viewer endpoint.
	 */
	function Viewer({ standalone = false }) {
		const { viewno: _viewno, titlex: _titlex } = useParams();
		const [_endpoint] = useState(writeworker);

		const viewno = (_viewno || "").replace(/[^A-Za-z0-9]/g, '');
		const titlex = (_titlex || "").replace(/&/g, '_').replace(/[^A-Za-z0-9._\- ]/g, '');
		const endpoint = (_endpoint || "").replace(/[^A-Za-z0-9_\-]/g, '');

		useEffect(() => {
			let win;

			try {
				if (window.self !== window.top) {
					win = window.open("about:blank", "_blank");
				}
				else {
					win = window.open("about:blank", "_self");
				}

				if (!win) {
					return;
				}

				const embedUrl = new URL("https://thsconline.github.io/s/viewer.html");
				embedUrl.searchParams.set("field", titlex);
				embedUrl.searchParams.set("base", viewno);
				embedUrl.searchParams.set("w", endpoint);

				win.document.write(
					"<html><head><title>" +
					titlex +
					"</title>" +
					"<meta http-equiv=\"X-UA-Compatible\" content=\"IE=Edge\">" +
					"<meta http-equiv=\"content-type\" content=\"text/html; charset=utf-8\">" +
					"<link rel=\"shortcut icon\" type=\"image/x-icon\" href=\"https://thsconline.github.io/s/images/icon_pdf2.png\">" +
					"<link href=\"/s/styles.css\" rel=\"stylesheet\" type=\"text/css\">" +
					"<style>html, body {height:100% !important;}</style>"
				);

				win.document.write("</head><body>");

				if (!standalone) {
					win.document.write(
						"<div id=\"overlaybar\" style=\"z-index:1000; width:100%;\">" +
						titlex + 
						"<span id=\"overlayinsert\" style=\"float:right !important\">" +
						"<a class=\"border\" href=\"#v\" onclick=\"window.close()\">Close ×</a>" +
						"</span></div><br>"
					);
				}

				win.document.write(
					"<iframe style=\"width:100%; height:96%;\" height=\"96%\" " +
					"sandbox=\"allow-scripts allow-popups allow-same-origin allow-downloads\" " + 
					"allowfullscreen=\"1\" " +
					"frameborder=\"0\" id=\"viewer\" " +
					"src=\"" + embedUrl.href + "\"></iframe>"
				);

				win.document.write("</body></html>");
				win.document.title = titlex;
				
				// =========================
				// FETCH IN BACKGROUND
				// =========================
				fetch("https://thsconline.github.io/s/index/" + viewno + ".json")
					.then(r => r.ok ? r.json() : null)
					.then(data =>
					{
						var isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);

						if (data && Array.isArray(data[titlex]))
						{
							var match = data[titlex].find(x =>
								x.url && x.url.startsWith("/s/em/")
							);

							if (match)
							{
								win.location.href =
									new URL(match.url, "https://thsconline.github.io").href;
								return;
							}
						}

						// fallback ONLY if mobile and no match
						if (isMobile)
						{
							win.location.href = embedUrl.href;
						}
					})
					.catch(() =>
					{
						var isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);

						// fallback ONLY on mobile if fetch fails
						if (isMobile)
						{
							win.location.href = embedUrl.href;
						}
					});
			}
			catch (err) {
				window.location = "/s/";
			}
		}, [viewno, titlex, endpoint, standalone]);

		return null;
	}

	function PageRoute({ Component, title }) {
		React.useEffect(() => {
			document.title = title;
		}, [title]);

		return <Component />;
	}

	/*
	 * React router.
	 */
	function App() {
		return (
			<BrowserRouter>
				<Routes>

					{/* Main viewer */}
					<Route
						path="/s/v/:viewno/:titlex"
						element={<Viewer />}
					/>

					{/* Headless main viewer */}
					<Route
						path="/s/v_standalone/:viewno/:titlex"
						element={<Viewer standalone />}
					/>

					{/* PDF embed */}
					<Route
						path="/s/em/*"
						element={<Embed />}
					/>

					{/* Headless PDF embed */}
					<Route
						path="/s/em_standalone/*"
						element={<Embed standalone />}
					/>

					{/* Generated HTML → JSX routes */}
					{routes.map(
						({ path, component: Component }) => (
							<Route
								key={path}
								path={path}
								element={<PageRoute Component={Component} title={title} />}
							/>
						)
					)}

					{/* Anything not explicitly defined → /s/ */}
					<Route
						path="*"
						element={
							<Navigate
								to="/s/"
								replace
							/>
						}
					/>

				</Routes>
			</BrowserRouter>
		);
	}


	/*
	 * Mount React into the existing page wrapper
	 * supplied by header.html / 404.html.
	 */
	const root = document.getElementById("page-wrapper"); 
	 
	if (root) {
		const currentPath = window.location.pathname;

		const isGeneratedRoute =
			currentPath.includes("/s/v/") ||
			currentPath.includes("/s/v_standalone/") ||
			currentPath.includes("/s/em/") ||
			currentPath.includes("/s/em_standalone/");

		if (isGeneratedRoute) {
			const heading = document.createElement("h1");
			heading.textContent = "thsconline";
			root.before(heading);
		}

		ReactDOM
			.createRoot(root)
			.render(<App />);
	}
