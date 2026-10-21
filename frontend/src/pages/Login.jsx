import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiRequest, getStoredAuth, saveAuth } from "../lib/auth";

function Field({
	label,
	name,
	type = "text",
	autoComplete,
	placeholder,
	value,
	onChange,
	required,
}) {
	return (
		<label className="mb-4 block">
			<span className="mb-1.75 block text-xs font-semibold text-(--text-secondary)">
				{label}
			</span>
			<input
				type={type}
				name={name}
				autoComplete={autoComplete}
				placeholder={placeholder}
				value={value}
				onChange={onChange}
				required={required}
				className="w-full rounded-lg border border-(--border) bg-(--surface) px-3.25 py-3 text-[13px] text-(--text-primary) outline-none transition duration-200 ease-in-out placeholder:text-slate-400 focus:border-(--primary) focus:shadow-[0_0_0_3px_#DBEAFE]"
			/>
		</label>
	);
}

function Login() {
	const navigate = useNavigate();
	const [form, setForm] = useState({ username: "", password: "" });
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		if (getStoredAuth()) {
			navigate("/dashboard", { replace: true });
		}
	}, [navigate]);

	const update = (field) => (event) =>
		setForm((current) => ({ ...current, [field]: event.target.value }));

	async function handleSubmit(event) {
		event.preventDefault();
		setError("");
		setLoading(true);

		try {
			const tokens = await apiRequest("token/", {
				method: "POST",
				body: JSON.stringify({
					username: form.username,
					password: form.password,
				}),
			});

			const profile = await apiRequest("profile/", { token: tokens.access });
			saveAuth({ ...tokens, user: profile });
			navigate("/dashboard", { replace: true });
		} catch (loginError) {
			setError(loginError.message || "Unable to sign in.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center px-5 py-8 [background:radial-gradient(ellipse_at_50%_0%,#DBEAFE_0,transparent_42%),var(--background)]">
			<div className="w-full max-w-105 rounded-(--radius) border border-(--border) bg-(--surface) p-9 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
				<div className="mb-7 flex h-11 w-11 items-center justify-center rounded-xl bg-(--primary) text-lg font-bold text-white shadow-lg shadow-[#2080d733]">
					S
				</div>

				<div>
					<div className="mb-2.25 text-[10px] font-bold tracking-[0.08em] text-(--primary)">
						STUDENT PROJECT MANAGEMENT
					</div>
					<h1 className="text-[26px] font-bold leading-[1.2]">Welcome back</h1>
					<p className="mb-6.75 mt-2 text-[13px] leading-normal text-(--text-secondary)">
						Sign in to pick up where your team left off.
					</p>
				</div>

				<form onSubmit={handleSubmit}>
					<Field
						label="Username or email"
						name="username"
						autoComplete="username"
						placeholder="Enter your username or email"
						value={form.username}
						onChange={update("username")}
						required
					/>
					<Field
						label="Password"
						name="password"
						type="password"
						autoComplete="current-password"
						placeholder="Enter your password"
						value={form.password}
						onChange={update("password")}
						required
					/>

					{error ? (
						<p className="mb-3 text-xs text-(--danger)">{error}</p>
					) : null}

					<button
						type="submit"
						disabled={loading}
						className="mt-0.75 w-full cursor-pointer rounded-lg border-none bg-(--primary) px-4.25 py-3 text-[13px] font-semibold text-white transition duration-200 ease-in-out hover:bg-(--primary-hover) disabled:cursor-wait disabled:opacity-75"
					>
						{loading ? "Logging in..." : "Login"}
					</button>
				</form>

				<p className="mt-5.75 border-t border-(--border) pt-4.75 text-center text-xs text-(--text-muted)">
					Don’t have an account?{" "}
					<Link
						to="/register"
						className="font-semibold text-(--primary) no-underline hover:text-(--primary-hover) hover:underline"
					>
						Create one
					</Link>
				</p>
			</div>
		</div>
	);
}

export default Login;
