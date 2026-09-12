import { useEffect, useMemo, useRef, useState } from "react";
import { authApi, authFetch, getAccessToken, type User } from "./api/auth.api";
import {
  connectSocket,
  disconnectSocket,
  joinProjectRoom,
  socket,
  type NotificationEvent,
  type PresencePayload,
} from "./services/socket";

type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  isOverdue: boolean;
  projectId: string;
  project?: { id: string; name: string; createdById?: string };
}

interface Project {
  id: string;
  name: string;
  description?: string | null;
  clientId?: string;
  _count?: { tasks: number };
}

interface Client {
  id: string;
  name: string;
  company?: string | null;
}

interface Activity {
  id: string;
  projectId: string;
  taskId: string;
  userId: string;
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
  createdAt: string;
  user?: { name: string };
  task?: { title: string };
}

interface DashboardData {
  projects: Project[];
  tasks: Task[];
  activities: Activity[];
  notifications: NotificationEvent[];
  clients: Client[];
  developers: User[];
}

const emptyData: DashboardData = {
  projects: [],
  tasks: [],
  activities: [],
  notifications: [],
  clients: [],
  developers: [],
};
const statusLabels: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  DONE: "Done",
};
const priorityLabels: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};
const formatDate = (date?: string | null) =>
  date
    ? new Date(date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No deadline";
const countBy = <T,>(items: T[], getKey: (item: T) => string) =>
  items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});

const mergeActivities = (
  current: Activity[],
  incoming: Activity[],
): Activity[] => {
  const activitiesById = new Map(
    [...current, ...incoming].map((activity) => [activity.id, activity]),
  );

  return [...activitiesById.values()]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    )
    .slice(0, 20);
};

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response =
        mode === "register"
          ? await authApi.register(name, email, password)
          : await authApi.login(email, password);
      if (!response.success || !response.data?.user) {
        setError(
          response.message ||
            `Unable to ${mode === "register" ? "create account" : "sign in"}`,
        );
        return;
      }
      onLogin(response.data.user);
    } catch {
      setError("Unable to connect to the server");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">VELOZITY / WORKSPACE</p>
        <h1>{mode === "register" ? "Create your account" : "Welcome back"}</h1>
        <p className="muted">
          {mode === "register"
            ? "Start with a Developer workspace."
            : "Sign in to continue to your dashboard."}
        </p>
        <form onSubmit={submit} className="stack-form">
          {mode === "register" && (
            <label>
              Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                required
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" disabled={submitting}>
            {submitting
              ? "Please wait..."
              : mode === "register"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
        >
          {mode === "register"
            ? "Already have an account? Sign in"
            : "Need an account? Sign up"}
        </button>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  tone = "plain",
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <article className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function TaskList({
  tasks,
  editable = false,
  onStatusChange,
}: {
  tasks: Task[];
  editable?: boolean;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
}) {
  if (tasks.length === 0) return <p className="empty">No tasks to show.</p>;
  return (
    <div className="task-list">
      {tasks.map((task) => (
        <article className="task-row" key={task.id}>
          <div>
            <strong>{task.title}</strong>
            <span className="task-meta">
              {task.project?.name || "Project"} ·{" "}
              {priorityLabels[task.priority]}
            </span>
          </div>
          <div className="task-side">
            <span className={`badge badge-${task.priority.toLowerCase()}`}>
              {priorityLabels[task.priority]}
            </span>
            {editable && onStatusChange ? (
              <select
                value={task.status}
                onChange={(event) =>
                  onStatusChange(task.id, event.target.value as TaskStatus)
                }
                aria-label={`Update ${task.title} status`}
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="status-label">{statusLabels[task.status]}</span>
            )}
            <time className={task.isOverdue ? "overdue" : ""}>
              {task.isOverdue ? "Overdue" : formatDate(task.dueDate)}
            </time>
          </div>
        </article>
      ))}
    </div>
  );
}

function ActivityList({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) return <p className="empty">No activity yet.</p>;
  return (
    <div className="activity-list">
      {activities.slice(0, 12).map((activity) => (
        <article className="activity-row" key={activity.id}>
          <span className="activity-dot" />
          <div>
            <strong>{activity.task?.title || `Task ${activity.taskId}`}</strong>
            <p>
              {activity.user?.name || "A teammate"} moved it from{" "}
              {statusLabels[activity.oldStatus]} to{" "}
              {statusLabels[activity.newStatus]}.
            </p>
          </div>
          <time>{formatDate(activity.createdAt)}</time>
        </article>
      ))}
    </div>
  );
}

function NotificationPanel({
  notifications,
  onMarkRead,
  onMarkAllRead,
}: {
  notifications: NotificationEvent[];
  onMarkRead: (notificationId: string) => void;
  onMarkAllRead: () => void;
}) {
  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  return (
    <section
      className="notification-panel"
      aria-labelledby="notifications-title"
    >
      <div className="section-heading">
        <div className="notification-title">
          <h2 id="notifications-title">Notifications</h2>
          <span className="notification-count">{unreadCount} unread</span>
        </div>
        <button
          type="button"
          className="button-quiet"
          onClick={onMarkAllRead}
          disabled={unreadCount === 0}
        >
          Mark all as read
        </button>
      </div>
      {notifications.length === 0 ? (
        <p className="empty">You are all caught up.</p>
      ) : (
        <div className="notification-list">
          {notifications.map((notification) => (
            <article
              className={`notification-row${notification.read ? " notification-read" : ""}`}
              key={notification.id}
            >
              <span className="notification-dot" aria-hidden="true" />
              <div className="notification-content">
                <strong>{notification.type.replaceAll("_", " ")}</strong>
                <p>{notification.message}</p>
                <time dateTime={notification.createdAt}>
                  {formatDate(notification.createdAt)}
                </time>
              </div>
              {!notification.read && (
                <button
                  type="button"
                  className="notification-read-button"
                  onClick={() => onMarkRead(notification.id)}
                >
                  Mark read
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ManagementPanel({
  projects,
  clients,
  developers,
  onCreated,
}: {
  projects: Project[];
  clients: Client[];
  developers: User[];
  onCreated: () => Promise<void>;
}) {
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectClientId, setProjectClientId] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskProjectId, setTaskProjectId] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("MEDIUM");
  const [taskDeveloperId, setTaskDeveloperId] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [saving, setSaving] = useState<"project" | "task" | "">("");
  const [error, setError] = useState("");

  const createProject = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving("project");
    setError("");
    try {
      const response = await authFetch("/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName,
          description: projectDescription || null,
          clientId: projectClientId,
        }),
      });
      if (!response?.success) {
        setError(response?.message || "Could not create project");
        return;
      }
      setProjectName("");
      setProjectDescription("");
      setProjectClientId("");
      await onCreated();
    } catch {
      setError("Could not create project");
    } finally {
      setSaving("");
    }
  };

  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving("task");
    setError("");
    try {
      const response = await authFetch("/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          projectId: taskProjectId,
          priority: taskPriority,
          assignedDeveloperId: taskDeveloperId || null,
          dueDate: taskDueDate
            ? new Date(`${taskDueDate}T23:59:59`).toISOString()
            : null,
        }),
      });
      if (!response?.success) {
        setError(response?.message || "Could not create task");
        return;
      }
      setTaskTitle("");
      setTaskProjectId("");
      setTaskPriority("MEDIUM");
      setTaskDeveloperId("");
      setTaskDueDate("");
      await onCreated();
    } catch {
      setError("Could not create task");
    } finally {
      setSaving("");
    }
  };

  return (
    <section className="management-section">
      <div className="section-heading">
        <div>
          <h2>Management</h2>
          <p className="section-subtitle">
            Create projects and assign work to developers.
          </p>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="management-grid">
        <form className="panel management-form" onSubmit={createProject}>
          <h3>New project</h3>
          <label>
            Project name
            <input
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              required
              minLength={2}
            />
          </label>
          <label>
            Client
            <select
              value={projectClientId}
              onChange={(event) => setProjectClientId(event.target.value)}
              required
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option value={client.id} key={client.id}>
                  {client.name}
                  {client.company ? ` · ${client.company}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Description
            <textarea
              value={projectDescription}
              onChange={(event) => setProjectDescription(event.target.value)}
              rows={3}
            />
          </label>
          <button
            type="submit"
            disabled={saving !== "" || clients.length === 0}
          >
            {saving === "project" ? "Creating..." : "Create project"}
          </button>
          {clients.length === 0 && (
            <p className="form-hint">
              An Admin must create a client before a project can be added.
            </p>
          )}
        </form>
        <form className="panel management-form" onSubmit={createTask}>
          <h3>New task</h3>
          <label>
            Task title
            <input
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              required
              minLength={2}
            />
          </label>
          <label>
            Project
            <select
              value={taskProjectId}
              onChange={(event) => setTaskProjectId(event.target.value)}
              required
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option value={project.id} key={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-row">
            <label>
              Priority
              <select
                value={taskPriority}
                onChange={(event) =>
                  setTaskPriority(event.target.value as TaskPriority)
                }
              >
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Due date
              <input
                type="date"
                value={taskDueDate}
                onChange={(event) => setTaskDueDate(event.target.value)}
              />
            </label>
          </div>
          <label>
            Assign developer
            <select
              value={taskDeveloperId}
              onChange={(event) => setTaskDeveloperId(event.target.value)}
            >
              <option value="">Unassigned</option>
              {developers.map((developer) => (
                <option value={developer.id} key={developer.id}>
                  {developer.name} · {developer.email}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={saving !== "" || projects.length === 0}
          >
            {saving === "task" ? "Creating..." : "Create and assign task"}
          </button>
        </form>
      </div>
    </section>
  );
}

function AdminDashboard({
  data,
  onlineCount,
}: {
  data: DashboardData;
  onlineCount: number;
}) {
  const statusCounts = countBy(data.tasks, (task) => task.status);
  return (
    <>
      <section className="metrics">
        <Metric label="Total projects" value={data.projects.length} />
        <Metric label="Total tasks" value={data.tasks.length} />
        <Metric
          label="Overdue tasks"
          value={data.tasks.filter((task) => task.isOverdue).length}
          tone="warning"
        />
        <Metric label="Online now" value={onlineCount} tone="live" />
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-heading">
            <h2>Tasks by status</h2>
            <span>{data.tasks.length} total</span>
          </div>
          <div className="status-grid">
            {Object.entries(statusLabels).map(([status, label]) => (
              <div className="status-card" key={status}>
                <strong>{statusCounts[status] || 0}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>Global activity</h2>
            <span>Live</span>
          </div>
          <ActivityList activities={data.activities} />
        </section>
      </div>
    </>
  );
}

function ProjectManagerDashboard({ data }: { data: DashboardData }) {
  const priorities = countBy(data.tasks, (task) => task.priority);
  const upcoming = [...data.tasks]
    .filter((task) => task.dueDate && !task.isOverdue && task.status !== "DONE")
    .sort(
      (a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
    )
    .slice(0, 6);
  return (
    <>
      <section className="metrics">
        <Metric label="Own projects" value={data.projects.length} />
        <Metric
          label="Open tasks"
          value={data.tasks.filter((task) => task.status !== "DONE").length}
        />
        <Metric
          label="Overdue"
          value={data.tasks.filter((task) => task.isOverdue).length}
          tone="warning"
        />
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-heading">
            <h2>Project summary</h2>
            <span>{data.projects.length} projects</span>
          </div>
          <div className="project-list">
            {data.projects.map((project) => (
              <div className="project-row" key={project.id}>
                <strong>{project.name}</strong>
                <span>
                  {project._count?.tasks ??
                    data.tasks.filter((task) => task.projectId === project.id)
                      .length}{" "}
                  tasks
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>Tasks by priority</h2>
          </div>
          <div className="priority-list">
            {Object.entries(priorityLabels).map(([priority, label]) => (
              <div key={priority}>
                <span>{label}</span>
                <strong>{priorities[priority] || 0}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>Upcoming deadlines</h2>
          </div>
          <TaskList tasks={upcoming} />
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>Team activity</h2>
            <span>Live</span>
          </div>
          <ActivityList activities={data.activities} />
        </section>
      </div>
    </>
  );
}

function DeveloperDashboard({
  data,
  onStatusChange,
}: {
  data: DashboardData;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) {
  const [sort, setSort] = useState<"priority" | "dueDate">("priority");
  const priorityOrder: Record<TaskPriority, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };
  const sortedTasks = [...data.tasks].sort((a, b) =>
    sort === "priority"
      ? priorityOrder[a.priority] - priorityOrder[b.priority]
      : new Date(a.dueDate || "9999-12-31").getTime() -
        new Date(b.dueDate || "9999-12-31").getTime(),
  );
  return (
    <>
      <section className="metrics">
        <Metric label="Assigned tasks" value={data.tasks.length} />
        <Metric
          label="In progress"
          value={
            data.tasks.filter((task) => task.status === "IN_PROGRESS").length
          }
        />
        <Metric
          label="Overdue"
          value={data.tasks.filter((task) => task.isOverdue).length}
          tone="warning"
        />
        <Metric
          label="Unread"
          value={
            data.notifications.filter((notification) => !notification.read)
              .length
          }
          tone="live"
        />
      </section>
      <div className="dashboard-grid developer-grid">
        <section className="panel panel-wide">
          <div className="section-heading">
            <h2>My tasks</h2>
            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as "priority" | "dueDate")
              }
            >
              <option value="priority">Sort by priority</option>
              <option value="dueDate">Sort by due date</option>
            </select>
          </div>
          <TaskList
            tasks={sortedTasks}
            editable
            onStatusChange={onStatusChange}
          />
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>Personal activity</h2>
          </div>
          <ActivityList activities={data.activities} />
        </section>
      </div>
    </>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<DashboardData>(emptyData);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const projectIdsRef = useRef<string[]>([]);

  const loadDashboard = async () => {
    const [
      projectsResponse,
      tasksResponse,
      activitiesResponse,
      notificationsResponse,
      managementResponses,
    ] = await Promise.all([
      authFetch("/projects"),
      authFetch("/tasks"),
      authFetch("/activities"),
      authFetch("/activities/notifications"),
      user?.role === "DEVELOPER"
        ? Promise.resolve([null, null] as const)
        : Promise.all([authFetch("/clients"), authFetch("/users")]),
    ]);
    setData((current) => ({
      projects: Array.isArray(projectsResponse?.data)
        ? projectsResponse.data
        : [],
      tasks: Array.isArray(tasksResponse?.data) ? tasksResponse.data : [],
      activities: mergeActivities(
        current.activities,
        Array.isArray(activitiesResponse?.data) ? activitiesResponse.data : [],
      ),
      notifications: Array.isArray(notificationsResponse?.data)
        ? notificationsResponse.data
        : [],
      clients: Array.isArray(managementResponses[0]?.data)
        ? managementResponses[0].data
        : [],
      developers: Array.isArray(managementResponses[1]?.data)
        ? managementResponses[1].data.filter(
            (candidate: User) => candidate.role === "DEVELOPER",
          )
        : [],
    }));
  };

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        if (!getAccessToken()) await authApi.refresh();
        if (!getAccessToken()) return;
        const response = await authApi.getMe();
        if (active && response?.success && response.data)
          setUser(response.data);
      } catch {
        /* Session restoration is optional when no cookie exists. */
      } finally {
        if (active) setLoading(false);
      }
    };
    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError("");
    void loadDashboard()
      .catch(() => {
        if (active) setError("Dashboard data could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const handlePresence = (payload: PresencePayload) => {
      setOnlineCount(payload.onlineCount);
      setOnlineUsers(
        payload.users.map((item) => item.email || item.userId).slice(0, 8),
      );
    };
    const handleActivity = (activity: Activity) =>
      setData((current) => ({
        ...current,
        activities: mergeActivities(current.activities, [activity]),
      }));
    const handleNotification = (notification: NotificationEvent) =>
      setData((current) => ({
        ...current,
        notifications: [
          notification,
          ...current.notifications.filter(
            (item) => item.id !== notification.id,
          ),
        ].slice(0, 50),
      }));
    const recoverActivityFeed = async () => {
      try {
        const response = await authFetch("/activities");
        const recoveredActivities = Array.isArray(response?.data)
          ? response.data
          : [];

        setData((current) => ({
          ...current,
          activities: mergeActivities(current.activities, recoveredActivities),
        }));
        projectIdsRef.current.forEach((projectId) =>
          joinProjectRoom(projectId),
        );
      } catch {
        setError("Activity feed recovery failed. Try reconnecting.");
      }
    };
    const handleSocketConnect = () => {
      void recoverActivityFeed();
    };
    socket.on("presence:updated", handlePresence);
    socket.on("activity:created", handleActivity);
    socket.on("notification:created", handleNotification);
    socket.on("connect", handleSocketConnect);
    connectSocket(getAccessToken()!);
    return () => {
      active = false;
      socket.off("presence:updated", handlePresence);
      socket.off("activity:created", handleActivity);
      socket.off("notification:created", handleNotification);
      socket.off("connect", handleSocketConnect);
      disconnectSocket();
    };
  }, [user]);

  useEffect(() => {
    projectIdsRef.current = data.projects.map((project) => project.id);
    data.projects.forEach((project) => joinProjectRoom(project.id));
  }, [data.projects]);

  const updateStatus = async (taskId: string, status: TaskStatus) => {
    const response = await authFetch(`/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (response?.success)
      setData((current) => ({
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === taskId ? { ...task, status } : task,
        ),
      }));
  };
  const markNotificationRead = async (notificationId: string) => {
    const response = await authFetch(
      `/activities/notifications/${notificationId}/read`,
      {
        method: "PATCH",
      },
    );
    if (response?.success) {
      setData((current) => ({
        ...current,
        notifications: current.notifications.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification,
        ),
      }));
    }
  };
  const markAllNotificationsRead = async () => {
    const response = await authFetch("/activities/notifications/read-all", {
      method: "PATCH",
    });
    if (response?.success) {
      setData((current) => ({
        ...current,
        notifications: current.notifications.map((notification) => ({
          ...notification,
          read: true,
        })),
      }));
    }
  };
  const title = useMemo(
    () => (user ? `Good to see you, ${user.name.split(" ")[0]}` : ""),
    [user],
  );
  if (loading && !user)
    return <main className="loading-shell">Loading workspace...</main>;
  if (!user) return <Login onLogin={setUser} />;
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">VELOZITY / DASHBOARD</p>
          <h1>{title}</h1>
        </div>
        <div className="topbar-actions">
          <span className="presence">
            <i /> {onlineCount} online
          </span>
          <span className="user-chip">{user.role.replace("_", " ")}</span>
          <button
            className="button-quiet"
            onClick={() =>
              void authApi.logout().then(() => {
                setUser(null);
                setData(emptyData);
              })
            }
          >
            Log out
          </button>
        </div>
      </header>
      {onlineUsers.length > 0 && (
        <p className="online-line">Online: {onlineUsers.join(", ")}</p>
      )}
      {error && <p className="form-error">{error}</p>}
      <NotificationPanel
        notifications={data.notifications}
        onMarkRead={markNotificationRead}
        onMarkAllRead={markAllNotificationsRead}
      />
      {user.role !== "DEVELOPER" && (
        <ManagementPanel
          projects={data.projects}
          clients={data.clients}
          developers={data.developers}
          onCreated={loadDashboard}
        />
      )}
      {loading ? (
        <p className="loading-copy">Refreshing dashboard...</p>
      ) : user.role === "ADMIN" ? (
        <AdminDashboard data={data} onlineCount={onlineCount} />
      ) : user.role === "PROJECT_MANAGER" ? (
        <ProjectManagerDashboard data={data} />
      ) : (
        <DeveloperDashboard data={data} onStatusChange={updateStatus} />
      )}
    </main>
  );
}
