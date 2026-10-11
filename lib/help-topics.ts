/**
 * The help page in short, for the assistant: "how do I…" questions about the
 * site itself should land on the right section of /help.
 */
export const helpTopics: { title: string; body: string; anchor: string }[] = [
  { anchor: "start", title: "How to create an account and sign in", body: "Register with email and password, confirm the email link, or continue with Google. Sign up, log in, join, membership is free." },
  { anchor: "start", title: "How to reset a forgotten password", body: "Use reset your password on the sign-in page; the emailed link works once for 30 minutes and signs out other devices. Forgot password, change password, cannot log in." },
  { anchor: "assistant", title: "How the Ask AVRMD assistant works", body: "The assistant searches AVRMD content, answers briefly with cited sources, suggests next steps, and has a daily allowance of AI answers. Not medical advice." },
  { anchor: "questions", title: "How to ask the community a question", body: "Ask a question with a title, details and tags; it is routed to up to 8 members who can help, and you are notified of answers. Mark the answer that helped." },
  { anchor: "questions", title: "How to answer questions", body: "Open a question and write an answer; share experience and sources; never include patient information." },
  { anchor: "profile", title: "How to edit your profile and appear in the member directory", body: "In settings set display name, handle, bio, roles, stages, what you can help with, looking for, topics and organization. Directory lists members who declared a role or stage. Follow members." },
  { anchor: "share", title: "How to share a talk, post an update or suggest a record", body: "Submit a recorded talk, post updates with images on the network, or suggest a missing product, study, event or organization for the library." },
  { anchor: "email", title: "How to manage email notifications, the weekly digest and unsubscribe", body: "Notification bell, email for answers and routed questions, weekly digest on Mondays, turn each kind off in settings, one-click unsubscribe link in every email." },
  { anchor: "organizations", title: "How an organization claims its record", body: "Companies, hospitals and universities claim their library record; an editor verifies through work email; representatives edit the record, run a group and receive enquiries. Sponsored promotion." },
  { anchor: "safety", title: "How to report content or delete your account", body: "Report a question, answer or post for patient information, spam, harassment, misleading claims or copyright. Delete your account at the bottom of settings. Privacy policy and terms." },
  { anchor: "editors", title: "Editor and administrator tools", body: "Admin workspace: review queue, reports, contributions, invite people, member management with roles, suspension, deletion and an audit history." },
];
