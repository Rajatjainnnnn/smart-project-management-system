import { useEffect, useState } from "react";

import { apiRequest, getStoredAuth, saveAuth } from "../lib/auth";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-(--border) bg-white px-3 py-2.5 text-sm outline-none focus:border-(--primary)";
const cardClass = "rounded-(--radius) border border-(--border) bg-white p-6";

function Profile() {
  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [mySkills, setMySkills] = useState([]);
  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    bio: "",
    department: "",
  });
  const [newSkill, setNewSkill] = useState({ name: "", category: "general" });
  const [selectedSkill, setSelectedSkill] = useState("");
  const [proficiency, setProficiency] = useState(3);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [loading, setLoading] = useState(true);
  const [loadKey, setLoadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const availableSkills = skills.filter(
    (skill) => !mySkills.some((userSkill) => userSkill.skill.id === skill.id),
  );

  useEffect(() => {
    let isActive = true;
    Promise.all([
        apiRequest("/api/auth/profile/"),
        apiRequest("/api/skills/"),
        apiRequest("/api/users/me/skills/"),
      ])
      .then(([profileData, catalog, userSkills]) => {
        if (!isActive) return;
        setProfile(profileData);
        setForm({
          email: profileData.email || "",
          first_name: profileData.first_name || "",
          last_name: profileData.last_name || "",
          bio: profileData.profile?.bio || "",
          department: profileData.profile?.department || "",
        });
        setSkills(catalog);
        setMySkills(userSkills);
        setSelectedSkill(String(catalog[0]?.id || ""));
      })
      .catch((loadError) => {
        if (isActive) {
          setProfile(null);
          setError(loadError.message || "Could not load your profile.");
        }
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [loadKey]);

  function updateForm(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await apiRequest("/api/auth/profile/", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setProfile(updated);
      saveAuth({ ...getStoredAuth(), user: updated });
      window.dispatchEvent(new Event("spms-auth-updated"));
      setMessage("Profile updated.");
    } catch (saveError) {
      setError(saveError.message || "Could not update your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function createSkill(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const skill = await apiRequest("/api/skills/", {
        method: "POST",
        body: JSON.stringify(newSkill),
      });
      setSkills((current) => [...current, skill].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedSkill(String(skill.id));
      setNewSkill({ name: "", category: "general" });
      setMessage("Skill added to the catalog. Add it to your profile below.");
    } catch (createError) {
      setError(createError.message || "Could not add this skill.");
    }
  }

  async function addSkill(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const userSkill = await apiRequest("/api/users/me/skills/", {
        method: "POST",
        body: JSON.stringify({
          skill_id: Number(selectedSkill),
          proficiency: Number(proficiency),
        }),
      });
      setMySkills((current) => [...current, userSkill]);
      setSelectedSkill(
        String(
          skills.find(
            (skill) =>
              skill.id !== userSkill.skill.id &&
              !mySkills.some((item) => item.skill.id === skill.id),
          )?.id || "",
        ),
      );
      setMessage(`${userSkill.skill.name} added to your profile.`);
    } catch (addError) {
      setError(addError.message || "Could not add this skill to your profile.");
    }
  }

  async function updateProficiency(userSkill, value) {
    setError("");
    try {
      const updated = await apiRequest(`/api/users/me/skills/${userSkill.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ proficiency: Number(value) }),
      });
      setMySkills((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessage(`${updated.skill.name} proficiency updated.`);
    } catch (updateError) {
      setError(updateError.message || "Could not update proficiency.");
    }
  }

  async function removeSkill(userSkill) {
    setError("");
    try {
      await apiRequest(`/api/users/me/skills/${userSkill.id}/`, { method: "DELETE" });
      setMySkills((current) => current.filter((item) => item.id !== userSkill.id));
      setMessage(`${userSkill.skill.name} removed from your profile.`);
    } catch (removeError) {
      setError(removeError.message || "Could not remove this skill.");
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError("New password and confirmation do not match.");
      return;
    }
    setPasswordSaving(true);
    try {
      await apiRequest("/api/auth/password/", {
        method: "POST",
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      });
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      setMessage("Password changed successfully.");
    } catch (passwordError) {
      setError(passwordError.message || "Could not change your password.");
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-(--text-secondary)">Loading your profile...</div>;
  }

  if (!profile) {
    function retryProfileLoad() {
      setError("");
      setLoading(true);
      setLoadKey((key) => key + 1);
    }

    return (
      <div className="mx-auto max-w-3xl p-8">
        <div className="rounded-(--radius) border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-800">Profile unavailable</h1>
          <p role="alert" className="mt-2 text-sm text-red-700">{error || "Could not load your profile."}</p>
          <button
            type="button"
            onClick={retryProfileLoad}
            className="mt-4 rounded-lg bg-(--primary) px-4 py-2.5 text-sm font-semibold text-white hover:bg-(--primary-hover)"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-6">
        <p className="mb-1.5 text-[10px] font-bold tracking-[0.08em] text-(--primary)">ACCOUNT</p>
        <h1 className="text-[27px] font-bold leading-[1.1]">Profile & Skills</h1>
        <p className="mt-2 text-[13px] text-(--text-secondary)">
          Keep your team profile and skills up to date for better task recommendations.
        </p>
      </div>

      {(error || message) && (
        <div
          role={error ? "alert" : "status"}
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}
        >
          {error || message}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <section className={cardClass}>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-(--primary)">
              {(profile?.first_name || profile?.username || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-semibold">Personal information</h2>
              <p className="text-xs text-(--text-muted)">@{profile?.username} · {profile?.profile?.role || "Student"}</p>
            </div>
          </div>
          <form className="space-y-3.5" onSubmit={saveProfile}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-(--text-secondary)">
                First name
                <input className={inputClass} name="first_name" value={form.first_name} onChange={updateForm} />
              </label>
              <label className="text-xs font-semibold text-(--text-secondary)">
                Last name
                <input className={inputClass} name="last_name" value={form.last_name} onChange={updateForm} />
              </label>
            </div>
            <label className="block text-xs font-semibold text-(--text-secondary)">
              Email
              <input className={inputClass} type="email" name="email" required value={form.email} onChange={updateForm} />
            </label>
            <label className="block text-xs font-semibold text-(--text-secondary)">
              Department
              <input className={inputClass} name="department" value={form.department} onChange={updateForm} placeholder="e.g. Computer Applications" />
            </label>
            <label className="block text-xs font-semibold text-(--text-secondary)">
              About me
              <textarea className={`${inputClass} min-h-24 resize-y`} name="bio" value={form.bio} onChange={updateForm} placeholder="A short introduction for your teammates" />
            </label>
            <button className="rounded-lg bg-(--primary) px-4 py-2.5 text-sm font-semibold text-white hover:bg-(--primary-hover)" disabled={saving}>
              {saving ? "Saving..." : "Save profile"}
            </button>
          </form>
        </section>

        <div className="space-y-5">
          <section className={cardClass}>
            <h2 className="font-semibold">My skills</h2>
            <p className="mt-1 text-xs text-(--text-muted)">Proficiency is used to explain skill-match recommendations.</p>
            {mySkills.length === 0 ? (
              <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-(--text-muted)">No skills added yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-(--border)">
                {mySkills.map((userSkill) => (
                  <li className="flex items-center justify-between gap-3 py-3" key={userSkill.id}>
                    <div>
                      <p className="text-sm font-medium">{userSkill.skill.name}</p>
                      <p className="text-xs text-(--text-muted)">{userSkill.skill.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        aria-label={`${userSkill.skill.name} proficiency`}
                        className="rounded-md border border-(--border) bg-white px-2 py-1.5 text-xs"
                        value={userSkill.proficiency}
                        onChange={(event) => updateProficiency(userSkill, event.target.value)}
                      >
                        {[1, 2, 3, 4, 5].map((level) => <option value={level} key={level}>{level} / 5</option>)}
                      </select>
                      <button type="button" className="text-xs font-semibold text-red-600 hover:underline" onClick={() => removeSkill(userSkill)}>
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={addSkill}>
              <label className="min-w-40 flex-1 text-xs font-semibold text-(--text-secondary)">
                Catalog skill
                <select className={inputClass} value={selectedSkill} onChange={(event) => setSelectedSkill(event.target.value)} required>
                  {availableSkills.length === 0 && <option value="">No available skills</option>}
                  {availableSkills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-(--text-secondary)">
                Proficiency
                <select className={inputClass} value={proficiency} onChange={(event) => setProficiency(event.target.value)}>
                  {[1, 2, 3, 4, 5].map((level) => <option value={level} key={level}>{level} / 5</option>)}
                </select>
              </label>
              <button className="mb-px rounded-lg border border-(--border) px-3.5 py-2.5 text-sm font-semibold text-(--text-secondary) hover:bg-slate-50" disabled={!availableSkills.length}>
                Add skill
              </button>
            </form>
          </section>

          <section className={cardClass}>
            <h2 className="font-semibold">Add a skill to the catalog</h2>
            <p className="mt-1 text-xs text-(--text-muted)">New catalog skills become available for task requirements and team profiles.</p>
            <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_150px_auto]" onSubmit={createSkill}>
              <input className={inputClass} aria-label="Skill name" placeholder="e.g. Django REST Framework" value={newSkill.name} onChange={(event) => setNewSkill((current) => ({ ...current, name: event.target.value }))} required />
              <input className={inputClass} aria-label="Skill category" placeholder="Category" value={newSkill.category} onChange={(event) => setNewSkill((current) => ({ ...current, category: event.target.value }))} />
              <button className="rounded-lg border border-(--border) px-3.5 py-2.5 text-sm font-semibold text-(--text-secondary) hover:bg-slate-50">Create</button>
            </form>
          </section>
        </div>
      </div>

      <section className={`${cardClass} mt-5`}>
        <h2 className="font-semibold">Change password</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={changePassword}>
          <label className="text-xs font-semibold text-(--text-secondary)">
            Current password
            <input className={inputClass} type="password" autoComplete="current-password" value={passwordForm.current_password} onChange={(event) => setPasswordForm((current) => ({ ...current, current_password: event.target.value }))} required />
          </label>
          <label className="text-xs font-semibold text-(--text-secondary)">
            New password
            <input className={inputClass} type="password" autoComplete="new-password" value={passwordForm.new_password} onChange={(event) => setPasswordForm((current) => ({ ...current, new_password: event.target.value }))} required />
          </label>
          <label className="text-xs font-semibold text-(--text-secondary)">
            Confirm new password
            <input className={inputClass} type="password" autoComplete="new-password" value={passwordForm.confirm_password} onChange={(event) => setPasswordForm((current) => ({ ...current, confirm_password: event.target.value }))} required />
          </label>
          <div className="sm:col-span-3">
            <button disabled={passwordSaving} className="rounded-lg border border-(--border) px-4 py-2.5 text-sm font-semibold text-(--text-secondary) hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60">
              {passwordSaving ? "Changing password..." : "Change password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default Profile;
