import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { legacyApi } from '../api';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, Textarea } from '../components/ui/Input';
import type {
  LegacyAuditEntry,
  LegacyContact,
  LegacyInstructionSection,
  LegacyStatus,
  LegacyWelcomeMessage,
} from '../types';

type Tab = 'welcome' | 'instructions' | 'contacts' | 'audit' | 'settings';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'welcome', label: 'Welcome Message' },
  { id: 'instructions', label: 'Legacy Instructions' },
  { id: 'contacts', label: 'Legacy Contacts' },
  { id: 'audit', label: 'Audit' },
  { id: 'settings', label: 'Settings' },
];

export function DigitalLegacyPage() {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab') as Tab | null;
  const tab: Tab = TABS.some((t) => t.id === tabParam) ? (tabParam as Tab) : 'welcome';

  const [status, setStatus] = useState<LegacyStatus | null>(null);
  const [audit, setAudit] = useState<LegacyAuditEntry[]>([]);
  const [welcome, setWelcome] = useState<LegacyWelcomeMessage | null>(null);
  const [sections, setSections] = useState<LegacyInstructionSection[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<Partial<LegacyContact> | null>(null);
  const [editingSection, setEditingSection] = useState<Partial<LegacyInstructionSection> | null>(
    null,
  );

  const setTab = (next: Tab) => {
    setParams({ tab: next });
  };

  const load = async () => {
    try {
      const [s, a, w, instr] = await Promise.all([
        legacyApi.status(),
        legacyApi.audit(80),
        legacyApi.getWelcome(),
        legacyApi.getInstructions(),
      ]);
      setStatus(s);
      setAudit(a);
      setWelcome(w);
      setSections(instr.sections);
    } catch (err) {
      console.error(err);
      setError('Kunde inte ladda Digital Legacy.');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const flash = (msg: string) => {
    setMessage(msg);
    setError(null);
    void load();
  };

  if (!status || !welcome) {
    return <p className="text-text-muted">Laddar Digital Legacy…</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Digital Legacy"
        subtitle="Digital estate planning — dead man's switch, welcome, and family handbook"
      />

      <nav className="flex flex-wrap gap-1 border-b border-border pb-px">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-3 py-2 text-sm transition ${
              tab === item.id
                ? 'border-b-2 border-accent font-medium text-accent'
                : 'text-text-muted hover:text-text'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {message && (
        <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {tab === 'welcome' && (
        <WelcomeEditor
          welcome={welcome}
          onSave={async (title, body) => {
            await legacyApi.updateWelcome({ title, body });
            flash('Welcome message saved.');
          }}
        />
      )}

      {tab === 'instructions' && (
        <InstructionsEditor
          sections={sections}
          editing={editingSection}
          setEditing={setEditingSection}
          onSave={async () => {
            if (!editingSection?.title?.trim()) return;
            if (editingSection.id) {
              await legacyApi.updateInstruction(editingSection.id, {
                title: editingSection.title,
                body: editingSection.body ?? '',
                sort_order: editingSection.sort_order,
              });
            } else {
              await legacyApi.createInstruction({
                title: editingSection.title,
                body: editingSection.body ?? '',
              });
            }
            setEditingSection(null);
            flash('Section saved.');
          }}
          onDelete={async (id) => {
            if (!confirm('Delete this section?')) return;
            await legacyApi.deleteInstruction(id);
            flash('Section deleted.');
          }}
          onMove={async (id, direction) => {
            const ids = sections.map((s) => s.id);
            const index = ids.indexOf(id);
            const swapWith = direction === 'up' ? index - 1 : index + 1;
            if (swapWith < 0 || swapWith >= ids.length) return;
            const next = [...ids];
            [next[index], next[swapWith]] = [next[swapWith], next[index]];
            await legacyApi.reorderInstructions(next);
            flash('Order updated.');
          }}
        />
      )}

      {tab === 'contacts' && (
        <ContactsPanel
          contacts={status.contacts}
          editing={editingContact}
          setEditing={setEditingContact}
          onSave={async () => {
            if (!editingContact?.name?.trim() || !editingContact?.email?.trim()) return;
            if (editingContact.id) {
              await legacyApi.updateContact(editingContact.id, {
                name: editingContact.name,
                relationship: editingContact.relationship ?? '',
                email: editingContact.email,
                activation_priority: editingContact.activation_priority ?? 1,
                enabled: editingContact.enabled !== 0,
              });
            } else {
              await legacyApi.createContact({
                name: editingContact.name,
                relationship: editingContact.relationship,
                email: editingContact.email,
                activation_priority: editingContact.activation_priority ?? 1,
                enabled: true,
              });
            }
            setEditingContact(null);
            flash('Contact saved.');
          }}
          onDelete={async (id, name) => {
            if (!confirm(`Remove ${name}?`)) return;
            await legacyApi.deleteContact(id);
            flash('Contact removed.');
          }}
        />
      )}

      {tab === 'audit' && <AuditPanel audit={audit} />}

      {tab === 'settings' && (
        <SettingsPanel
          status={status}
          onFlash={flash}
          onError={setError}
          onSaveConfig={async (event: FormEvent) => {
            event.preventDefault();
            const form = event.target as HTMLFormElement;
            const data = new FormData(form);
            await legacyApi.updateConfig({
              enabled: data.get('enabled') === 'on',
              check_interval_days: Number(data.get('check_interval_days')),
              reminder_1_days: Number(data.get('reminder_1_days')),
              reminder_2_days: Number(data.get('reminder_2_days')),
              activation_days: Number(data.get('activation_days')),
              token_lifetime_hours: Number(data.get('token_lifetime_hours')),
              legacy_role: String(data.get('legacy_role') || 'legacy_viewer'),
              public_base_url: String(data.get('public_base_url') || '').trim() || null,
            });
            flash('Settings saved.');
          }}
        />
      )}
    </div>
  );
}

function WelcomeEditor({
  welcome,
  onSave,
}: {
  welcome: LegacyWelcomeMessage;
  onSave: (title: string, body: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(welcome.title);
  const [body, setBody] = useState(welcome.body);

  useEffect(() => {
    setTitle(welcome.title);
    setBody(welcome.body);
  }, [welcome]);

  return (
    <Card>
      <h2 className="mb-1 text-base font-semibold">Welcome Message</h2>
      <p className="mb-4 text-xs text-text-muted">
        Shown once after a legacy contact activates their account. Last modified{' '}
        {new Date(welcome.updated_at).toLocaleString()}.
      </p>
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Message (multiline — Markdown-ready later)">
        <div className="font-serif text-base leading-relaxed">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
      </Field>
      <Button onClick={() => void onSave(title, body)}>Save welcome message</Button>
    </Card>
  );
}

function InstructionsEditor({
  sections,
  editing,
  setEditing,
  onSave,
  onDelete,
  onMove,
}: {
  sections: LegacyInstructionSection[];
  editing: Partial<LegacyInstructionSection> | null;
  setEditing: (v: Partial<LegacyInstructionSection> | null) => void;
  onSave: () => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onMove: (id: number, direction: 'up' | 'down') => Promise<void>;
}) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Legacy Instructions</h2>
          <p className="text-xs text-text-muted">
            Family handbook. Nothing is hardcoded in the reader — edit sections here.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setEditing({ title: '', body: '', sort_order: sections.length + 1 })}
        >
          Add section
        </Button>
      </div>

      {editing && (
        <div className="mb-6 space-y-2 rounded-lg border border-border bg-surface-muted p-4">
          <Field label="Title">
            <Input
              value={editing.title ?? ''}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
          </Field>
          <Field label="Body (multiline text — future Markdown)">
            <Textarea
              value={editing.body ?? ''}
              onChange={(e) => setEditing({ ...editing, body: e.target.value })}
            />
          </Field>
          <div className="flex gap-2">
            <Button onClick={() => void onSave()}>Save section</Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <ul className="divide-y divide-border">
        {sections.map((section, index) => (
          <li key={section.id} className="py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  <span className="mr-2 text-text-muted">{index + 1}.</span>
                  {section.title}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-text-muted whitespace-pre-wrap">
                  {section.body}
                </p>
                <p className="mt-2 text-xs text-text-muted">
                  Last modified {new Date(section.updated_at).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="ghost" onClick={() => void onMove(section.id, 'up')}>
                  ↑
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void onMove(section.id, 'down')}>
                  ↓
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditing(section)}>
                  Edit
                </Button>
                <Button size="sm" variant="danger" onClick={() => void onDelete(section.id)}>
                  Delete
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ContactsPanel({
  contacts,
  editing,
  setEditing,
  onSave,
  onDelete,
}: {
  contacts: LegacyContact[];
  editing: Partial<LegacyContact> | null;
  setEditing: (v: Partial<LegacyContact> | null) => void;
  onSave: () => Promise<void>;
  onDelete: (id: number, name: string) => Promise<void>;
}) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Legacy Contacts</h2>
        <Button
          size="sm"
          onClick={() =>
            setEditing({
              name: '',
              relationship: '',
              email: '',
              activation_priority: 1,
              enabled: 1,
            })
          }
        >
          Add contact
        </Button>
      </div>

      {editing && (
        <div className="mb-4 space-y-2 rounded-lg border border-border bg-surface-muted p-3">
          <Field label="Name">
            <Input
              value={editing.name ?? ''}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
          </Field>
          <Field label="Relationship">
            <Input
              value={editing.relationship ?? ''}
              onChange={(e) => setEditing({ ...editing, relationship: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={editing.email ?? ''}
              onChange={(e) => setEditing({ ...editing, email: e.target.value })}
            />
          </Field>
          <Field label="Activation priority (1 = first)">
            <Input
              type="number"
              min={1}
              value={editing.activation_priority ?? 1}
              onChange={(e) =>
                setEditing({ ...editing, activation_priority: Number(e.target.value) })
              }
            />
          </Field>
          {editing.id != null && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.enabled !== 0}
                onChange={(e) => setEditing({ ...editing, enabled: e.target.checked ? 1 : 0 })}
              />
              Enabled
            </label>
          )}
          <div className="flex gap-2">
            <Button onClick={() => void onSave()}>Save</Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <ul className="divide-y divide-border">
        {contacts.length === 0 && (
          <li className="py-3 text-sm text-text-muted">No contacts yet.</li>
        )}
        {contacts.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="font-medium">
                {c.name}{' '}
                <span className="text-xs text-text-muted">
                  (prio {c.activation_priority}
                  {c.enabled ? '' : ' · disabled'})
                </span>
              </p>
              <p className="text-sm text-text-muted">
                {c.relationship || '—'} · {c.email}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditing(c)}>
                Edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => void onDelete(c.id, c.name)}>
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AuditPanel({ audit }: { audit: LegacyAuditEntry[] }) {
  return (
    <Card>
      <h2 className="mb-3 text-base font-semibold">Audit log</h2>
      <div className="max-h-96 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-surface text-text-muted">
            <tr>
              <th className="py-2 pr-2">Time</th>
              <th className="py-2 pr-2">Event</th>
              <th className="py-2 pr-2">Actor</th>
              <th className="py-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((row) => (
              <tr key={row.id} className="border-t border-border align-top">
                <td className="whitespace-nowrap py-2 pr-2">
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td className="py-2 pr-2 font-medium">{row.action}</td>
                <td className="py-2 pr-2">{row.actor}</td>
                <td className="break-all py-2 text-text-muted">{row.detail ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SettingsPanel({
  status,
  onFlash,
  onError,
  onSaveConfig,
}: {
  status: LegacyStatus;
  onFlash: (msg: string) => void;
  onError: (msg: string | null) => void;
  onSaveConfig: (event: FormEvent) => Promise<void>;
}) {
  const { config, state } = status;

  return (
    <div className="space-y-4">
      {!status.owner_email_configured && (
        <Card>
          <p className="text-sm text-amber-800">
            <strong>OWNER_EMAIL</strong> is not set. Monthly life checks cannot be emailed until
            this environment variable is configured on the API server.
          </p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-text-muted">Status</p>
          <p className="mt-1 text-lg font-semibold capitalize">
            {state.status.replace(/_/g, ' ')}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-text-muted">Last confirmed</p>
          <p className="mt-1 text-lg font-semibold">
            {state.last_confirmed_alive
              ? new Date(state.last_confirmed_alive).toLocaleString()
              : '—'}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-text-muted">Inactive days</p>
          <p className="mt-1 text-lg font-semibold">
            {status.inactive_days != null ? status.inactive_days.toFixed(1) : '—'}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-base font-semibold">Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={async () => {
              await legacyApi.confirmAlive();
              onFlash("Confirmed: I'm Alive.");
            }}
          >
            I'm Alive (now)
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await legacyApi.sendLifeCheck();
                onFlash('Life check email sent (or logged to console).');
              } catch {
                onError('Could not send life check.');
              }
            }}
          >
            Send life check
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              const r = await legacyApi.runScheduler();
              onFlash(`Scheduler: ${r.actions.join(', ')}`);
            }}
          >
            Run scheduler
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (
                !confirm(
                  'Trigger legacy activation now? One-time links will be emailed. No passwords are sent.',
                )
              ) {
                return;
              }
              try {
                const r = await legacyApi.triggerActivation();
                onFlash(`Activation sent to ${r.sent ?? 0} contact(s).`);
              } catch {
                onError('Activation failed. Add enabled contacts first.');
              }
            }}
          >
            Trigger legacy process
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-semibold">Dead man's switch configuration</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => void onSaveConfig(e)}>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" name="enabled" defaultChecked={config.enabled === 1} />
            Enable Digital Legacy scheduler
          </label>
          <Field label="Check interval (days)">
            <Input
              name="check_interval_days"
              type="number"
              min={1}
              defaultValue={config.check_interval_days}
              required
            />
          </Field>
          <Field label="Reminder month 1 (days)">
            <Input
              name="reminder_1_days"
              type="number"
              min={1}
              defaultValue={config.reminder_1_days}
              required
            />
          </Field>
          <Field label="Reminder month 2 (days)">
            <Input
              name="reminder_2_days"
              type="number"
              min={1}
              defaultValue={config.reminder_2_days}
              required
            />
          </Field>
          <Field label="Activation (days)">
            <Input
              name="activation_days"
              type="number"
              min={1}
              defaultValue={config.activation_days}
              required
            />
          </Field>
          <Field label="Token lifetime (hours)">
            <Input
              name="token_lifetime_hours"
              type="number"
              min={1}
              defaultValue={config.token_lifetime_hours}
              required
            />
          </Field>
          <Field label="Legacy role">
            <Input name="legacy_role" defaultValue={config.legacy_role} required />
          </Field>
          <Field label="Public base URL">
            <Input
              name="public_base_url"
              defaultValue={config.public_base_url ?? ''}
              placeholder="https://jimsaari.se"
            />
          </Field>
          <div className="md:col-span-2">
            <Button type="submit">Save settings</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
