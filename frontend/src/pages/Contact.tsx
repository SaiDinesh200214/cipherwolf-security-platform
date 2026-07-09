import { useState } from "react";
import { apiRequest } from "../services/api";
import { buildFreshVisitorPayload, getVisitorId } from "../services/visitorTracking";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");
    setLoading(true);

    try {
      await apiRequest("/contact", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          source: "contact-page",
          visitorId: getVisitorId(),
          metadata: await buildFreshVisitorPayload("contact_submit", { subject }, true),
        }),
      });
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setStatus("Message received. I will get back to you soon.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to send message.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-6 py-20 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Contact</h1>
        <p className="mt-4 text-(--text-secondary)">
          Want to collaborate or have a security question? Reach out below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto mt-10 grid max-w-2xl gap-4 rounded-3xl border border-(--border) bg-white p-6 shadow-sm">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-2xl border border-(--border) bg-(--bg-primary) px-5 py-3 outline-none focus:border-(--primary)"
          placeholder="Name"
          autoComplete="name"
          required
        />
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-2xl border border-(--border) bg-(--bg-primary) px-5 py-3 outline-none focus:border-(--primary)"
          placeholder="Email"
          type="email"
          autoComplete="email"
          required
        />
        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="rounded-2xl border border-(--border) bg-(--bg-primary) px-5 py-3 outline-none focus:border-(--primary)"
          placeholder="Subject"
          required
        />
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="min-h-36 resize-y rounded-2xl border border-(--border) bg-(--bg-primary) px-5 py-3 outline-none focus:border-(--primary)"
          placeholder="Message"
          required
        />
        {status && <p className="text-sm font-medium text-(--text-secondary)">{status}</p>}
        <button disabled={loading} className="rounded-full bg-(--primary) px-6 py-3 font-medium text-white transition hover:bg-(--primary-light) disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? "Sending..." : "Send message"}
        </button>
      </form>
    </div>
  );
}
