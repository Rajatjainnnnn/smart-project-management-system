import { useEffect, useState } from "react";

import "./App.css";

const TOKEN_KEY = "spms-auth";

async function request(path, { token, ...options } = {}) {
	const response = await fetch(`/api/auth/${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...options.headers,
		},
	});
	const data = response.status === 204 || response.status === 205
		? null
		: await response.json().catch(() => ({}));
	if (!response.ok) {
		const detail = data?.detail || Object.values(data || {}).flat().join(" ");
		const error = new Error(detail || "Something went wrong. Please try again.");
		error.status = response.status;
		throw error;
	}
	return data;
}

function App() {
	const [tokens, setTokens] = useState(() => {
		try {
			return JSON.parse(sessionStorage.getItem(TOKEN_KEY)) || null;
		} catch {
			return null;
		}
	});
	const [profile, setProfile] = useState(null);
	const [mode, setMode] = useState("login");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (!tokens?.access) return;
		request("profile/", { token: tokens.access })
			.then(setProfile)
			.catch(() => {
				sessionStorage.removeItem(TOKEN_KEY);
				setTokens(null);
			});
	}, [tokens]);

	async function handleSubmit(event) {
		event.preventDefault();
		setError("");
		setBusy(true);
		const form = new FormData(event.currentTarget);
		const credentials = {
			username: form.get("username"),
			password: form.get("password"),
		};

		try {
			if (mode === "register") {
				await request("register/", {
					method: "POST",
					body: JSON.stringify({ ...credentials, email: form.get("email") }),
				});
			}
			const nextTokens = await request("token/", {
				method: "POST",
				body: JSON.stringify(credentials),
			});
			sessionStorage.setItem(TOKEN_KEY, JSON.stringify(nextTokens));
			setTokens(nextTokens);
			setProfile(await request("profile/", { token: nextTokens.access }));
		} catch (submitError) {
			setError(submitError.message);
		} finally {
			setBusy(false);
		}
	}

	async function handleLogout() {
		try {
			if (tokens?.refresh) {
				await request("logout/", {
					token: tokens.access,
					method: "POST",
					body: JSON.stringify({ refresh: tokens.refresh }),
				});
			}
		} catch (logoutError) {
			setError(logoutError.message);
		} finally {
			sessionStorage.removeItem(TOKEN_KEY);
			setTokens(null);
			setProfile(null);
		}
	}

	if (tokens && !profile) {
		return <main className="auth-shell"><p className="loading">Loading your workspace...</p></main>;
	}

	return (
		<main className="auth-shell">
			<header className="brand-bar">
				<a className="brand" href="/" aria-label="SPMS home">
					<span className="brand-mark" aria-hidden="true">S</span>
					<span>SPMS</span>
				</a>
				<span className="brand-caption">Student project workspace</span>
			</header>

			{profile ? (
				<section className="welcome-panel" aria-labelledby="welcome-title">
					<p className="eyebrow">YOUR WORKSPACE</p>
					<h1 id="welcome-title">Welcome back, {profile.first_name || profile.username}.</h1>
					<p className="welcome-copy">Signed in as {profile.email || profile.username}.</p>
					<button className="primary-button" onClick={handleLogout} type="button">
						Sign out <span aria-hidden="true">&#8599;</span>
					</button>
				</section>
			) : (
				<section className="auth-panel" aria-labelledby="auth-title">
					<div className="panel-heading">
						<p className="eyebrow">TEAM PROJECTS, IN ONE PLACE</p>
						<h1 id="auth-title">Make the work <em>move.</em></h1>
						<p className="intro">Sign in to your student project workspace.</p>
					</div>

					<div className="auth-tabs" role="tablist" aria-label="Account access">
						<button
							aria-selected={mode === "login"}
							className={mode === "login" ? "active" : ""}
							onClick={() => { setMode("login"); setError(""); }}
							role="tab"
							type="button"
						>Sign in</button>
						<button
							aria-selected={mode === "register"}
							className={mode === "register" ? "active" : ""}
							onClick={() => { setMode("register"); setError(""); }}
							role="tab"
							type="button"
						>Create account</button>
					</div>

					<form className="auth-form" onSubmit={handleSubmit}>
						<label>
							<span>Username</span>
							<input autoComplete="username" name="username" required />
						</label>
						{mode === "register" && (
							<label>
								<span>Email</span>
								<input autoComplete="email" name="email" required type="email" />
							</label>
						)}
						<label>
							<span>Password</span>
							<input
								autoComplete={mode === "register" ? "new-password" : "current-password"}
								minLength={mode === "register" ? 8 : undefined}
								name="password"
								required
								type="password"
							/>
						</label>
						{error && <p className="form-error" role="alert">{error}</p>}
						<button className="primary-button" disabled={busy} type="submit">
							{busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
							{!busy && <span aria-hidden="true">&#8599;</span>}
						</button>
					</form>
					<p className="form-note">Use your team account to access SPMS.</p>
				</section>
			)}

			<footer className="page-footer">
				<span>SPMS</span>
				<span>Plan together. Deliver together.</span>
			</footer>
		</main>
	);
}

export default App;
