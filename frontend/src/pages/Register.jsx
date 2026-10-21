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

function Register() {
	const navigate = useNavigate();
	const [form, setForm] = useState({
		username: "",
		email: "",
		password: "",
		firstName: "",
		lastName: "",
	});
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
			await apiRequest("register/", {
				method: "POST",
				body: JSON.stringify({
					username: form.username,
					email: form.email,
					password: form.password,
					first_name: form.firstName,
					last_name: form.lastName,
				}),
			});

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
		} catch (registerError) {
			setError(registerError.message || "Unable to create account.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center px-5 py-8 [background:radial-gradient(ellipse_at_50%_0%,#DBEAFE_0,transparent_42%),var(--background)]">
			<div className="w-full max-w-125 rounded-(--radius) border border-(--border) bg-(--surface) p-9 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
				<div className="mb-5 flex h-10 w-10 items-center justify-center rounded-[10px] bg-(--primary) text-lg font-bold text-white">
					S
				</div>

				<div>
					<div className="mb-2.25 text-[10px] font-bold tracking-[0.08em] text-(--primary)">
						STUDENT PROJECT MANAGEMENT
					</div>
					<h1 className="text-[26px] font-bold leading-[1.2]">
						Create your account
					</h1>
					<p className="mb-6.75 mt-2 text-[13px] leading-normal text-(--text-secondary)">
						Set up your profile and start building with your team.
					</p>
				</div>

				<form onSubmit={handleSubmit}>
					<div className="grid grid-cols-2 gap-3.25">
						<Field
							label="First name"
							name="firstName"
							autoComplete="given-name"
							placeholder="First name"
							value={form.firstName}
							onChange={update("firstName")}
						/>
						<Field
							label="Last name"
							name="lastName"
							autoComplete="family-name"
							placeholder="Last name"
							value={form.lastName}
							onChange={update("lastName")}
						/>
					</div>
					<Field
						label="Username"
						name="username"
						autoComplete="username"
						placeholder="Choose a username"
						value={form.username}
						onChange={update("username")}
						required
					/>
					<Field
						label="Email address"
						name="email"
						type="email"
						autoComplete="email"
						placeholder="you@example.com"
						value={form.email}
						onChange={update("email")}
						required
					/>
					<Field
						label="Password"
						name="password"
						type="password"
						autoComplete="new-password"
						placeholder="Create a password"
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
						{loading ? "Creating account..." : "Create Account"}
					</button>
				</form>

				<p className="mt-5.75 border-t border-(--border) pt-4.75 text-center text-xs text-(--text-muted)">
					Already have an account?{" "}
					<Link
						to="/login"
						className="font-semibold text-(--primary) no-underline hover:text-(--primary-hover) hover:underline"
					>
						Sign in
					</Link>
				</p>
			</div>
		</div>
	);
}

export default Register;
