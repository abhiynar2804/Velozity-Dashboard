import { useEffect, useState } from "react";
import { authFetch, getAccessToken } from "./api/auth.api";
import {
  connectSocket,
  disconnectSocket,
  joinProjectRoom,
  leaveProjectRoom,
  socket,
  type PresencePayload,
  type ProjectPresencePayload,
  type NotificationEvent,
} from "./services/socket";

interface ActivityEvent {
  id: string;
  projectId: string;
  taskId: string;
  userId: string;
  oldStatus: string;
  newStatus: string;
  createdAt: string;
}

type Notification = NotificationEvent;

export default function App() {
  const [projectId, setProjectId] = useState("");
  const [joinedProject, setJoinedProject] = useState("");
  const [connectionState, setConnectionState] = useState("Disconnected");
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [projectUsers, setProjectUsers] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = async () => {
    try {
      const response = await authFetch("/activities/notifications");
      setNotifications(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  };

  const fetchMissedActivities = async (nextProjectId: string) => {
    try {
      const response = await authFetch(
        `/activities?projectId=${encodeURIComponent(nextProjectId)}`,
      );
      const nextActivities = Array.isArray(response?.data) ? response.data : [];

      setActivities((current) => {
        const mapped = new Map(
          current.map((activity) => [activity.id, activity]),
        );

        nextActivities.forEach((activity: ActivityEvent) => {
          mapped.set(activity.id, activity);
        });

        return [...mapped.values()]
          .sort(
            (left, right) =>
              new Date(right.createdAt).getTime() -
              new Date(left.createdAt).getTime(),
          )
          .slice(0, 20);
      });
    } catch (error) {
      console.error("Failed to load missed activities:", error);
    }
  };

  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      setConnectionState("Sign in to connect");
      return;
    }

    const handleConnect = () => {
      setConnectionState("Connected");
      if (joinedProject) {
        joinProjectRoom(joinedProject);
        void fetchMissedActivities(joinedProject);
      }
    };
    const handleDisconnect = () => setConnectionState("Disconnected");
    const handleConnectError = () =>
      setConnectionState("Authentication failed");
    const handleActivity = (activity: ActivityEvent) => {
      setActivities((current) => [activity, ...current].slice(0, 20));
    };
    const handleNotification = (notification: NotificationEvent) => {
      setNotifications((current) => {
        if (current.some((item) => item.id === notification.id)) {
          return current;
        }
        return [notification, ...current].slice(0, 50);
      });
    };
    const handleJoined = ({
      projectId: nextProjectId,
    }: {
      projectId: string;
    }) => {
      setJoinedProject(nextProjectId);
      void fetchMissedActivities(nextProjectId);
    };
    const handlePresenceUpdated = (payload: PresencePayload) => {
      setOnlineCount(payload.onlineCount);
      setOnlineUsers(
        payload.users.map((user) => user.email || user.userId).slice(0, 10),
      );
    };
    const handleProjectPresence = (payload: ProjectPresencePayload) => {
      setProjectUsers(
        payload.users.map((user) => user.email || user.userId).slice(0, 10),
      );
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("activity:created", handleActivity);
    socket.on("notification:created", handleNotification);
    socket.on("project:joined", handleJoined);
    socket.on("presence:updated", handlePresenceUpdated);
    socket.on("presence:project", handleProjectPresence);
    connectSocket(accessToken);
    void fetchNotifications();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("activity:created", handleActivity);
      socket.off("notification:created", handleNotification);
      socket.off("project:joined", handleJoined);
      socket.off("presence:updated", handlePresenceUpdated);
      socket.off("presence:project", handleProjectPresence);
      disconnectSocket();
    };
  }, [joinedProject]);

  const handleJoin = () => {
    const nextProjectId = projectId.trim();
    if (nextProjectId) {
      setJoinedProject(nextProjectId);
      joinProjectRoom(nextProjectId);
      void fetchMissedActivities(nextProjectId);
    }
  };

  const handleLeave = () => {
    if (!joinedProject) return;
    leaveProjectRoom(joinedProject);
    setJoinedProject("");
    setProjectUsers([]);
  };

  return (
    <main className="socket-monitor">
      <p className="eyebrow">VELOZITY / LIVE EVENTS</p>
      <h1>Project activity stream</h1>
      <p className="status">Socket status: {connectionState}</p>
      <p className="status">Online users: {onlineCount}</p>
      <p className="status">
        Unread notifications:{" "}
        {notifications.filter((notification) => !notification.read).length}
      </p>
      <p className="status">
        Active now: {onlineUsers.length > 0 ? onlineUsers.join(", ") : "No one"}
      </p>
      <section className="room-controls" aria-label="Project room controls">
        <input
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          placeholder="Project CUID"
          aria-label="Project ID"
        />
        <button
          type="button"
          onClick={handleJoin}
          disabled={connectionState !== "Connected"}
        >
          Join project
        </button>
        <button type="button" onClick={handleLeave} disabled={!joinedProject}>
          Leave project
        </button>
      </section>
      <p className="room">
        {joinedProject
          ? `Watching project ${joinedProject}`
          : "No project room joined"}
      </p>
      {joinedProject && (
        <p className="status">
          Project online:{" "}
          {projectUsers.length > 0 ? projectUsers.join(", ") : "No one"}
        </p>
      )}
      <section className="activity-list" aria-live="polite">
        {notifications.length === 0 ? (
          <p className="empty">No notifications yet.</p>
        ) : (
          notifications.map((notification) => (
            <article className="activity" key={notification.id}>
              <strong>{notification.type}</strong>
              <span>{notification.message}</span>
              <time dateTime={notification.createdAt}>
                {new Date(notification.createdAt).toLocaleString()}
              </time>
            </article>
          ))
        )}
      </section>
      <section className="activity-list" aria-live="polite">
        {activities.length === 0 ? (
          <p className="empty">Waiting for activity events...</p>
        ) : (
          activities.map((activity) => (
            <article className="activity" key={activity.id}>
              <strong>Task {activity.taskId}</strong>
              <span>
                {activity.oldStatus} -&gt; {activity.newStatus}
              </span>
              <time dateTime={activity.createdAt}>
                {new Date(activity.createdAt).toLocaleString()}
              </time>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
