import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Help",
  description: "How to use AVRMD: the assistant, the library, questions and answers, your profile, email, and the tools for organizations and editors.",
};

const sections = [
  ["start", "Getting started"],
  ["assistant", "Ask AVRMD, the assistant"],
  ["library", "The library"],
  ["questions", "Questions and answers"],
  ["profile", "Your profile and the member directory"],
  ["share", "Sharing your work"],
  ["email", "Notifications and email"],
  ["organizations", "For organizations"],
  ["safety", "Safety, privacy and your account"],
  ["editors", "For editors and administrators"],
] as const;

/** The user manual: what each part of the site does and how to use it. */
export default function HelpPage() {
  return (
    <div className="shell legal-page help-page">
      <h1>Help</h1>
      <p>
        AVRMD is a community for virtual, augmented and mixed reality in medicine: the
        clinicians, researchers, engineers, manufacturers and business people who build,
        test, buy and use it. Everything is readable without an account. The quickest way in
        is to ask the assistant; this page explains the rest.
      </p>

      <nav aria-label="On this page" className="help-toc">
        <strong>On this page</strong>
        <ol>
          {sections.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`}>{label}</a>
            </li>
          ))}
        </ol>
      </nav>

      <h2 id="start">1. Getting started</h2>
      <h3>Create an account</h3>
      <ol>
        <li>
          Go to <Link href="/sign-in?mode=register">Create account</Link>. Your email address is
          your account.
        </li>
        <li>
          Choose a password of at least 10 characters. A few unrelated words work well.
        </li>
        <li>
          Open the confirmation email and press <em>Continue</em>. The link works for 24 hours.
        </li>
      </ol>
      <p>
        Or use <strong>Continue with Google</strong>: no password or confirmation email is
        needed. If you were invited by an editor, the invitation link creates a confirmed
        account in one step.
      </p>
      <h3>The welcome step</h3>
      <p>
        After your first sign-in, one short page asks what you do, which stages of the pipeline
        you work on, what you can help with and which clinical areas you follow. This decides
        which questions are sent to you and what your weekly digest contains. You can skip it
        and fill it in later in <Link href="/settings/profile">Settings</Link>.
      </p>
      <h3>Forgot your password?</h3>
      <p>
        Use <Link href="/sign-in?mode=forgot">Reset your password</Link>. The link works once,
        for 30 minutes, and signs you out on every other device.
      </p>

      <h2 id="assistant">2. Ask AVRMD, the assistant</h2>
      <p>
        Press <strong>Ask AVRMD</strong> in the header (or the button in the corner of any page)
        and type a question in plain words, for example <em>“Which VR products are
        FDA-cleared for pain?”</em> or <em>“Who makes RelieVRx?”</em>.
      </p>
      <ul>
        <li>
          It searches AVRMD&apos;s own content: catalog records, FDA authorizations, papers and
          news, talks, stage and topic guides, related websites and member questions.
        </li>
        <li>
          It answers briefly and <strong>cites its sources</strong>; every claim links to the
          page it came from. Check the source before relying on anything.
        </li>
        <li>
          It suggests next steps, such as a page to open or asking members when the library
          has no answer.
        </li>
        <li>
          It is not medical advice, and it does not know about anything that isn&apos;t on
          AVRMD. Don&apos;t type patient information into it.
        </li>
        <li>
          Each visitor has a daily allowance of AI-written answers. After that, the assistant
          still lists the matching sources.
        </li>
      </ul>

      <h2 id="library">3. The library</h2>
      <p>Under <strong>Library</strong> in the header:</p>
      <ul>
        <li>
          <Link href="/explore">Records</Link>: organizations, products, evidence, events,
          projects and open problems, each with its sources. Filter by specialty, use case,
          modality and stage.
        </li>
        <li>
          <Link href="/clearances">FDA AR/VR devices</Link>: the FDA&apos;s list of authorized
          AR/VR medical devices, refreshed daily.
        </li>
        <li>
          <Link href="/signals">Papers &amp; news</Link>: papers, trials, filings and news found
          by AVRMD&apos;s daily robot. These are unreviewed; read the source.
        </li>
        <li>
          <Link href="/talks">Talks</Link>: recorded talks and lectures, curated and shared by
          members.
        </li>
        <li>
          <Link href="/gear">Gear</Link> and <Link href="/resources">Websites</Link>: hardware,
          and other sites worth knowing.
        </li>
      </ul>
      <p>
        <Link href="/stages">Stages</Link> follows a product from idea to market (research and
        evidence, technology, design, implementation, clinical validation, regulatory,
        manufacturing and commercialization) and shows what matters at
        each step. <Link href="/topics">Clinical topics</Link> such as surgical training or
        pain management gather everything on one subject.
      </p>
      <p>
        Something missing or wrong? <Link href="/participate">Suggest a record</Link>. Editors
        check every suggestion against its source before it is published.
      </p>

      <h2 id="questions">4. Questions and answers</h2>
      <h3>Ask</h3>
      <ol>
        <li>
          Go to <Link href="/ask">Ask a question</Link> (you need to be signed in).
        </li>
        <li>Write a clear title (under 200 characters) and, if useful, details.</li>
        <li>
          Add tags: topics, stages and what kind of help you need. Tags decide who sees it.
        </li>
      </ol>
      <p>
        AVRMD sends your question to the members who said they can help with those tags (up
        to 8 people), and it appears on <Link href="/questions">Questions</Link> for everyone.
        You are notified when someone answers. Mark the answer that helped you; it moves to
        the top and its author is told.
      </p>
      <h3>Answer</h3>
      <p>
        Open any question and write your answer. Share experience and sources; say what you
        don&apos;t know. Never include patient information.
      </p>

      <h2 id="profile">5. Your profile and the member directory</h2>
      <p>
        In <Link href="/settings/profile">Settings</Link> you can set your display name,
        handle, bio, professional roles, stages, what you can help with, what you are looking
        for, the clinical topics you follow and your organization. Your email address is never
        shown publicly.
      </p>
      <p>
        <Link href="/members">Members</Link> lists people who have described themselves, and can
        be filtered by role and stage, so a startup can find a clinician, or a hospital an
        engineer. Only members who filled in a role or stage are listed. You can follow
        members and organizations.
      </p>

      <h2 id="share">6. Sharing your work</h2>
      <ul>
        <li>
          <Link href="/talks">Talks</Link>: share a recorded talk with a link, speakers and
          tags.
        </li>
        <li>
          <Link href="/network">Network</Link>: post updates with images; others can like and
          comment.
        </li>
        <li>
          <Link href="/participate">Suggest a record</Link>: a product, study, event or
          organization that belongs in the library.
        </li>
      </ul>

      <h2 id="email">7. Notifications and email</h2>
      <ul>
        <li>
          The <strong>bell</strong> in the header shows answers to your questions, questions
          sent to you, and accepted answers. <Link href="/notifications">See all</Link>.
        </li>
        <li>
          The same events are emailed to you. Turn each kind on or off under{" "}
          <Link href="/settings/profile#email">Settings → Email</Link>.
        </li>
        <li>
          The <strong>weekly digest</strong> arrives on Mondays: new FDA authorizations, papers
          and trials closest to your work, and questions you could answer. It is not sent in
          weeks with nothing new.
        </li>
        <li>
          Every email has an unsubscribe link that works with one click, no sign-in needed.
        </li>
      </ul>

      <h2 id="organizations">8. For organizations</h2>
      <p>
        Companies, hospitals, universities and societies listed in the library can{" "}
        <Link href="/for-organizations#claim">claim their record</Link>. An editor confirms you
        work there, usually through your work email. A verified representative can correct
        the record, run the organization&apos;s group (forum, blog and media) and receive
        private enquiries. <Link href="/for-organizations#promotion">Promotion</Link> options
        are clearly labelled as sponsored. See <Link href="/for-organizations">For
        organizations</Link>.
      </p>

      <h2 id="safety">9. Safety, privacy and your account</h2>
      <ul>
        <li>
          <strong>Report</strong> a question, answer or post with the report link beneath it:
          patient information, spam, harassment, a misleading or unsafe medical claim,
          copyright, or something else. Editors review every report.
        </li>
        <li>
          AVRMD is professional information, not medical advice. Never post anything that
          could identify a patient.
        </li>
        <li>
          <strong>Delete your account</strong> at the bottom of{" "}
          <Link href="/settings/profile">Settings</Link>. Your profile, posts, questions,
          answers and notifications are removed.
        </li>
        <li>
          Read the <Link href="/privacy">privacy policy</Link> and{" "}
          <Link href="/terms">terms</Link>, and <Link href="/about">how AVRMD works</Link>.
        </li>
      </ul>

      <h2 id="editors">10. For editors and administrators</h2>
      <p>
        Editors, moderators and administrators see <strong>Admin</strong> in their account
        menu. The <strong>Overview</strong> tab shows what is waiting in each of the others:
      </p>
      <ul>
        <li>
          <strong>Review queue</strong>: what the daily robot found, with the AI&apos;s
          recommendation and a draft record. Correct the draft and approve or reject it.
          Items the AI set aside can be restored. Approved records publish with the next
          deploy.
        </li>
        <li>
          <strong>Reports</strong>: hide the reported content or dismiss the report.
        </li>
        <li>
          <strong>Contributions</strong>: record suggestions, claims and promotion enquiries;
          mark each done or declined.
        </li>
        <li>
          <strong>Invite people</strong>: send a personal invitation with an optional note.
          Replies go to your inbox; the list shows who has joined.
        </li>
        <li>
          <strong>Members</strong> (moderators and administrators): search every account and
          open a member to see their details, activity and history. Moderators can suspend and
          restore accounts; a suspended account is signed out everywhere, cannot sign in, and
          disappears from the directory and from email. Administrators can also change roles
          (member, editor, moderator, administrator) and delete accounts. Every action is
          recorded with who did it.
        </li>
      </ul>

      <h2>Still stuck?</h2>
      <p>
        Ask the assistant, or <Link href="/ask">ask the community</Link>. To reach the
        editors, reply to any email from AVRMD.
      </p>
    </div>
  );
}
