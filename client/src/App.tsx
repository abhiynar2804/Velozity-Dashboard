import { useEffect, useState } from "react";
import { getAccessToken } from "./api/auth.api";
import {
  connectSocket,
  disconnectSocket,
  joinProjectRoom,
  leaveProjectRoom,
  socket,
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

export default function App() {
  const [projectId, setProjectId] = useState("");
  const [joinedProject, setJoinedProject] = useState("");
  const [connectionState, setConnectionState] = useState("Disconnected");
  const [activities, setActivities] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      setConnectionState("Sign in to connect");
      return;
    }

    const handleConnect = () => setConnectionState("Connected");
    const handleDisconnect = () => setConnectionState("Disconnected");
    const handleConnectError = () =>
      setConnectionState("Authentication failed");
    const handleActivity = (activity: ActivityEvent) => {
      setActivities((current) => [activity, ...current].slice(0, 20));
    };
    const handleJoined = ({
      projectId: nextProjectId,
    }: {
      projectId: string;
    }) => {
      setJoinedProject(nextProjectId);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("activity:created", handleActivity);
    socket.on("project:joined", handleJoined);
    connectSocket(accessToken);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("activity:created", handleActivity);
      socket.off("project:joined", handleJoined);
      disconnectSocket();
    };
  }, []);

  const handleJoin = () => {
    const nextProjectId = projectId.trim();
    if (nextProjectId) joinProjectRoom(nextProjectId);
  };

  const handleLeave = () => {
    if (!joinedProject) return;
    leaveProjectRoom(joinedProject);
    setJoinedProject("");
  };

  return (
    <main className="socket-monitor">
      <p className="eyebrow">VELOZITY / LIVE EVENTS</p>
      <h1>Project activity stream</h1>
      <p className="status">Socket status: {connectionState}</p>
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
